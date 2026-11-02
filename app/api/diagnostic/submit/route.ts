import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { diagnostics } from "@/lib/db/schema";

type Payload = Record<string, unknown>;

const DEFAULT_NOTIFICATION_EMAIL = "contact@snaac-group.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CASH_CARRY_PROVIDERS = 6;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function isRecord(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  return typeof value === "number" ? String(value) : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, MAX_CASH_CARRY_PROVIDERS) : [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
}

function toInteger(value: unknown): number | null {
  const number = toNumber(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function formatEuros(value: unknown): string {
  const amount = toNumber(value);
  return Number.isFinite(amount) ? euros.format(amount) : "—";
}

function formatMastery(value: unknown): string {
  const mastery = toNumber(value);
  return Number.isFinite(mastery) ? `${Math.round(mastery)} %` : "—";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRows(rows: [string, string][]): string {
  return rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#4b5a6e;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(value || "—")}</td></tr>`
    )
    .join("");
}

function renderItems(items: unknown[]): string {
  const cell = "padding:8px;border:1px solid #cbd5e1;";
  const rows = items
    .filter(isRecord)
    .map(
      (item) =>
        `<tr><td style="${cell}">${escapeHtml(text(item.post) || "—")}</td><td style="${cell}text-align:right;">${escapeHtml(formatEuros(item.annual))}</td><td style="${cell}text-align:right;">${escapeHtml(formatMastery(item.mastery))}</td><td style="${cell}text-align:right;">${escapeHtml(formatEuros(item.savings))}</td></tr>`
    )
    .join("");

  if (!rows) return "<p>Aucun poste analysé.</p>";

  return `<table style="border-collapse:collapse;width:100%;font-size:14px;">
    <thead><tr style="background:#f0f4f8;">
      <th style="${cell}text-align:left;">Poste</th>
      <th style="${cell}text-align:right;">Dépense annuelle</th>
      <th style="${cell}text-align:right;">Maîtrise</th>
      <th style="${cell}text-align:right;">Économie estimée</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderEmail(payload: Payload, analysis: Payload, contact: Payload, diagnosticId: string): string {
  const savings = isRecord(analysis.savings) ? analysis.savings : {};
  const items = Array.isArray(analysis.items) ? analysis.items : [];
  const score = toNumber(analysis.score);
  const heading = 'style="color:#ff6b35;font-size:16px;margin:24px 0 8px;"';

  return `<div style="font-family:Arial,sans-serif;color:#1a2535;max-width:640px;">
    <h1 style="font-size:20px;">Nouveau diagnostic SNAAC</h1>
    <h2 ${heading}>Entreprise</h2>
    <table style="font-size:14px;">${renderRows([
      ["Nom", text(payload.company)],
      ["Activité", text(payload.activity)],
      ["Département", text(payload.department)],
      ["Ville", text(payload.city)],
      ["Chiffre d'affaires", formatEuros(payload.ca)],
    ])}</table>
    <h2 ${heading}>Contact</h2>
    <table style="font-size:14px;">${renderRows([
      ["Prénom", text(contact.firstName)],
      ["Nom", text(contact.lastName)],
      ["Email", text(contact.email)],
      ["Téléphone", text(contact.phone)],
      ["Souhaite être rappelé", contact.callbackWanted === true ? "Oui" : "Non"],
      ["A connu SNAAC par", text(payload.howFound)],
    ])}</table>
    <h2 ${heading}>Situation fournisseur</h2>
    <table style="font-size:14px;">${renderRows([
      ["Fournisseurs principaux", text(payload.suppliers)],
      ["Compare les prix", text(payload.compare)],
      ["Renégocie ses contrats", text(payload.negotiate)],
      ["Satisfait de ses tarifs", text(payload.satisfaction)],
      ["Cash & Carry", [...textList(payload.cashCarriers), text(payload.cashOther)].filter(Boolean).join(", ")],
      ["Dépenses Cash & Carry", `${formatEuros(payload.cashMonthly)} / mois`],
    ])}</table>
    <h2 ${heading}>Score SNAAC</h2>
    <p style="font-size:14px;margin:0;"><strong>${Number.isFinite(score) ? `${score} / 100` : "—"}</strong> ${escapeHtml(text(analysis.label))}</p>
    <h2 ${heading}>Économies annuelles estimées</h2>
    <table style="font-size:14px;">${renderRows([
      ["Prudente", formatEuros(savings.low)],
      ["Médiane", formatEuros(savings.mid)],
      ["Haute", formatEuros(savings.high)],
    ])}</table>
    <h2 ${heading}>Postes analysés</h2>
    ${renderItems(items)}
    <p style="font-size:12px;color:#6b7a8f;margin-top:24px;">Méthode : ${escapeHtml(text(analysis.methodVersion) || "—")} · Référence : ${escapeHtml(diagnosticId)}</p>
  </div>`;
}

// Un echec d'ecriture en base ne doit pas faire echouer la demande du prospect.
// Le diagnostic est enregistre a l'affichage des resultats ; une demande de rappel
// arrive ensuite avec le meme id et ne change que callback_wanted.
async function saveDiagnostic(payload: Payload, analysis: Payload, contact: Payload, id: string) {
  const savings = isRecord(analysis.savings) ? analysis.savings : {};
  const cashExpenses = toNumber(payload.cashMonthly);

  try {
    await db.insert(diagnostics).values({
      id,
      company: text(payload.company),
      activity: text(payload.activity),
      department: text(payload.department),
      city: text(payload.city),
      ca: toInteger(payload.ca) ?? 0,
      score: toInteger(analysis.score),
      label: text(analysis.label) || null,
      methodVersion: text(analysis.methodVersion),
      savingsLow: toInteger(savings.low) ?? 0,
      savingsMid: toInteger(savings.mid) ?? 0,
      savingsHigh: toInteger(savings.high) ?? 0,
      items: JSON.stringify(Array.isArray(analysis.items) ? analysis.items : []),
      firstName: text(contact.firstName),
      lastName: text(contact.lastName),
      email: text(contact.email),
      phone: text(contact.phone),
      callbackWanted: contact.callbackWanted === true,
      cashCarryProviders: textList(payload.cashCarriers),
      cashCarryExpenses: Number.isFinite(cashExpenses) && cashExpenses >= 0 ? String(cashExpenses) : null,
      howFound: text(payload.howFound) || null,
      rawPayload: JSON.stringify(payload),
    }).onConflictDoUpdate({
      target: diagnostics.id,
      set: { callbackWanted: sql`${diagnostics.callbackWanted} or excluded.callback_wanted` },
    });
  } catch (error) {
    console.error("Diagnostic DB insert error:", error);
  }
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) throw new Error("Payload invalide");
    payload = body;
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  if (payload.website) {
    return NextResponse.json({ ok: false, error: "Requête rejetée." }, { status: 400 });
  }

  // Le formulaire /diagnostic envoie le contact a plat et le resultat dans `analysis`.
  const contact = isRecord(payload.contact) ? payload.contact : payload;
  const analysis = isRecord(payload.analysis) ? payload.analysis : payload;
  const submittedId = text(payload.diagnosticId);
  const diagnosticId = UUID_PATTERN.test(submittedId) ? submittedId : randomUUID();
  const email = text(contact.email);

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ ok: false, error: "Adresse email invalide." }, { status: 400 });
  }

  // Avant l'envoi : une panne SMTP ne doit pas faire perdre le diagnostic.
  await saveDiagnostic(payload, analysis, contact, diagnosticId);

  const { SNAAC_SMTP_HOST, SNAAC_SMTP_PORT, SNAAC_SMTP_USER, SNAAC_SMTP_PASS } = process.env;

  if (!SNAAC_SMTP_HOST || !SNAAC_SMTP_PORT || !SNAAC_SMTP_USER || !SNAAC_SMTP_PASS) {
    console.log("Diagnostic SNAAC (SMTP non configuré) :", JSON.stringify({ ...payload, diagnosticId }));
    return NextResponse.json({ ok: true, stored: "console" });
  }

  try {
    const port = Number(SNAAC_SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: SNAAC_SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SNAAC_SMTP_USER, pass: SNAAC_SMTP_PASS },
    });

    await transporter.sendMail({
      from: SNAAC_SMTP_USER,
      to: process.env.SNAAC_NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL,
      replyTo: email,
      subject: `${contact.callbackWanted === true ? "Demande de rappel" : "Diagnostic"} SNAAC - ${text(payload.company) || "Entreprise non renseignée"}`,
      html: renderEmail(payload, analysis, contact, diagnosticId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Diagnostic submit error:", error);
    return NextResponse.json(
      { ok: false, error: "L'envoi du diagnostic a échoué." },
      { status: 500 }
    );
  }
}
