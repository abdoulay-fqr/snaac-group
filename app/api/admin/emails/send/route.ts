import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isAdminAuthenticated } from "@/lib/auth";
import { getEmailAccount, SMTP_HOST, SMTP_PORT } from "@/lib/email-accounts";

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    account?: unknown;
    to?: unknown;
    subject?: unknown;
    body?: unknown;
  } | null;

  const account = getEmailAccount(payload?.account);
  if (!account) {
    return NextResponse.json({ error: "Compte email inconnu ou non configuré." }, { status: 400 });
  }

  const { to, subject, body } = payload ?? {};
  if (typeof to !== "string" || typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
    return NextResponse.json({ error: "Destinataire, sujet et corps sont obligatoires." }, { status: 400 });
  }
  const recipients = to.split(/[,;]/).map((address) => address.trim()).filter(Boolean);
  if (recipients.length === 0 || !recipients.every((address) => EMAIL_PATTERN.test(address))) {
    return NextResponse.json({ error: "Adresse du destinataire invalide." }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: account.email, pass: account.pass },
    });

    await transporter.sendMail({ from: account.email, to: recipients, subject: subject.trim(), text: body });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin email send error:", error);
    return NextResponse.json({ error: "L'envoi du message a échoué." }, { status: 502 });
  }
}
