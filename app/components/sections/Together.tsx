"use client";

import type { LandingContent } from "@/lib/content";

const checkIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0">
    <circle cx="12" cy="12" r="12" fill="#ff6b35" />
    <path d="M6 12.5l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const btnClass = "inline-block bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded font-semibold text-sm transition-colors duration-300 mt-6 cursor-pointer";

export default function Together({
  content,
}: {
  content: LandingContent["together"];
}) {
  return (
    <section id="concept" className="py-16">
      <div className="mx-auto px-20">
        <h2 className="text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {content.title}
        </h2>
        <p className="text-lg text-brand mb-8">{content.subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-10">
          {/* Left side */}
          <div>
            <p className="text-sm leading-loose mb-6" style={{ color: "var(--text-secondary)" }}>
              {content.description}
            </p>
            <ul className="space-y-5">
              {content.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-4 text-sm" style={{ color: "var(--text-primary)" }}>
                  <span
                    className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
                  >
                    {i + 1}
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <a href="#contact" className={btnClass}>
              {content.ctaText}
            </a>
          </div>

          {/* Right side */}
          <div
            className="rounded-2xl p-8 border"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-color)",
            }}
          >
            <ul className="flex flex-col gap-4">
              {content.checklist.map((item) => (
                <li key={item} className="flex items-center gap-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {checkIcon}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}