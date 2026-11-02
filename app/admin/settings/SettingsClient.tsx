"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MIN_PASSWORD_LENGTH = 12;

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const FIELDS = [
  { name: "currentPassword", label: "Mot de passe actuel", autoComplete: "current-password" },
  { name: "newPassword", label: "Nouveau mot de passe", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirmer le nouveau mot de passe", autoComplete: "new-password" },
] as const;

const inputClass = "w-full px-3 py-2 rounded text-sm border outline-none transition-colors duration-300";
const inputStyle = {
  backgroundColor: "var(--input-bg)",
  borderColor: "var(--input-border)",
  color: "var(--input-color)",
};

export default function SettingsClient() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Le changement de mot de passe a échoué.");
        return;
      }
      setForm(INITIAL_FORM);
      setSuccess(true);
    } catch (submitError) {
      console.error("Admin password change error:", submitError);
      setError("Le changement de mot de passe a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-4 md:px-8 py-8">
      <div className="max-w-xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 bg-[#1e2d4a] hover:bg-[#2a3d5e] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
          ← Retour au back-office
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-6" style={{ color: "var(--text-primary)" }}>
          Paramètres <span className="text-brand">SNAAC</span>
        </h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl shadow-sm p-6 flex flex-col gap-5"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Changer le mot de passe
          </h2>

          {FIELDS.map(({ name, label, autoComplete }) => (
            <div key={name}>
              <label htmlFor={name} className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                {label}
              </label>
              <input
                id={name}
                type="password"
                required
                minLength={name === "currentPassword" ? undefined : MIN_PASSWORD_LENGTH}
                autoComplete={autoComplete}
                value={form[name]}
                onChange={(event) => {
                  setSuccess(false);
                  setForm({ ...form, [name]: event.target.value });
                }}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          ))}

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {MIN_PASSWORD_LENGTH} caractères minimum.
          </p>

          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          {success && (
            <p role="status" className="text-sm font-semibold text-green-600">
              Mot de passe modifié. Il sera demandé à votre prochaine connexion.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer disabled:opacity-50 w-fit"
          >
            {saving ? "Enregistrement..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}
