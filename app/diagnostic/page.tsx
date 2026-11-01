"use client";

import { useState } from "react";
import Link from "next/link";
// Import de type uniquement : les coefficients de la methodologie restent cote serveur.
import type { SNAAC_METHODOLOGY } from "@/lib/snaac-methodology";

type PostName = keyof typeof SNAAC_METHODOLOGY.posts;

type AnalysisItem = {
  post: string;
  annual: number;
  ratio: number;
  mastery: number | null;
  savings: number;
};

type Analysis = {
  ok: true;
  methodVersion: string;
  score: number | null;
  label: string;
  scoreClass: string;
  interpretation: string;
  items: AnalysisItem[];
  savings: { annual: number; low: number; mid: number; high: number };
};

type AnalysisStatus = "idle" | "loading" | "success" | "error";
type CallbackStatus = "idle" | "sending" | "success" | "error";

const STEPS = [
  "Entreprise",
  "Charges générales",
  "Achats",
  "Postes à analyser",
  "Contact",
  "Résultats",
];

const ACTIVITIES = [
  "Kebab",
  "Tacos",
  "Burger",
  "Pizzeria",
  "Boucherie",
  "Boulangerie",
  "Hôtellerie",
  "Autre TPE/PME",
];

const POSTS: PostName[] = [
  "Achats alimentaires",
  "Boissons",
  "Énergie",
  "Télécom",
  "Internet",
  "Assurance",
  "Fournitures",
  "Véhicules",
  "Mutuelle / prévoyance",
  "RH / services externalisés",
  "Emballages",
];

const DEPARTMENTS = [
  "01 - Ain",
  "02 - Aisne",
  "03 - Allier",
  "04 - Alpes-de-Haute-Provence",
  "05 - Hautes-Alpes",
  "06 - Alpes-Maritimes",
  "07 - Ardèche",
  "08 - Ardennes",
  "09 - Ariège",
  "10 - Aube",
  "11 - Aude",
  "12 - Aveyron",
  "13 - Bouches-du-Rhône",
  "14 - Calvados",
  "15 - Cantal",
  "16 - Charente",
  "17 - Charente-Maritime",
  "18 - Cher",
  "19 - Corrèze",
  "2A - Corse-du-Sud",
  "2B - Haute-Corse",
  "21 - Côte-d'Or",
  "22 - Côtes-d'Armor",
  "23 - Creuse",
  "24 - Dordogne",
  "25 - Doubs",
  "26 - Drôme",
  "27 - Eure",
  "28 - Eure-et-Loir",
  "29 - Finistère",
  "30 - Gard",
  "31 - Haute-Garonne",
  "32 - Gers",
  "33 - Gironde",
  "34 - Hérault",
  "35 - Ille-et-Vilaine",
  "36 - Indre",
  "37 - Indre-et-Loire",
  "38 - Isère",
  "39 - Jura",
  "40 - Landes",
  "41 - Loir-et-Cher",
  "42 - Loire",
  "43 - Haute-Loire",
  "44 - Loire-Atlantique",
  "45 - Loiret",
  "46 - Lot",
  "47 - Lot-et-Garonne",
  "48 - Lozère",
  "49 - Maine-et-Loire",
  "50 - Manche",
  "51 - Marne",
  "52 - Haute-Marne",
  "53 - Mayenne",
  "54 - Meurthe-et-Moselle",
  "55 - Meuse",
  "56 - Morbihan",
  "57 - Moselle",
  "58 - Nièvre",
  "59 - Nord",
  "60 - Oise",
  "61 - Orne",
  "62 - Pas-de-Calais",
  "63 - Puy-de-Dôme",
  "64 - Pyrénées-Atlantiques",
  "65 - Hautes-Pyrénées",
  "66 - Pyrénées-Orientales",
  "67 - Bas-Rhin",
  "68 - Haut-Rhin",
  "69 - Rhône",
  "70 - Haute-Saône",
  "71 - Saône-et-Loire",
  "72 - Sarthe",
  "73 - Savoie",
  "74 - Haute-Savoie",
  "75 - Paris",
  "76 - Seine-Maritime",
  "77 - Seine-et-Marne",
  "78 - Yvelines",
  "79 - Deux-Sèvres",
  "80 - Somme",
  "81 - Tarn",
  "82 - Tarn-et-Garonne",
  "83 - Var",
  "84 - Vaucluse",
  "85 - Vendée",
  "86 - Vienne",
  "87 - Haute-Vienne",
  "88 - Vosges",
  "89 - Yonne",
  "90 - Territoire de Belfort",
  "91 - Essonne",
  "92 - Hauts-de-Seine",
  "93 - Seine-Saint-Denis",
  "94 - Val-de-Marne",
  "95 - Val-d'Oise",
  "971 - Guadeloupe",
  "972 - Martinique",
  "973 - Guyane",
  "974 - La Réunion",
  "976 - Mayotte",
];

const GENERAL_CHARGES = [
  { name: "energy", label: "Énergie" },
  { name: "telecom", label: "Télécom" },
  { name: "internet", label: "Internet" },
  { name: "insurance", label: "Assurance" },
  { name: "supplies", label: "Fournitures" },
  { name: "vehicles", label: "Véhicules" },
  { name: "mutuelle", label: "Mutuelle / prévoyance" },
  { name: "rh", label: "RH / services externalisés" },
] as const;

const PURCHASES = [
  { name: "food", label: "Achats alimentaires" },
  { name: "drinks", label: "Boissons" },
  { name: "pack", label: "Emballages" },
] as const;

const SCORE_COLORS: Record<string, string> = {
  high: "#16a34a",
  good: "#ca8a04",
  medium: "#ea580c",
  low: "#dc2626",
  unknown: "var(--text-muted)",
};

const INITIAL_FORM = {
  company: "",
  activity: "",
  department: "",
  city: "",
  ca: "",
  energy: "",
  telecom: "",
  internet: "",
  insurance: "",
  supplies: "",
  vehicles: "",
  mutuelle: "",
  rh: "",
  food: "",
  drinks: "",
  pack: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  website: "",
};

type TextField = keyof typeof INITIAL_FORM;

const inputClass = "w-full px-4 py-3 rounded text-sm border outline-none transition-colors duration-300";
const inputStyle = {
  backgroundColor: "var(--input-bg)",
  borderColor: "var(--input-border)",
  color: "var(--input-color)",
};
const primaryButtonClass = "bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer disabled:opacity-50";
const secondaryButtonClass = "px-6 py-3 rounded font-semibold text-sm border transition-colors duration-300 cursor-pointer hover:border-brand hover:text-brand";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default function DiagnosticPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [target, setTarget] = useState<PostName[]>([]);
  const [targetAll, setTargetAll] = useState(false);
  const [callbackWanted, setCallbackWanted] = useState(false);
  const [targetError, setTargetError] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    window.scrollTo({ top: 0 });
  };

  const togglePost = (post: PostName) => {
    setTargetError(false);
    setTarget((current) =>
      current.includes(post)
        ? current.filter((name) => name !== post)
        : [...current, post]
    );
  };

  const runAnalysis = async () => {
    setAnalysisStatus("loading");
    setCallbackStatus("idle");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, target, targetAll, callbackWanted }),
      });
      if (!response.ok) throw new Error(`Analyse en erreur (${response.status})`);
      setAnalysis((await response.json()) as Analysis);
      setAnalysisStatus("success");
    } catch (error) {
      console.error("Diagnostic analyze error:", error);
      setAnalysisStatus("error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3 && !targetAll && target.length === 0) {
      setTargetError(true);
      return;
    }
    goToStep(step + 1);
    if (step === 4) runAnalysis();
  };

  const requestCallback = async () => {
    setCallbackStatus("sending");
    try {
      const response = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          target,
          targetAll,
          callbackWanted: true,
          analysis,
        }),
      });
      if (!response.ok) throw new Error(`Envoi en erreur (${response.status})`);
      setCallbackStatus("success");
    } catch (error) {
      console.error("Diagnostic submit error:", error);
      setCallbackStatus("error");
    }
  };

  const renderTextField = (
    name: TextField,
    label: string,
    type: string = "text",
    autoComplete?: string
  ) => (
    <Field label={label} htmlFor={name} required>
      <input
        id={name}
        type={type}
        name={name}
        required
        autoComplete={autoComplete}
        value={formData[name]}
        onChange={handleChange}
        className={inputClass}
        style={inputStyle}
      />
    </Field>
  );

  const renderAmountField = (name: TextField, label: string) => (
    <Field key={name} label={`${label} (€ / mois)`} htmlFor={name}>
      <input
        id={name}
        type="number"
        name={name}
        min="0"
        step="any"
        inputMode="decimal"
        placeholder="0"
        value={formData[name]}
        onChange={handleChange}
        className={inputClass}
        style={inputStyle}
      />
    </Field>
  );

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <Link href="/" className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors">
          ← Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mt-6 mb-3 leading-tight">
          <span style={{ color: "var(--text-primary)" }}>Diagnostic </span>
          <span className="text-brand">gratuit</span>
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
          Évaluez la maîtrise de vos charges et estimez vos économies potentielles.
        </p>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span style={{ color: "var(--text-primary)" }}>{STEPS[step]}</span>
            <span style={{ color: "var(--text-secondary)" }}>
              Étape {step + 1} sur {STEPS.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progression du diagnostic"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border-color)" }}
          >
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div
          className="rounded-2xl p-6 md:p-10 shadow-sm"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          {step < 5 ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Honeypot */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Site web</label>
                <input
                  id="website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>

              {step === 0 && (
                <>
                  <StepTitle>Informations sur votre entreprise</StepTitle>
                  {renderTextField("company", "Nom de l'entreprise", "text", "organization")}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Activité" htmlFor="activity" required>
                      <select id="activity" name="activity" required value={formData.activity} onChange={handleChange} className={inputClass} style={inputStyle}>
                        <option value="">Sélectionnez une activité</option>
                        {ACTIVITIES.map((activity) => (
                          <option key={activity} value={activity}>{activity}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Département" htmlFor="department" required>
                      <select id="department" name="department" required value={formData.department} onChange={handleChange} className={inputClass} style={inputStyle}>
                        <option value="">Sélectionnez un département</option>
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {renderTextField("city", "Ville", "text", "address-level2")}
                  <Field label="Chiffre d'affaires annuel (€)" htmlFor="ca" required>
                    <input
                      id="ca"
                      type="number"
                      name="ca"
                      required
                      min="1"
                      step="any"
                      inputMode="decimal"
                      value={formData.ca}
                      onChange={handleChange}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <StepTitle>Vos charges générales mensuelles</StepTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {GENERAL_CHARGES.map(({ name, label }) => renderAmountField(name, label))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <StepTitle>Vos achats et la restauration</StepTitle>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Laissez à 0 si non concerné.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {PURCHASES.map(({ name, label }) => renderAmountField(name, label))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <StepTitle>Les postes à analyser</StepTitle>
                  <label className="flex items-center gap-3 text-sm font-semibold cursor-pointer" style={{ color: "var(--text-primary)" }}>
                    <input
                      type="checkbox"
                      checked={targetAll}
                      onChange={(e) => {
                        setTargetError(false);
                        setTargetAll(e.target.checked);
                      }}
                      className="w-4 h-4 accent-[var(--color-brand)]"
                    />
                    Tous les postes
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {POSTS.map((post) => (
                      <label
                        key={post}
                        className={`flex items-center gap-3 text-sm ${targetAll ? "opacity-60" : "cursor-pointer"}`}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <input
                          type="checkbox"
                          checked={targetAll || target.includes(post)}
                          disabled={targetAll}
                          onChange={() => togglePost(post)}
                          className="w-4 h-4 accent-[var(--color-brand)]"
                        />
                        {post}
                      </label>
                    ))}
                  </div>
                  {targetError && (
                    <p role="alert" className="text-sm font-semibold text-red-600">
                      Sélectionnez au moins un poste à analyser.
                    </p>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <StepTitle>Vos coordonnées</StepTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderTextField("firstName", "Prénom", "text", "given-name")}
                    {renderTextField("lastName", "Nom", "text", "family-name")}
                    {renderTextField("email", "Email", "email", "email")}
                    {renderTextField("phone", "Téléphone", "tel", "tel")}
                  </div>
                  <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={callbackWanted}
                      onChange={(e) => setCallbackWanted(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-brand)]"
                    />
                    Je souhaite être rappelé par SNAAC
                  </label>
                </>
              )}

              <div className="flex justify-between gap-4 mt-3">
                {step > 0 ? (
                  <button type="button" onClick={() => goToStep(step - 1)} className={secondaryButtonClass} style={{ borderColor: "var(--border-color)" }}>
                    Précédent
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit" className={primaryButtonClass}>
                  {step === 4 ? "Voir mes résultats" : "Suivant"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-8">
              {analysisStatus === "loading" && (
                <p role="status" className="text-center text-sm py-10" style={{ color: "var(--text-secondary)" }}>
                  Analyse de vos données en cours...
                </p>
              )}

              {analysisStatus === "error" && (
                <div role="alert" className="text-center py-6">
                  <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                    Une erreur est survenue pendant l&apos;analyse. Veuillez réessayer.
                  </p>
                  <button type="button" onClick={runAnalysis} className={primaryButtonClass}>
                    Réessayer
                  </button>
                </div>
              )}

              {analysisStatus === "success" && analysis && (
                <>
                  <div className="text-center">
                    <p
                      className="text-7xl font-bold leading-none mb-3"
                      style={{ color: SCORE_COLORS[analysis.scoreClass] }}
                    >
                      {analysis.score ?? "—"}
                      {analysis.score !== null && <span className="text-2xl"> / 100</span>}
                    </p>
                    <p className="text-lg font-semibold" style={{ color: SCORE_COLORS[analysis.scoreClass] }}>
                      {analysis.label}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                      Économies annuelles estimées
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Saving label="Prudente" amount={analysis.savings.low} />
                      <Saving label="Médiane" amount={analysis.savings.mid} highlighted />
                      <Saving label="Haute" amount={analysis.savings.high} />
                    </div>
                  </div>

                  {analysis.items.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                        Détail par poste
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                              <th scope="col" className="py-2 pr-4 font-semibold">Poste</th>
                              <th scope="col" className="py-2 pr-4 font-semibold text-right whitespace-nowrap">Dépense / an</th>
                              <th scope="col" className="py-2 pr-4 font-semibold text-right whitespace-nowrap">% du CA</th>
                              <th scope="col" className="py-2 pr-4 font-semibold text-right">Maîtrise</th>
                              <th scope="col" className="py-2 font-semibold text-right whitespace-nowrap">Économie / an</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.items.map((item) => (
                              <tr key={item.post} style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}>
                                <td className="py-2 pr-4">{item.post}</td>
                                <td className="py-2 pr-4 text-right whitespace-nowrap">{euros.format(item.annual)}</td>
                                <td className="py-2 pr-4 text-right">{percent.format(item.ratio)}</td>
                                <td className="py-2 pr-4 text-right whitespace-nowrap">
                                  {item.mastery === null ? "—" : `${Math.round(item.mastery)} / 100`}
                                </td>
                                <td className="py-2 text-right whitespace-nowrap">{euros.format(item.savings)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                      Interprétation
                    </h2>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {analysis.interpretation}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-between gap-4">
                    <button type="button" onClick={() => goToStep(4)} className={secondaryButtonClass} style={{ borderColor: "var(--border-color)" }}>
                      Modifier mes réponses
                    </button>
                    {callbackStatus !== "success" && (
                      <button
                        type="button"
                        onClick={requestCallback}
                        disabled={callbackStatus === "sending"}
                        className={primaryButtonClass}
                      >
                        {callbackStatus === "sending" ? "Envoi en cours..." : "Être rappelé par SNAAC"}
                      </button>
                    )}
                  </div>

                  {callbackStatus === "success" && (
                    <p role="status" className="text-sm font-semibold text-green-600">
                      Merci, votre demande a bien été envoyée. Notre équipe vous rappellera dans les plus brefs délais.
                    </p>
                  )}
                  {callbackStatus === "error" && (
                    <p role="alert" className="text-sm font-semibold text-red-600">
                      L&apos;envoi a échoué. Veuillez réessayer ou nous écrire via le{" "}
                      <Link href="/#contact" className="underline">formulaire de contact</Link>.
                    </p>
                  )}

                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Méthode {analysis.methodVersion}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
      {children}
    </h2>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Saving({
  label,
  amount,
  highlighted = false,
}: {
  label: string;
  amount: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{
        backgroundColor: "var(--bg-card-alt)",
        border: `1px solid ${highlighted ? "var(--color-brand)" : "var(--border-color)"}`,
      }}
    >
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className={`text-2xl font-bold ${highlighted ? "text-brand" : ""}`} style={highlighted ? undefined : { color: "var(--text-primary)" }}>
        {euros.format(amount)}
      </p>
    </div>
  );
}
