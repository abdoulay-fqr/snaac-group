import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getEmailAccount } from "@/lib/email-accounts";
import { withInbox } from "@/lib/email-imap";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const account = getEmailAccount(searchParams.get("account"));
  if (!account) {
    return NextResponse.json({ error: "Compte email inconnu ou non configuré." }, { status: 400 });
  }
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "", 10) || 1);
  // summary=1 : compteurs seuls, pour les badges des comptes non affiches.
  const summary = searchParams.get("summary") === "1";

  try {
    const result = await withInbox(account, { readOnly: true }, async (client) => {
      const total = client.mailbox ? client.mailbox.exists : 0;
      const unseen = await client.search({ seen: false });
      const emails = [];

      // Les plus recents ont les numeros de sequence les plus hauts.
      const last = total - (page - 1) * PAGE_SIZE;
      if (!summary && last > 0) {
        const range = `${Math.max(1, last - PAGE_SIZE + 1)}:${last}`;
        for await (const message of client.fetch(range, { uid: true, envelope: true, flags: true })) {
          const sender = message.envelope?.from?.[0];
          emails.push({
            uid: message.uid,
            subject: message.envelope?.subject ?? "",
            from: sender?.name || sender?.address || "",
            date: message.envelope?.date ?? null,
            seen: message.flags?.has("\\Seen") ?? false,
          });
        }
        emails.reverse();
      }

      return { emails, unread: unseen ? unseen.length : 0, total, page, pageSize: PAGE_SIZE };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin emails list error:", error);
    return NextResponse.json({ error: `Connexion à la boîte ${account.email} impossible.` }, { status: 502 });
  }
}
