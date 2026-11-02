"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";
import type { LandingContent } from "@/lib/content";

const inputClass = "w-full px-4 py-3 rounded text-sm border outline-none transition-colors duration-300";

type SubmitStatus = "idle" | "sending" | "success" | "error";

export default function Contact({
  content,
}: {
  content: LandingContent["contact"];
}) {
  const [formData, setFormData] = useState({
    nom: "",
    entreprise: "",
    email: "",
    telephone: "",
    region: "",
    ville: "",
    message: "",
  });
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await emailjs.send(
        "service_pl11rmm",
        "template_czvhua9",
        {
          nom: formData.nom,
          entreprise: formData.entreprise,
          email: formData.email,
          telephone: formData.telephone,
          region: formData.region,
          ville: formData.ville,
          message: formData.message,
        },
        "X6WAPu7cJRzIH4s-F"
      );
      setStatus("success");
      setFormData({
        nom: "",
        entreprise: "",
        email: "",
        telephone: "",
        region: "",
        ville: "",
        message: "",
      });
    } catch (error) {
      console.error("EmailJS error:", error);
      setStatus("error");
    }
  };

  const regions = [
    "Île-de-France",
    "Auvergne-Rhône-Alpes",
    "Nouvelle-Aquitaine",
    "Occitanie",
    "Hauts-de-France",
    "Grand Est",
    "Provence-Alpes-Côte d'Azur",
    "Normandie",
    "Bretagne",
    "Pays de la Loire",
    "Centre-Val de Loire",
    "Bourgogne-Franche-Comté",
    "Corse",
  ];

  return (
    <section id="contact" className="py-20">
      <div className="mx-auto px-20">
        <h2
          className="text-4xl font-bold text-center mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          {content.title}<span className="text-brand">{content.titleHighlight}</span>
        </h2>
        <p
          className="text-center text-sm mb-16"
          style={{ color: "var(--text-secondary)" }}
        >
          {content.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="flex flex-col gap-8 mt-13">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--bg-contact-icon)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>{content.infoEmailLabel}</h4>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{content.infoEmailValue}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--bg-contact-icon)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.64-1.64a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>{content.infoPhoneLabel}</h4>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{content.infoPhoneValue}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input type="text" name="nom" placeholder="Nom" required value={formData.nom} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }} />
                <input type="text" name="entreprise" placeholder="Entreprise" required value={formData.entreprise} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }} />
              </div>
              <input type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }} />
              <input type="tel" name="telephone" placeholder="Téléphone" required value={formData.telephone} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }} />
              <select name="region" required value={formData.region} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }}>
                <option value="">Région</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input type="text" name="ville" placeholder="Ville" required value={formData.ville} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)" }} />
              <textarea name="message" placeholder="Votre message" required rows={5} value={formData.message} onChange={handleChange} className={inputClass} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-color)", resize: "vertical" }} />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-brand hover:bg-brand-hover text-white px-10 py-4 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer w-fit disabled:opacity-50"
              >
                {status === "sending" ? "Envoi en cours..." : "Envoyer le message"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {status === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Message envoyé !
            </h3>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Merci pour votre message. Notre équipe vous contactera dans les plus brefs délais.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {status === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Erreur d&apos;envoi
            </h3>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Une erreur est survenue. Veuillez réessayer ou nous contacter directement par email.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}