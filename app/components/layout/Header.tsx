"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "../ThemeProvider";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#accueil", label: "Accueil" },
    { href: "#concept", label: "Le Concept" },
    { href: "#avantages", label: "Avantages Adhérents" },
    { href: "#devenir", label: "Devenir Adhérent" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 w-full z-50 shadow-sm transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-secondary)", paddingBlock: "18px" }}
    >
      <div className="mx-auto px-10">
        <nav className="flex justify-between items-center">

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

          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center gap-7 list-none">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm transition-colors duration-300 hover:text-brand"
                  style={{ color: "var(--text-primary)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {/* Theme Toggle */}
            <li>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-300 hover:bg-brand hover:border-brand hover:text-white cursor-pointer"
                style={{
                  backgroundColor: "var(--theme-btn-bg)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border-color)",
                }}
              >
                {theme === "dark" ? "☀️ Mode clair" : "🌙 Mode sombre"}
              </button>
            </li>

            {/* CTA */}
            <li>
              <Link href="#contact">
  <button className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded text-sm font-semibold transition-colors duration-300 cursor-pointer">
    Espace Adhérent
  </button>
</Link>
            </li>
          </ul>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="block w-6 h-0.5 bg-current" />
            <span className="block w-6 h-0.5 bg-current" />
            <span className="block w-6 h-0.5 bg-current" />
          </button>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <ul className="md:hidden flex flex-col gap-4 pt-4 pb-2 list-none">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm hover:text-brand transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={toggleTheme}
                className="text-sm font-semibold hover:text-brand transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {theme === "dark" ? "☀️ Mode clair" : "🌙 Mode sombre"}
              </button>
            </li>
          </ul>
        )}
      </div>
    </header>
  );
}