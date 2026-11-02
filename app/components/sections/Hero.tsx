"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/content";

const diagnosticLinkClass = "inline-block bg-brand text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-xl";

export default function Hero({ content }: { content: LandingContent["hero"] }) {
  return (
    <section id="accueil" className="py-20 md:py-28 text-left">
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
        <Link href="/diagnostic" className={diagnosticLinkClass}>
          Je veux économiser sur mes charges →
        </Link>
      </div>
    </section>
  );
}