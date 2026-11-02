import type { ImapFlow } from "imapflow";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { EMAIL_FOLDERS, getEmailAccount, getEmailFolder, type EmailFolder } from "@/lib/email-accounts";
import { withInbox } from "@/lib/email-imap";

const PAGE_SIZE = 20;
const MAX_SEARCH_LENGTH = 200;

// STATUS est deconseille sur le dossier ouvert : celui-ci passe par SEARCH.
async function countUnread(client: ImapFlow, selected: EmailFolder) {
  const counts = {} as Record<EmailFolder, number>;
  for (const folder of EMAIL_FOLDERS) {
    if (folder === selected) {
      const unseen = await client.search({ seen: false }, { uid: true });
      counts[folder] = unseen ? unseen.length : 0;
    } else {
      const status = await client.status(folder, { unseen: true }).catch(() => false as const);
      counts[folder] = status ? status.unseen ?? 0 : 0;
    }
  }
  return counts;
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
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "", 10) || 1);
  // summary=1 : compteurs seuls, pour les badges des comptes non affiches.
  const summary = searchParams.get("summary") === "1";
  const search = (searchParams.get("search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  try {
    const result = await withInbox(account, { folder, readOnly: true }, async (client) => {
      const folders = await countUnread(client, folder);
      const emails = [];
      let total = client.mailbox ? client.mailbox.exists : 0;
      let range = "";

      if (search) {
        const matches = await client.search(
          { or: [{ from: search }, { to: search }, { subject: search }] },
          { uid: true }
        );
        const uids = (matches || []).sort((a, b) => b - a);
        total = uids.length;
        range = uids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).join(",");
      } else {
        // Les plus recents ont les numeros de sequence les plus hauts.
        const last = total - (page - 1) * PAGE_SIZE;
        range = last > 0 ? `${Math.max(1, last - PAGE_SIZE + 1)}:${last}` : "";
      }

      if (!summary && range) {
        const query = { uid: true, envelope: true, flags: true };
        for await (const message of client.fetch(range, query, { uid: Boolean(search) })) {
          emails.push({
            uid: message.uid,
            subject: message.envelope?.subject ?? "",
            from: message.envelope?.from?.[0] ?? null,
            to: message.envelope?.to?.[0] ?? null,
            date: message.envelope?.date ?? null,
            seen: message.flags?.has("\\Seen") ?? false,
          });
        }
        emails.sort((a, b) => b.uid - a.uid);
      }

      return { emails, folders, total, page, pageSize: PAGE_SIZE };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin emails list error:", error);
    if ((error as { mailboxMissing?: boolean }).mailboxMissing) {
      return NextResponse.json({ error: `Le dossier ${folder} n'existe pas sur cette boîte.` }, { status: 404 });
    }
    return NextResponse.json({ error: `Connexion à la boîte ${account.email} impossible.` }, { status: 502 });
  }
}
