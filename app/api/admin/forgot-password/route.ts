import crypto from "crypto";
import { isNull } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { hashResetToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { SMTP_HOST, SMTP_PORT } from "@/lib/email-accounts";

const TOKEN_LIFETIME_MS = 15 * 60 * 1000;
const DEFAULT_APP_URL = "https://snaac-group.com";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function renderEmail(link: string) {
  return `<div style="font-family:Arial,sans-serif;color:#1a2535;max-width:560px;">
    <h1 style="font-size:20px;">Réinitialisation de votre mot de passe</h1>
    <p style="font-size:14px;line-height:1.5;">Une réinitialisation du mot de passe du back-office SNAAC a été demandée. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
    <p style="margin:24px 0;"><a href="${link}" style="background:#ff6b35;color:#ffffff;padding:12px 20px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;">Réinitialiser le mot de passe</a></p>
    <p style="font-size:14px;line-height:1.5;">Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois.</p>
    <p style="font-size:12px;color:#6b7a8f;word-break:break-all;">Si le bouton ne fonctionne pas, copiez ce lien : ${link}</p>
    <p style="font-size:12px;color:#6b7a8f;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
  </div>`;
}

async function sendResetLink(recipient: string) {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    await db.delete(passwordResetTokens).where(isNull(passwordResetTokens.usedAt));
    await db.insert(passwordResetTokens).values({
      token: hashResetToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
    const link = `${appUrl}/admin/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: process.env.SNAAC_SMTP_USER, pass: process.env.SNAAC_SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SNAAC_SMTP_USER,
      to: recipient,
      subject: "Réinitialisation de votre mot de passe SNAAC",
      html: renderEmail(link),
      text: `Réinitialisez votre mot de passe SNAAC avec ce lien, valable 15 minutes : ${link}`,
    });
  } catch (error) {
    console.error("Admin password recovery error:", error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  // filter(Boolean) : une virgule en trop ne doit pas faire accepter un email vide.
  const recoveryEmails = process.env.ADMIN_RECOVERY_EMAIL?.split(",").map(normalizeEmail).filter(Boolean) ?? [];
  const recoveryEmail = recoveryEmails.find((email) => email === normalizeEmail(body?.email));

  // L'envoi part apres la reponse : son temps de reponse ne revele pas si l'email est le bon.
  if (recoveryEmail) {
    after(() => sendResetLink(recoveryEmail));
  }

  return NextResponse.json({ success: true });
}
