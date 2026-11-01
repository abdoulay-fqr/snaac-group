import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagnostics } from "@/lib/db/schema";

export async function GET() {
  // Le middleware ne verifie que la presence du cookie, pas sa signature.
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const rows = await db.select().from(diagnostics).orderBy(desc(diagnostics.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Admin diagnostics list error:", error);
    return NextResponse.json({ error: "Lecture des diagnostics impossible." }, { status: 500 });
  }
}
