import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth";
import { clearLoginAttempts, registerLoginAttempt } from "@/lib/login-rate-limit";

// Vercel ecrase x-forwarded-for : le client ne peut pas y choisir son IP.
function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!body.username || !body.password) {
    return NextResponse.json(
      { error: "L'identifiant et le mot de passe sont obligatoires." },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = registerLoginAttempt(ip);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Trop de tentatives échouées. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const ok = await loginAdmin(body.username, body.password);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  clearLoginAttempts(ip);
  return NextResponse.json({ success: true });
}
