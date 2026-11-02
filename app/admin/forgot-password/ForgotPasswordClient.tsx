"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(`Demande en erreur (${response.status})`);
      setSent(true);
    } catch (submitError) {
      console.error("Admin password recovery error:", submitError);
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Mot de passe oublié</h1>
        {sent ? (
          <p role="status" className="text-sm text-gray-600 mb-6">
            Si cet email est enregistré, vous recevrez un lien dans quelques instants.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Saisissez l&apos;email de récupération pour recevoir un lien de réinitialisation.
            </p>
            <form onSubmit={onSubmit} className="space-y-4 mb-6">
              <div>
                <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-semibold hover:bg-black disabled:opacity-60"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          </>
        )}
        <Link href="/admin/login" className="text-sm font-medium text-gray-700 hover:text-black underline">
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
