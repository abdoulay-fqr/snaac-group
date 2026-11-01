"use client";

import type { LandingContent } from "@/lib/content";

const btnClass = "inline-flex items-center gap-3 bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer after:content-['>'] after:font-bold";

export default function Steps({ content }: { content: LandingContent["steps"] }) {
  return (
    <section id="devenir" className="py-20">
      <div className="mx-auto px-20">
        <h2
          className="text-4xl font-bold text-center mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          {content.title} <span className="text-brand">{content.titleHighlight}</span> ?
        </h2>
        <p
          className="text-center text-sm mb-16"
          style={{ color: "var(--text-secondary)" }}
        >
          {content.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {content.items.map((step) => (
            <div
              key={step.number}
              className="p-10 rounded-lg text-center border transition-colors duration-300"
              style={{
                backgroundColor: "var(--bg-card-alt)",
                borderColor: "var(--border-color)",
              }}
            >
              <div className="text-5xl font-bold text-brand mb-5">
                {step.number}
              </div>
              <h3
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a href="#contact" className={btnClass}>
            {content.ctaText}
          </a>
        </div>
      </div>
    </section>
  );
}