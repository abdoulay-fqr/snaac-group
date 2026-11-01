"use client";

import Image from "next/image";
import Link from "next/link";
import type { LandingContent } from "@/lib/content";

const navLinks = [
  { href: "#accueil", label: "Accueil" },
  { href: "#concept", label: "Le Concept" },
  { href: "#avantages", label: "Avantages" },
  { href: "#devenir", label: "Devenir Adhérent" },
  { href: "#contact", label: "Contact" },
];

export default function Footer({ content }: { content: LandingContent["footer"] }) {
  return (
    <footer
      className="mt-20 pt-10 pb-6 transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-footer)" }}
    >
      <div className="mx-auto px-20">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 font-bold text-lg">
            <Image
              src="/logo_snaac.png"
              alt="SNAAC Group Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span style={{ color: "var(--text-primary)" }}>
              SNAAC <span className="text-brand">Group</span>
            </span>
          </div>

          {/* Nav */}
          <ul className="flex flex-wrap justify-center gap-6 list-none">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm transition-colors duration-300 hover:text-brand"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div
          className="h-px w-full mb-6"
          style={{ backgroundColor: "var(--border-color)" }}
        />

        {/* Bottom row */}
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          {content.copyright}
        </p>
      </div>
    </footer>
  );
}