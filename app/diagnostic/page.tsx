"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
// Import de type uniquement : les coefficients de la methodologie restent cote serveur.
import type { SNAAC_METHODOLOGY } from "@/lib/snaac-methodology";
import { DEPARTMENTS } from "./departments";
import type { Analysis } from "./DiagnosticReport";
import DiagnosticResults, { type CallbackStatus } from "./DiagnosticResults";

type PostName = keyof typeof SNAAC_METHODOLOGY.posts;
type AnalysisStatus = "idle" | "loading" | "success" | "error";

const STEPS = [
  "Votre entreprise",
  "Vos principaux postes de charges",
  "Achats et restauration",
  "Votre situation fournisseur",
  "Les postes à analyser",
  "Votre personnel",
  "Pour recevoir votre diagnostic",
];
const RESULTS_STEP = STEPS.length;

const ACTIVITIES = [
  "Restauration rapide",
  "Restauration traditionnelle",
  "Boucherie",
  "Boulangerie",
  "Hôtellerie",
  "Autres",
];

// /api/analyze attend un chiffre d'affaires mensuel.
const CA_PERIODS = [
  { value: "Journalier", toMonthly: 30, placeholder: "Ex. 1 500" },
  { value: "Mensuel", toMonthly: 1, placeholder: "Ex. 40 000" },
  { value: "Annuel", toMonthly: 1 / 12, placeholder: "Ex. 480 000" },
] as const;

// Les libelles sont les noms de postes attendus par /api/analyze.
const GENERAL_CHARGES = [
  { name: "energy", label: "Énergie" },
  { name: "telecom", label: "Télécom" },
  { name: "internet", label: "Internet" },
  { name: "insurance", label: "Assurance" },
  { name: "supplies", label: "Fournitures (hors alimentaire)" },
  { name: "vehicles", label: "Véhicules" },
  { name: "mutuelle", label: "Mutuelle / prévoyance" },
  { name: "rh", label: "RH / Comptabilité / Services externalisés" },
] as const;

const PURCHASES = [
  { name: "food", label: "Achats alimentaires" },
  { name: "drinks", label: "Boissons" },
  { name: "pack", label: "Emballages" },
] as const;

const AMOUNT_FIELDS = [...PURCHASES, ...GENERAL_CHARGES];
const POSTS = AMOUNT_FIELDS.map(({ label }) => label as PostName);

const SUPPLIER_QUESTIONS = [
  { name: "compare", label: "Comparez-vous les prix régulièrement ?", options: ["Jamais", "Rarement", "Parfois", "Oui, systématiquement"] },
  { name: "negotiate", label: "Renégociez-vous vos contrats ?", options: ["Jamais", "Rarement", "À l'occasion", "Oui, au moins une fois par an"] },
  { name: "satisfaction", label: "Êtes-vous satisfait de vos tarifs actuels ?", options: ["Non", "Oui"] },
] as const;

const NO_CASH_CARRY = "Aucun";
const OTHER_CASH_CARRY = "Autre";
const CASH_CARRIES = ["METRO", "Promocash", "Transgourmet", OTHER_CASH_CARRY, NO_CASH_CARRY];

const OPCO_ANSWERS = ["Oui", "Non", "Je ne sais pas"];
const YES_NO = ["Oui", "Non"];

const HOW_FOUND_OPTIONS = [
  "Recherche internet",
  "Bouche à oreille",
  "Réseaux sociaux",
  "Recommandation d'un proche",
  "Autre",
];

const INITIAL_FORM = {
  company: "",
  activity: "",
  department: "",
  city: "",
  ca: "",
  caPeriod: "Mensuel",
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
  suppliers: "",
  compare: "Jamais",
  negotiate: "Jamais",
  satisfaction: "Non",
  cashOther: "",
  cashMonthly: "",
  employees: "",
  knowsOpco: "",
  trainingPlan: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  howFound: "",
  website: "",
};

type TextField = keyof typeof INITIAL_FORM;

const inputClass = "w-full px-3.5 py-3 rounded-lg border border-[#cbd5df] bg-white text-[15px] text-[#17212b] outline-none transition-colors duration-300 focus:border-brand";
const primaryButtonClass = "bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-lg font-bold text-[15px] transition-colors duration-300 cursor-pointer disabled:opacity-50";
const secondaryButtonClass = "bg-[#edf3f8] hover:bg-[#dfe8f0] text-[#102a43] px-6 py-3 rounded-lg font-bold text-[15px] transition-colors duration-300 cursor-pointer";
const checkClass = "flex items-center gap-2.5 rounded-lg border border-[#dce3eb] bg-[#fbfcfe] p-3 text-sm text-[#17212b]";
const checkboxClass = "w-4 h-4 accent-[var(--color-brand)]";

export default function DiagnosticPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [cashCarriers, setCashCarriers] = useState<string[]>([]);
  // Tous coches par defaut : l'adherent decoche ce qu'il ne veut pas analyser.
  const [target, setTarget] = useState<PostName[]>(POSTS);
  const [callbackWanted, setCallbackWanted] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>("idle");

  const targetAll = target.length === POSTS.length;
  const caPeriod = CA_PERIODS.find(({ value }) => value === formData.caPeriod) ?? CA_PERIODS[1];

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
    setTargetError("");
    setTarget((current) =>
      current.includes(post)
        ? current.filter((name) => name !== post)
        : [...current, post]
    );
  };

  // "Aucun" exclut les autres choix, et inversement.
  const toggleCashCarry = (option: string) => {
    setCashCarriers((current) => {
      if (current.includes(option)) return current.filter((name) => name !== option);
      if (option === NO_CASH_CARRY) return [NO_CASH_CARRY];
      return [...current.filter((name) => name !== NO_CASH_CARRY), option];
    });
  };

  const buildPayload = () => ({
    ...formData,
    ca: formData.ca === "" ? "" : Number(formData.ca) * caPeriod.toMonthly,
    caEntered: formData.ca,
    cashCarriers,
    target,
    targetAll,
  });

  const submitDiagnostic = async (result: Analysis, wantsCallback: boolean) => {
    const response = await fetch("/api/diagnostic/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildPayload(),
        callbackWanted: wantsCallback,
        diagnosticId: result.diagnosticId,
        analysis: result,
      }),
    });
    if (!response.ok) throw new Error(`Envoi en erreur (${response.status})`);
  };

  const runAnalysis = async () => {
    setAnalysisStatus("loading");
    setCallbackStatus(callbackWanted ? "sending" : "idle");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!response.ok) throw new Error(`Analyse en erreur (${response.status})`);
      const result = (await response.json()) as Analysis;
      setAnalysis(result);
      setAnalysisStatus("success");

      // Chaque diagnostic est enregistre, meme sans demande de rappel.
      try {
        await submitDiagnostic(result, callbackWanted);
        if (callbackWanted) setCallbackStatus("success");
      } catch (error) {
        console.error("Diagnostic submit error:", error);
        if (callbackWanted) setCallbackStatus("error");
      }
    } catch (error) {
      console.error("Diagnostic analyze error:", error);
      setAnalysisStatus("error");
    }
  };

  const requestCallback = async () => {
    if (!analysis) return;
    setCallbackStatus("sending");
    try {
      await submitDiagnostic(analysis, true);
      setCallbackStatus("success");
    } catch (error) {
      console.error("Diagnostic submit error:", error);
      setCallbackStatus("error");
    }
  };

  const hasAmountToAnalyze = () =>
    AMOUNT_FIELDS.some(
      ({ name, label }) => Number(formData[name]) > 0 && target.includes(label as PostName)
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 4 && target.length === 0) {
      setTargetError("Sélectionnez au moins un poste à analyser.");
      return;
    }
    if (step === 4 && !hasAmountToAnalyze()) {
      setTargetError("Renseignez un montant pour au moins un des postes sélectionnés (étapes 2 et 3).");
      return;
    }
    goToStep(step + 1);
    if (step === RESULTS_STEP - 1) void runAnalysis();
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
      />
    </Field>
  );

  const renderAmountField = (name: TextField, label: string, placeholder = "0") => (
    <Field key={name} label={`${label} (€ / mois)`} htmlFor={name}>
      <input
        id={name}
        type="number"
        name={name}
        min="0"
        step="any"
        inputMode="decimal"
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        className={inputClass}
      />
    </Field>
  );

  const renderRadioGroup = (name: TextField, legend: string, options: string[]) => (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold text-[#17212b]">
        {legend}
        <span className="text-brand"> *</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => (
          <label key={option} className={`${checkClass} cursor-pointer pr-5`}>
            <input
              type="radio"
              name={name}
              value={option}
              required
              checked={formData[name] === option}
              onChange={handleChange}
              className={checkboxClass}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#17212b]">
      <header className="fixed inset-x-0 top-0 z-30 bg-[#1e2d4a] px-4 py-3 text-white shadow-md">
        <Link href="/" className="mx-auto flex max-w-[1020px] items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1">
            <Image src="/logo_snaac.png" alt="" width={36} height={36} />
          </span>
          <span>
            <span className="block text-xl font-bold leading-tight">SNAAC Group</span>
            <span className="block text-xs text-white/80">Centrale d&apos;achats nouvelle génération pour TPE/PME</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[1020px] px-4 pt-24 pb-4">
        {step < RESULTS_STEP ? (
          <>
            <section className="pt-6 pb-2">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight text-[#102a43]">
                Découvrez votre <span className="text-brand">potentiel d’optimisation</span>.
              </h1>
              <p className="mt-2 text-xl font-bold text-[#102a43]">« Seul, on est fort. Mais ensemble, on gagne de l&apos;argent ! »</p>
              <p className="mt-2 max-w-3xl text-[17px] leading-normal text-[#65758b]">
                Répondez à quelques questions et obtenez une première lecture personnalisée de vos principaux leviers d’optimisation.
              </p>
            </section>

            <section className="my-5 rounded-2xl border border-[#dce3eb] bg-white p-6 md:p-8 shadow-[0_5px_18px_#102a4310]">
              <div
                role="progressbar"
                aria-label="Progression du diagnostic"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step + 1}
                className="h-2 overflow-hidden rounded-full bg-[#e7edf3]"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-[#1677ff] transition-all duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <div className="mt-2 mb-5 flex justify-between gap-4 text-xs text-[#65758b]">
                <span>{STEPS[step]}</span>
                <span className="whitespace-nowrap font-semibold">Étape {step + 1} sur {STEPS.length}</span>
              </div>

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
                    <StepTitle subtitle="Commençons par quelques informations simples sur votre activité.">1. Votre entreprise</StepTitle>
                    {renderTextField("company", "Nom de l'entreprise", "text", "organization")}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Votre activité" htmlFor="activity" required>
                        <select id="activity" name="activity" required value={formData.activity} onChange={handleChange} className={inputClass}>
                          <option value="">Sélectionnez votre activité</option>
                          {ACTIVITIES.map((activity) => (
                            <option key={activity} value={activity}>{activity}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Département" htmlFor="department" required>
                        <select id="department" name="department" required value={formData.department} onChange={handleChange} className={inputClass}>
                          <option value="">Sélectionnez votre département</option>
                          {DEPARTMENTS.map((department) => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    {renderTextField("city", "Ville", "text", "address-level2")}
                    <Field label="Chiffre d'affaires approximatif (€)" htmlFor="ca" required>
                      {/* Grille : en flex, le w-full du select ecrasait le champ sur mobile. */}
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          id="ca"
                          type="number"
                          name="ca"
                          required
                          min="1"
                          step="any"
                          inputMode="decimal"
                          placeholder={caPeriod.placeholder}
                          value={formData.ca}
                          onChange={handleChange}
                          className={inputClass}
                        />
                        <select
                          name="caPeriod"
                          aria-label="Période du chiffre d'affaires"
                          value={formData.caPeriod}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          {CA_PERIODS.map(({ value }) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <>
                    <StepTitle subtitle="Indiquez vos dépenses approximatives par mois. Vous n’avez pas besoin de faire le calcul à l’année.">
                      2. Vos principaux postes de charges
                    </StepTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {GENERAL_CHARGES.map(({ name, label }) => renderAmountField(name, label))}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <StepTitle subtitle="Si vous êtes concerné, renseignez vos achats. Sinon laissez les champs à 0.">
                      3. Achats et restauration
                    </StepTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PURCHASES.map(({ name, label }) => renderAmountField(name, label))}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <StepTitle subtitle="SNAAC agit notamment sur les tarifs négociés, la mise en concurrence et l'accompagnement personnalisé.">
                      4. Votre situation fournisseur
                    </StepTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Combien de fournisseurs principaux avez-vous ?" htmlFor="suppliers">
                        <input id="suppliers" type="number" name="suppliers" min="0" inputMode="numeric" value={formData.suppliers} onChange={handleChange} className={inputClass} />
                      </Field>
                      {SUPPLIER_QUESTIONS.map(({ name, label, options }) => (
                        <Field key={name} label={label} htmlFor={name}>
                          <select id={name} name={name} value={formData[name]} onChange={handleChange} className={inputClass}>
                            {options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </Field>
                      ))}
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold text-[#17212b]">Chez quel(s) Cash &amp; Carry vous approvisionnez-vous ?</legend>
                      <div className="grid grid-cols-2 gap-2.5">
                        {CASH_CARRIES.map((option) => (
                          <label key={option} className={`${checkClass} cursor-pointer`}>
                            <input
                              type="checkbox"
                              checked={cashCarriers.includes(option)}
                              onChange={() => toggleCashCarry(option)}
                              className={checkboxClass}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {cashCarriers.includes(OTHER_CASH_CARRY) && (
                      <input
                        type="text"
                        name="cashOther"
                        aria-label="Précisez le nom du fournisseur"
                        placeholder="Précisez le nom du fournisseur"
                        value={formData.cashOther}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    )}
                    {renderAmountField("cashMonthly", "Dépenses réalisées via ces Cash & Carry", "Ex. 2 500")}
                  </>
                )}

                {step === 4 && (
                  <>
                    <StepTitle subtitle="Tous les postes sont sélectionnés. Décochez ceux que vous ne souhaitez pas analyser.">
                      5. Quels postes souhaitez-vous analyser ?
                    </StepTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <label className={`${checkClass} md:col-span-2 cursor-pointer border-[#b9d7ef] bg-[#eef5fb] font-bold`}>
                        <input
                          type="checkbox"
                          checked={targetAll}
                          onChange={(e) => {
                            setTargetError("");
                            setTarget(e.target.checked ? POSTS : []);
                          }}
                          className={checkboxClass}
                        />
                        Tous les postes de dépenses
                      </label>
                      {POSTS.map((post) => (
                        <label key={post} className={`${checkClass} cursor-pointer`}>
                          <input
                            type="checkbox"
                            checked={target.includes(post)}
                            onChange={() => togglePost(post)}
                            className={checkboxClass}
                          />
                          {post}
                        </label>
                      ))}
                    </div>
                    {targetError && (
                      <p role="alert" className="text-sm font-semibold text-red-600">{targetError}</p>
                    )}
                  </>
                )}

                {step === 5 && (
                  <>
                    <StepTitle subtitle="Quelques questions sur votre équipe et la formation de vos salariés.">
                      6. Votre personnel
                    </StepTitle>
                    <Field label="Nombre d'employés" htmlFor="employees" required>
                      <input
                        id="employees"
                        type="number"
                        name="employees"
                        required
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={formData.employees}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                    {renderRadioGroup("knowsOpco", "Connaissez-vous votre OPCO ?", OPCO_ANSWERS)}
                    {renderRadioGroup("trainingPlan", "Avez-vous un plan de formation en cours ?", YES_NO)}
                  </>
                )}

                {step === 6 && (
                  <>
                    <StepTitle subtitle="Ces coordonnées permettent à SNAAC de vous recontacter si vous souhaitez aller plus loin.">
                      7. Pour recevoir votre diagnostic
                    </StepTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderTextField("firstName", "Prénom", "text", "given-name")}
                      {renderTextField("lastName", "Nom", "text", "family-name")}
                      {renderTextField("email", "Email professionnel", "email", "email")}
                      {renderTextField("phone", "Téléphone", "tel", "tel")}
                    </div>
                    <Field label="Comment avez-vous connu SNAAC ?" htmlFor="howFound" required>
                      <select id="howFound" name="howFound" required value={formData.howFound} onChange={handleChange} className={inputClass}>
                        <option value="">Sélectionnez une réponse</option>
                        {HOW_FOUND_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <label className="flex items-center gap-4 rounded-lg border-2 border-brand bg-brand/5 p-4 text-lg font-semibold text-[#102a43] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={callbackWanted}
                        onChange={(e) => setCallbackWanted(e.target.checked)}
                        className="w-6 h-6 shrink-0 accent-[var(--color-brand)]"
                      />
                      Je souhaite être rappelé par SNAAC
                    </label>
                    <p className="text-xs text-[#65758b]">
                      Vos coordonnées sont nécessaires pour vous transmettre votre diagnostic. Un contrôle technique du format de l’e-mail et du téléphone est effectué ; aucun e-mail ou SMS de confirmation n’est envoyé.
                    </p>
                  </>
                )}

                <div className="mt-2 flex flex-wrap gap-2.5">
                  {step > 0 && (
                    <button type="button" onClick={() => goToStep(step - 1)} className={secondaryButtonClass}>
                      Retour
                    </button>
                  )}
                  <button type="submit" className={primaryButtonClass}>
                    {step === RESULTS_STEP - 1 ? "Voir mon diagnostic" : "Continuer"}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : (
          <div className="py-5">
            {analysisStatus === "loading" && (
              <p role="status" className="rounded-2xl border border-[#dce3eb] bg-white py-16 text-center text-sm text-[#65758b]">
                Analyse de vos données en cours...
              </p>
            )}

            {analysisStatus === "error" && (
              <div role="alert" className="rounded-2xl border border-[#dce3eb] bg-white py-10 text-center">
                <p className="mb-6 text-sm text-[#65758b]">
                  Une erreur est survenue pendant l&apos;analyse. Veuillez réessayer.
                </p>
                <button type="button" onClick={() => void runAnalysis()} className={primaryButtonClass}>
                  Réessayer
                </button>
              </div>
            )}

            {analysisStatus === "success" && analysis && (
              <DiagnosticResults
                analysis={analysis}
                activity={formData.activity}
                firstName={formData.firstName}
                location={formData.city || formData.department}
                callbackStatus={callbackStatus}
                onRequestCallback={() => void requestCallback()}
              />
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1020px] px-4 pt-2 pb-10 text-center text-xs text-[#65758b]">
        SNAAC Group — Centrale d&apos;achats nouvelle génération pour TPE/PME. Diagnostic indicatif : les estimations présentées sont à confirmer par l’analyse des factures, contrats, volumes et conditions fournisseurs.
      </footer>
    </div>
  );
}

function StepTitle({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#102a43]">{children}</h2>
      <p className="mt-1 text-[15px] leading-normal text-[#65758b]">{subtitle}</p>
    </div>
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-[#17212b]">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children}
    </div>
  );
}
