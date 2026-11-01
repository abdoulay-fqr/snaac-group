import { NextResponse } from "next/server";
import { getLandingContent, saveLandingContent } from "@/lib/content";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  const content = await getLandingContent();
  return NextResponse.json(content);
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const saved = await saveLandingContent(body);
  return NextResponse.json(saved);
}
