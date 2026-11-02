import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashResetToken, saveAdminPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";

const MIN_PASSWORD_LENGTH = 12;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = body?.token;
  const password = body?.password;

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
      { status: 400 }
    );
  }
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }

  try {
    const now = new Date();
    // Verification et marquage en une requete : deux envois simultanes ne peuvent pas passer.
    const [claimed] = await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.token, hashResetToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .returning({ id: passwordResetTokens.id });

    if (!claimed) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
    }

    await saveAdminPassword(password);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return NextResponse.json(
      { error: "La réinitialisation a échoué. Demandez un nouveau lien." },
      { status: 500 }
    );
  }
}
