import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getEmailAccount, getEmailFolder, TRASH_FOLDER } from "@/lib/email-accounts";
import { withInbox } from "@/lib/email-imap";

// Deplace vers la corbeille : aucune suppression definitive depuis le back-office.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    account?: unknown;
    folder?: unknown;
    uid?: unknown;
  } | null;

  const account = getEmailAccount(payload?.account);
  if (!account) {
    return NextResponse.json({ error: "Compte email inconnu ou non configuré." }, { status: 400 });
  }
  const folder = getEmailFolder(payload?.folder);
  if (!folder) {
    return NextResponse.json({ error: "Dossier inconnu." }, { status: 400 });
  }
  const uid = payload?.uid;
  if (typeof uid !== "number" || !Number.isInteger(uid) || uid < 1) {
    return NextResponse.json({ error: "Identifiant de message invalide." }, { status: 400 });
  }

  try {
    const moved = await withInbox(account, { folder, readOnly: false }, (client) =>
      client.messageMove(String(uid), TRASH_FOLDER, { uid: true })
    );
    if (!moved) throw new Error(`Deplacement vers ${TRASH_FOLDER} refuse`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin email delete error:", error);
    return NextResponse.json({ error: "La suppression du message a échoué." }, { status: 502 });
  }
}
