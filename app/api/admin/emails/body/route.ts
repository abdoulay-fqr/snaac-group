import type { ImapFlow, MessageStructureObject } from "imapflow";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getEmailAccount, getEmailFolder } from "@/lib/email-accounts";
import { withInbox } from "@/lib/email-imap";

// Reste sous la limite de reponse de Vercel (4,5 Mo).
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function findPart(node: MessageStructureObject, type: string): MessageStructureObject | undefined {
  if (node.disposition === "attachment") return undefined;
  if (node.type === type) return node;
  if (!node.type?.startsWith("multipart/")) return undefined;
  for (const child of node.childNodes ?? []) {
    const part = findPart(child, type);
    if (part) return part;
  }
  return undefined;
}

async function readPart(client: ImapFlow, uid: string, node: MessageStructureObject | undefined) {
  if (!node) return null;
  // Un message sans multipart n'a pas de numero de partie : son corps est la partie 1.
  const { content } = await client.download(uid, node.part ?? "1", { uid: true, maxBytes: MAX_BODY_BYTES });
  if (!content) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of content) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const account = getEmailAccount(searchParams.get("account"));
  if (!account) {
    return NextResponse.json({ error: "Compte email inconnu ou non configuré." }, { status: 400 });
  }
  const folder = getEmailFolder(searchParams.get("folder"));
  if (!folder) {
    return NextResponse.json({ error: "Dossier inconnu." }, { status: 400 });
  }
  const uid = searchParams.get("uid") ?? "";
  if (!/^[1-9]\d*$/.test(uid)) {
    return NextResponse.json({ error: "Identifiant de message invalide." }, { status: 400 });
  }

  try {
    const email = await withInbox(account, { folder, readOnly: false }, async (client) => {
      const message = await client.fetchOne(uid, { uid: true, envelope: true, bodyStructure: true }, { uid: true });
      if (!message || !message.bodyStructure) return null;

      const html = await readPart(client, uid, findPart(message.bodyStructure, "text/html"));
      const text = html === null ? await readPart(client, uid, findPart(message.bodyStructure, "text/plain")) : null;
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });

      const { envelope } = message;
      return {
        subject: envelope?.subject ?? "",
        from: envelope?.from?.[0] ?? null,
        replyTo: envelope?.replyTo?.[0] ?? null,
        to: envelope?.to ?? [],
        cc: envelope?.cc ?? [],
        date: envelope?.date ?? null,
        messageId: envelope?.messageId ?? null,
        html,
        text,
      };
    });

    if (!email) {
      return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    }
    return NextResponse.json(email);
  } catch (error) {
    console.error("Admin email body error:", error);
    return NextResponse.json({ error: "Le chargement du message a échoué." }, { status: 502 });
  }
}
