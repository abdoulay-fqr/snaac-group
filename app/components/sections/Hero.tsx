"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/content";

// Animations (brillance, halo, hover) definies dans globals.css sous .cta-premium.
const diagnosticLinkClass = "cta-premium inline-block bg-brand text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg";

export default function Hero({ content }: { content: LandingContent["hero"] }) {
  return (
    // Hauteur de l'ecran : le contenu est centre verticalement sous l'en-tete fixe.
    <section id="accueil" className="flex min-h-svh flex-col justify-center pt-28 pb-16 text-left">
      <div className="mx-auto px-20">
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
        <div className="flex justify-center">
          <Link href="/diagnostic" className={diagnosticLinkClass}>
            <span className="cta-shimmer" aria-hidden="true" />
            <span className="relative">Diagnostic Gratuit →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}