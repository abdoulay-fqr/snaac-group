"use client";

import Link from "next/link";
import type { LandingContent } from "@/lib/content";

const linkClass = "inline-block bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded font-semibold text-sm transition-colors duration-300";
const outlineLinkClass = "inline-block bg-white hover:bg-brand text-brand hover:text-white border border-brand px-6 py-3 rounded font-semibold text-sm transition-colors duration-300";

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
        <div className="flex flex-wrap gap-4">
          <a href="#contact" className={linkClass}>
            {content.ctaText}
          </a>
          <Link href="/diagnostic" className={outlineLinkClass}>
            Faire mon diagnostic gratuit →
          </Link>
        </div>
      </div>
    </section>
  );
}