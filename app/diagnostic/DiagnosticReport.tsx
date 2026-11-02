import Image from "next/image";

export type AnalysisItem = {
  post: string;
  annual: number;
  ratio: number;
  mastery: number | null;
  savings: number;
};

export type Analysis = {
  ok: true;
  diagnosticId: string;
  methodVersion: string;
  score: number | null;
  label: string;
  scoreClass: string;
  interpretation: string;
  items: AnalysisItem[];
  savings: { annual: number; low: number; mid: number; high: number };
};

type DiagnosticReportProps = {
  analysis: Analysis;
  activity: string;
  firstName: string;
  location: string;
  // Version A4 hors ecran pour l'export : largeur fixe, en-tete et pied de page.
  pdf?: boolean;
};

// Couleurs en hexadecimal uniquement : html2canvas ne sait pas lire les oklch de la palette Tailwind.
const SCORE_COLORS: Record<string, string> = {
  low: "#d62828",
  medium: "#ef7d17",
  good: "#8db02f",
  high: "#159a62",
};

const STEPS_TO_SAVINGS = [
  ["Analyse des achats :", "comparaison des prix, volumes, remises et conditions fournisseurs."],
  ["Analyse des contrats :", "comparaison d’offres à périmètre comparable pour les postes concernés."],
  ["Validation des économies :", "passage de l’estimation à une économie documentée à partir des justificatifs et offres réellement obtenues."],
];

const cardClass = "rounded-2xl border border-[#dce3eb] bg-white p-6";
const pillClass = "inline-block rounded-full bg-[#eaf3fb] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#1769aa]";
const titleClass = "text-xl font-bold text-[#102a43]";
const textClass = "text-[15px] leading-relaxed text-[#17212b]";
const mutedClass = "text-[15px] leading-relaxed text-[#65758b]";

export const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function Gauge({ score, gradientId }: { score: number | null; gradientId: string }) {
  const angle = -90 + (180 * Math.min(100, Math.max(0, score ?? 0))) / 100;
  return (
    <svg viewBox="0 0 220 130" width="100%" role="img" aria-label="Jauge de maîtrise des coûts">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d62828" />
          <stop offset="32%" stopColor="#ef7d17" />
          <stop offset="68%" stopColor="#f2c94c" />
          <stop offset="90%" stopColor="#159a62" />
          <stop offset="100%" stopColor="#159a62" />
        </linearGradient>
      </defs>
      <path d="M25 110 A85 85 0 0 1 195 110" fill="none" stroke={`url(#${gradientId})`} strokeWidth="18" strokeLinecap="round" />
      <line x1="110" y1="110" x2="110" y2="42" stroke="#102a43" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle} 110 110)`} />
      <circle cx="110" cy="110" r="6" fill="#102a43" />
    </svg>
  );
}

function ScoreDot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export default function DiagnosticReport({ analysis, activity, firstName, location, pdf = false }: DiagnosticReportProps) {
  const { score, label, savings } = analysis;
  const color = SCORE_COLORS[analysis.scoreClass] ?? "#65758b";
  const hasSavings = Math.round(savings.annual) > 0;
  const levers = analysis.items.filter((item) => item.savings > 0).sort((a, b) => b.savings - a.savings);
  const maxLever = Math.max(...levers.map((item) => item.savings), 1);

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {pdf && (
        <div data-pdf-block className="flex items-center gap-4 border-b border-[#dce3eb] pb-4">
          <Image src="/logo_snaac.png" alt="" width={52} height={52} unoptimized />
          <div>
            <p className="text-2xl font-bold text-[#102a43]">SNAAC Group</p>
            <p className="text-xs text-[#65758b]">Centrale d&apos;achats nouvelle génération pour TPE/PME</p>
          </div>
        </div>
      )}

      <section data-pdf-block className={cardClass}>
        <div className="text-center">
          <span className={pillClass}>Diagnostic économique SNAAC Group</span>
          <h1 className="mt-3 text-3xl font-bold text-[#102a43]">Votre diagnostic — {activity}</h1>
          <p className={`mt-1 ${mutedClass}`}>Analyse personnalisée pour {firstName} — {location}.</p>
        </div>

        <div className="mt-5 rounded-lg border-l-4 border-[#1769aa] bg-white py-2 pl-4 pr-2">
          <p className={textClass}>
            <strong>Une analyse adaptée à votre activité</strong>
            <br />
            Calculé selon la méthode d’analyse SNAAC, spécialement conçue pour analyser les coûts et pratiques d’achat des entreprises de votre activité : {activity}.
          </p>
        </div>

        <div className={`mt-5 ${cardClass}`}>
          <h2 className={titleClass}>Je me repère en un clin d’œil</h2>
          <p className={`mt-2 ${mutedClass}`}>
            Plus votre indice se rapproche de 100, plus votre niveau de maîtrise des coûts est favorable. Le vert correspond aux indices supérieurs ou égaux à 90.
          </p>
          <div className="mx-auto mt-3 max-w-[300px]">
            <Gauge score={score} gradientId={pdf ? "snaac-gauge-pdf" : "snaac-gauge"} />
          </div>
          <div className="text-center">
            <p className="text-5xl font-black leading-none text-[#102a43]">{score ?? "—"}/100</p>
            <p className={`mt-1 ${textClass}`}>Indice de maîtrise des coûts /100</p>
            <p className="mt-2 flex items-center justify-center gap-2 font-bold text-[#102a43]">
              <ScoreDot color={color} />
              {label}
            </p>
          </div>
        </div>
      </section>

      {hasSavings && (
        <section className={`${cardClass} text-center`}>
          <div data-pdf-block className="pb-2">
            <span className={pillClass}>Potentiel d’optimisation estimé</span>
            <p className="mt-3 text-4xl font-bold text-[#16a34a]">{euros.format(savings.mid)}</p>
            <p className="font-bold text-[#17212b]">par an</p>
          </div>
          <div data-pdf-block data-pdf-break>
            <p className="text-lg font-bold text-[#102a43]">{euros.format(savings.mid / 12)} / mois</p>
            <p className="mt-2 text-xs text-[#65758b]">
              Estimation réalisée à partir des informations communiquées. Le potentiel réel doit être confirmé par une analyse détaillée de vos dépenses et conditions d’achat.
            </p>
            <div className={`mt-5 grid gap-3 text-left ${pdf ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
              {[
                ["Prudent", savings.low],
                ["Réaliste", savings.mid],
                ["Potentiel identifié", savings.high],
              ].map(([name, amount]) => (
                <div key={name} className="rounded-xl border border-[#dce3eb] p-4">
                  <p className="font-bold text-[#17212b]">{name}</p>
                  <p className="mt-1 text-2xl font-black text-[#102a43]">{euros.format(Number(amount))}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {levers.length > 0 && (
        <section data-pdf-block className={cardClass}>
          <h2 className={titleClass}>Où se trouve votre potentiel ?</h2>
          <p className={`mt-1 ${mutedClass}`}>Les principaux leviers identifiés dans vos données déclarées.</p>
          <div className="mt-4 flex flex-col gap-4">
            {levers.map((item) => (
              <div key={item.post}>
                <div className="flex justify-between gap-3 text-sm font-bold text-[#17212b]">
                  <span>{item.post}</span>
                  <span className="whitespace-nowrap">{euros.format(item.savings)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#e9eef3]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.savings / maxLever) * 100}%`,
                      backgroundImage: "linear-gradient(90deg, #1677ff, #ef7d17)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section data-pdf-block className={cardClass}>
        <h2 className={titleClass}>Ce que signifie votre résultat</h2>
        <p className="mt-3 flex items-center gap-2 font-bold" style={{ color }}>
          <ScoreDot color={color} />
          {label}
        </p>
        <p className={`mt-2 ${textClass}`}>{analysis.interpretation}</p>
      </section>

      <section className={cardClass}>
        <div data-pdf-block className="flex flex-col gap-3">
          <h2 className={titleClass}>Comment SNAAC peut transformer cette estimation en économies concrètes</h2>
          <p className={textClass}>
            <strong>Postes analysés :</strong> {analysis.items.map((item) => item.post).join(" · ")}.
          </p>
          {STEPS_TO_SAVINGS.map(([name, description]) => (
            <p key={name} className={textClass}>
              ✓ <strong>{name}</strong> {description}
            </p>
          ))}
        </div>
        <div data-pdf-block data-pdf-break className="mt-5 rounded-lg border-l-4 border-[#159a62] bg-[#eef7f2] p-4">
          <p className={textClass}>
            <strong>Votre diagnostic est une première estimation.</strong>
            <br />
            Un conseiller SNAAC peut reprendre vos principaux postes, analyser vos factures et contrats et étudier les conditions réellement accessibles à votre entreprise.
          </p>
        </div>
      </section>

      {pdf && (
        <p data-pdf-block className="px-2 text-xs text-[#65758b]">
          SNAAC Group — Centrale d&apos;achats nouvelle génération pour TPE/PME. Diagnostic indicatif : les estimations présentées sont à confirmer par l’analyse des factures, contrats, volumes et conditions fournisseurs.
        </p>
      )}
    </div>
  );
}
