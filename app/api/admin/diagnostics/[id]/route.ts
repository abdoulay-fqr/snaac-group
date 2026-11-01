import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagnostics } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };
type DiagnosticUpdate = Partial<Pick<typeof diagnostics.$inferInsert, "status" | "notes">>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUpdate(body: unknown): DiagnosticUpdate | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const { status, notes } = body as Record<string, unknown>;
  const update: DiagnosticUpdate = {};

  if (status !== undefined) {
    if (status !== "pending" && status !== "treated") return null;
    update.status = status;
  }
  if (notes !== undefined) {
    if (typeof notes !== "string" && notes !== null) return null;
    update.notes = notes;
  }
  return Object.keys(update).length > 0 ? update : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  // Le middleware ne verifie que la presence du cookie, pas sa signature.
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const update = parseUpdate(await request.json().catch(() => null));
  if (!update) {
    return NextResponse.json({ error: "Mise a jour invalide." }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(diagnostics)
      .set(update)
      .where(eq(diagnostics.id, id))
      .returning();
    if (!row) {
      return NextResponse.json({ error: "Diagnostic introuvable." }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    console.error("Admin diagnostic update error:", error);
    return NextResponse.json({ error: "Mise a jour impossible." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    const [row] = await db
      .delete(diagnostics)
      .where(eq(diagnostics.id, id))
      .returning({ id: diagnostics.id });
    if (!row) {
      return NextResponse.json({ error: "Diagnostic introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin diagnostic delete error:", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
