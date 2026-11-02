import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getEmailAccount,
  MAX_ATTACHMENT_BYTES,
  SENT_FOLDER,
  SMTP_HOST,
  SMTP_PORT,
  type EmailAccount,
} from "@/lib/email-accounts";
import { withInbox } from "@/lib/email-imap";

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const CONTENT_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;
const MESSAGE_ID_PATTERN = /^<[^\s<>]+>$/;

function parseRecipients(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const recipients = value.map((address) => (typeof address === "string" ? address.trim() : ""));
  return recipients.every((address) => EMAIL_PATTERN.test(address)) ? recipients : null;
}

// Seuls ces trois champs sont repris : `path` ou `href` feraient lire un fichier ou une URL au serveur.
function parseAttachments(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const attachments = [];
  for (const item of value as { filename?: unknown; content?: unknown; contentType?: unknown }[]) {
    const { filename, content, contentType } = item ?? {};
    if (typeof filename !== "string" || !filename.trim()) return null;
    if (typeof content !== "string" || !BASE64_PATTERN.test(content)) return null;
    attachments.push({
      filename: filename.replace(/[\r\n]+/g, " ").trim(),
      content: Buffer.from(content, "base64"),
      contentType: typeof contentType === "string" && CONTENT_TYPE_PATTERN.test(contentType) ? contentType : undefined,
    });
  }
  return attachments;
}

function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// SMTP ne depose rien dans "Envoyes" : le message envoye y est copie via IMAP.
async function saveToSent(account: EmailAccount, raw: Buffer) {
  try {
    await withInbox(account, { folder: SENT_FOLDER, readOnly: false }, (client) =>
      client.append(SENT_FOLDER, raw, ["\\Seen"])
    );
    return true;
  } catch (error) {
    console.error("Admin email sent-folder error:", error);
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    account?: unknown;
    to?: unknown;
    cc?: unknown;
    subject?: unknown;
    html?: unknown;
    attachments?: unknown;
    inReplyTo?: unknown;
  } | null;

  const account = getEmailAccount(payload?.account);
  if (!account) {
    return NextResponse.json({ error: "Compte email inconnu ou non configuré." }, { status: 400 });
  }

  const to = parseRecipients(payload?.to);
  const cc = parseRecipients(payload?.cc ?? []);
  if (!to || to.length === 0 || !cc) {
    return NextResponse.json({ error: "Adresse du destinataire invalide." }, { status: 400 });
  }

  const attachments = parseAttachments(payload?.attachments);
  if (!attachments) {
    return NextResponse.json({ error: "Pièces jointes invalides." }, { status: 400 });
  }
  if (attachments.reduce((total, { content }) => total + content.length, 0) > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "Les pièces jointes dépassent la taille autorisée." }, { status: 413 });
  }

  const subject = typeof payload?.subject === "string" ? payload.subject.trim() : "";
  const html = typeof payload?.html === "string" ? payload.html : "";
  const text = htmlToText(html);
  if (!subject || (!text && attachments.length === 0)) {
    return NextResponse.json({ error: "Le sujet et le message sont obligatoires." }, { status: 400 });
  }

  const inReplyTo = typeof payload?.inReplyTo === "string" && MESSAGE_ID_PATTERN.test(payload.inReplyTo)
    ? payload.inReplyTo
    : undefined;

  try {
    const raw = await new MailComposer({
      from: account.email,
      to,
      cc,
      subject,
      html,
      text,
      attachments,
      inReplyTo,
      references: inReplyTo,
    }).compile().build();

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: account.email, pass: account.pass },
    });
    await transporter.sendMail({ envelope: { from: account.email, to: [...to, ...cc] }, raw });

    return NextResponse.json({ success: true, savedToSent: await saveToSent(account, raw) });
  } catch (error) {
    console.error("Admin email send error:", error);
    return NextResponse.json({ error: "L'envoi du message a échoué." }, { status: 502 });
  }
}
