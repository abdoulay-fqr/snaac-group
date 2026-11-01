import { NextResponse } from "next/server";
import { isAdminAuthenticated, saveAdminPassword, verifyAdminPassword } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 12;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "Les deux mots de passe sont obligatoires." }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
      { status: 400 }
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit être différent de l'actuel." },
      { status: 400 }
    );
  }

  try {
    if (!(await verifyAdminPassword(currentPassword))) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }
    await saveAdminPassword(newPassword);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin password change error:", error);
    return NextResponse.json(
      { error: "Le changement de mot de passe a échoué." },
      { status: 500 }
    );
  }
}
