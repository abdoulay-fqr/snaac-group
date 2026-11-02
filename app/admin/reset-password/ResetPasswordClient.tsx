"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const MIN_PASSWORD_LENGTH = 12;

const FIELDS = [
  { name: "password", label: "Nouveau mot de passe" },
  { name: "confirmation", label: "Confirmer le mot de passe" },
] as const;

function LoginLink() {
  return (
    <Link href="/admin/login" className="text-sm font-medium text-gray-700 hover:text-black underline">
      Retour à la connexion
    </Link>
  );
}

export default function ResetPasswordClient({ token }: { token: string }) {
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "La réinitialisation a échoué.");
        return;
      }
      setSuccess(true);
    } catch (submitError) {
      console.error("Admin password reset error:", submitError);
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        {!token ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Lien invalide</h1>
            <LoginLink />
          </>
        ) : success ? (
          <>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Mot de passe modifié</h1>
            <p role="status" className="text-sm text-gray-600 mb-6">
              Mot de passe réinitialisé. Vous pouvez vous connecter.
            </p>
            <LoginLink />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Nouveau mot de passe</h1>
            <form onSubmit={onSubmit} className="space-y-4 mb-6">
              {FIELDS.map(({ name, label }) => (
                <div key={name}>
                  <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    id={name}
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    value={form[name]}
                    onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">{MIN_PASSWORD_LENGTH} caractères minimum.</p>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {loading ? "Réinitialisation..." : "Réinitialiser"}
              </button>
            </form>
            <LoginLink />
          </>
        )}
      </div>
    </main>
  );
}
