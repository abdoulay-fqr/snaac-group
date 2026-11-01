import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth";

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

  const ok = await loginAdmin(body.username, body.password);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
