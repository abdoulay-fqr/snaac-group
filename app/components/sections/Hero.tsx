"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/content";

// Animations (brillance, halo, hover) definies dans globals.css sous .cta-premium.
const diagnosticLinkClass = "cta-premium inline-block whitespace-nowrap bg-brand text-white px-8 py-4 rounded-lg font-bold text-lg";

export default function Hero({ content }: { content: LandingContent["hero"] }) {
  return (
    // Hauteur de l'ecran : le contenu est centre verticalement sous l'en-tete fixe.
    <section id="accueil" className="overflow-x-clip flex min-h-svh flex-col justify-center pt-28 pb-16 text-left">
      <div className="mx-auto px-6 md:px-20">
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          <span className="text-brand">
            {content.titleHighlight}
          </span>
        </h1>
        <h2
          className="text-3xl md:text-4xl font-bold mb-5 leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {content.titleLine1}
          <br />
          <span className="text-brand">
            {content.titleLine2Highlight}
          </span>
        </h2>
        <p
          className="text-base mb-8 max-w-xl"
          style={{ color: "var(--text-secondary)" }}
        >
          {content.description}
        </p>
        <div className="flex justify-center py-6">
          {/* Conteneur relatif : halo, anneaux et particules s'y positionnent. */}
          <div className="cta-wrap">
            <span className="cta-halo" aria-hidden="true" />
            <span className="cta-ring" aria-hidden="true" />
            <span className="cta-ring cta-ring--late" aria-hidden="true" />
            <Link href="/diagnostic" className={diagnosticLinkClass}>
              <span className="cta-bg" aria-hidden="true" />
              Diagnostic Gratuit →
            </Link>
            <span className="cta-orbit cta-orbit--a" aria-hidden="true"><span /></span>
            <span className="cta-orbit cta-orbit--b" aria-hidden="true"><span /></span>
            <span className="cta-orbit cta-orbit--c" aria-hidden="true"><span /></span>
          </div>
        </div>
      </div>
    </section>
  );
}