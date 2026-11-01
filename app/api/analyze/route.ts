import { NextResponse } from "next/server";
import { SNAAC_METHODOLOGY } from "@/lib/snaac-methodology";

type Payload = Record<string, unknown>;

// Equivalent de n() en PHP : (float) lit le debut numerique d'une chaine.
function n(value: unknown): number {
  let parsed = 0;
  if (typeof value === "number") parsed = value;
  else if (typeof value === "string") parsed = parseFloat(value);
  else if (typeof value === "boolean") parsed = value ? 1 : 0;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function describeScore(score: number | null) {
  if (score === null) {
    return {
      label: "Données insuffisantes",
      scoreClass: "unknown",
      interpretation:
        "Les informations fournies ne permettent pas de calculer un score. Renseignez votre chiffre d'affaires et au moins une dépense sur les postes sélectionnés.",
    };
  }
  if (score >= 90) {
    return {
      label: "🟢 Maîtrise élevée",
      scoreClass: "high",
      interpretation:
        "Vos charges sont globalement bien maîtrisées au regard des références SNAAC. Quelques ajustements ciblés peuvent rester possibles.",
    };
  }
  if (score >= 70) {
    return {
      label: "🟡 Potentiel d'optimisation encore présent",
      scoreClass: "good",
      interpretation:
        "Vos charges sont plutôt maîtrisées, mais certains postes dépassent les références SNAAC et peuvent encore être optimisés.",
    };
  }
  if (score >= 50) {
    return {
      label: "🟠 Potentiel d'optimisation identifié",
      scoreClass: "medium",
      interpretation:
        "Plusieurs postes se situent au-dessus des références SNAAC. Une renégociation ciblée permettrait de réduire vos charges.",
    };
  }
  return {
    label: "🔴 Potentiel d'optimisation significatif",
    scoreClass: "low",
    interpretation:
      "Une part importante de vos charges dépasse les références SNAAC. Une analyse détaillée de vos contrats et de vos achats est recommandée.",
  };
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("Payload invalide");
    }
    payload = body as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  if (payload.website) {
    return NextResponse.json({ ok: false, error: "Requête rejetée." }, { status: 400 });
  }

  const ca = n(payload.ca);
  const activity = typeof payload.activity === "string" ? payload.activity.trim() : "";
  const selected = Array.isArray(payload.target) ? payload.target : [];
  const all = Boolean(payload.targetAll);

  // hasOwn : une activite comme "constructor" ne doit pas resoudre via le prototype.
  const multipliers = SNAAC_METHODOLOGY.activityMultipliers;
  const mult = Object.hasOwn(multipliers, activity) ? multipliers[activity] : 1.0;

  const items = [];
  let weighted = 0;
  let weights = 0;
  let estimated = 0;

  for (const [name, rule] of Object.entries(SNAAC_METHODOLOGY.posts)) {
    if (!all && !selected.includes(name)) continue;

    const annual = n(payload[rule.field]) * 12;
    if (annual <= 0) continue;

    const ratio = ca > 0 ? annual / ca : 0;
    let gap = ca > 0 ? Math.max(0, annual - ca * rule.ref) : 0;
    gap = Math.min(gap, annual * 0.25);
    const econ = gap * rule.capture * mult;
    const mastery =
      ca > 0
        ? ratio <= rule.ref
          ? 100
          : Math.max(0, 100 - ((ratio - rule.ref) / rule.ref) * 100)
        : null;
    const weight = Math.max(1, (annual / Math.max(ca, 1)) * 100);

    if (mastery !== null) {
      weighted += mastery * weight;
      weights += weight;
    }
    estimated += econ;
    items.push({ post: name, annual, ratio, mastery, savings: econ });
  }

  const score = weights ? Math.round(weighted / weights) : null;
  const { low, mid, high } = SNAAC_METHODOLOGY.scenarios;

  return NextResponse.json({
    ok: true,
    methodVersion: SNAAC_METHODOLOGY.version,
    score,
    ...describeScore(score),
    items,
    savings: {
      annual: estimated,
      low: estimated * low,
      mid: estimated * mid,
      high: estimated * high,
    },
  });
}
