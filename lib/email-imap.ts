import "server-only";
import { ImapFlow } from "imapflow";
import { IMAP_HOST, IMAP_PORT, type EmailAccount } from "@/lib/email-accounts";

const CONNECTION_TIMEOUT_MS = 10_000;

// Serverless : une connexion par requete, toujours refermee avant de repondre.
export async function withInbox<T>(
  account: EmailAccount,
  options: { readOnly: boolean },
  task: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: account.email, pass: account.pass },
    logger: false,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
  });
  // Sans ecouteur, un evenement "error" ferait tomber le processus.
  client.on("error", (error) => console.error("IMAP connection error:", error));

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", options);
    try {
      return await task(client);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}
