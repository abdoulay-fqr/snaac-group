"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import DiagnosticReport, { type Analysis } from "./DiagnosticReport";
import { exportReportPdf } from "./exportReportPdf";

export type CallbackStatus = "idle" | "sending" | "success" | "error";

type DiagnosticResultsProps = {
  analysis: Analysis;
  activity: string;
  firstName: string;
  location: string;
  callbackStatus: CallbackStatus;
  onRequestCallback: () => void;
};

const buttonClass = "rounded-lg font-bold cursor-pointer transition-all duration-300 disabled:opacity-60";
const calloutClass = "mt-5 rounded-lg border-l-4 p-4 text-[15px] leading-relaxed";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function DiagnosticResults({
  analysis,
  activity,
  firstName,
  location,
  callbackStatus,
  onRequestCallback,
}: DiagnosticResultsProps) {
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const pdfRoot = useRef<HTMLDivElement>(null);
  const reportProps = { analysis, activity, firstName, location };

  const exportPdf = async () => {
    setExportFailed(false);
    flushSync(() => setExporting(true));
    try {
      if (!pdfRoot.current) throw new Error("Rapport PDF absent");
      await exportReportPdf(pdfRoot.current, `diagnostic-snaac-${slug(activity)}-${slug(firstName)}.pdf`);
    } catch (error) {
      console.error("Diagnostic PDF error:", error);
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <DiagnosticReport {...reportProps} />

      <section className="mt-5 rounded-2xl border border-[#dce3eb] bg-white p-6">
        <h2 className="text-xl font-bold text-[#102a43]">Souhaitez-vous aller plus loin ?</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-[#65758b]">
          Faites-vous recontacter par SNAAC pour affiner votre diagnostic et vérifier les économies réellement accessibles.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRequestCallback}
            disabled={callbackStatus === "sending" || callbackStatus === "success"}
            className={`${buttonClass} bg-brand px-8 py-4 text-lg text-white shadow-lg hover:scale-105 hover:brightness-110 hover:shadow-xl disabled:hover:scale-100`}
          >
            {callbackStatus === "sending" ? "Envoi en cours..." : "Être recontacté pour affiner mon diagnostic"}
          </button>
          <button
            type="button"
            onClick={() => setConsulting(true)}
            className={`${buttonClass} bg-[#edf3f8] px-5 py-3 text-[15px] text-[#102a43] hover:bg-[#dfe8f0]`}
          >
            Je souhaite simplement consulter mon diagnostic
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={exporting}
            className={`${buttonClass} bg-[#1677ff] px-5 py-3 text-[15px] text-white hover:brightness-110`}
          >
            {exporting ? "Génération du PDF..." : "Imprimer / enregistrer en PDF"}
          </button>
        </div>

        {callbackStatus === "success" && (
          <p role="status" className={`${calloutClass} border-[#159a62] bg-[#eef7f2] text-[#17212b]`}>
            <strong>Votre demande est bien enregistrée.</strong>
            <br />
            Un conseiller SNAAC pourra reprendre contact avec vous pour approfondir votre diagnostic.
          </p>
        )}
        {callbackStatus === "error" && (
          <p role="alert" className={`${calloutClass} border-[#d62828] bg-[#fdf0f0] text-[#17212b]`}>
            L&apos;envoi a échoué. Veuillez réessayer ou nous écrire via le{" "}
            <Link href="/#contact" className="underline">formulaire de contact</Link>.
          </p>
        )}
        {consulting && callbackStatus !== "success" && (
          <p role="status" className={`${calloutClass} border-[#159a62] bg-[#eef7f2] text-[#17212b]`}>
            <strong>Votre diagnostic est enregistré.</strong>
            <br />
            Vous pouvez conserver ce résultat. SNAAC dispose de votre diagnostic pour améliorer progressivement sa méthode d’analyse.
          </p>
        )}
        {exportFailed && (
          <p role="alert" className={`${calloutClass} border-[#d62828] bg-[#fdf0f0] text-[#17212b]`}>
            La génération du PDF a échoué. Veuillez réessayer.
          </p>
        )}
      </section>

      <p className="mt-3 text-xs text-[#65758b]">Méthode {analysis.methodVersion}</p>

      {exporting && (
        <div aria-hidden className="absolute top-0 left-[-10000px] w-[794px] bg-white px-8">
          <div ref={pdfRoot}>
            <DiagnosticReport {...reportProps} pdf />
          </div>
        </div>
      )}
    </>
  );
}
