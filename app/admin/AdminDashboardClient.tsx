"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { diagnostics } from "@/lib/db/schema";

type Diagnostic = Omit<typeof diagnostics.$inferSelect, "createdAt"> & { createdAt: string };
type DiagnosticStatus = Diagnostic["status"];
type DiagnosticUpdate = Partial<Pick<Diagnostic, "status" | "notes">>;
type StatusFilter = "all" | DiagnosticStatus;

type DiagnosticItem = {
  post?: string;
  annual?: number;
  mastery?: number | null;
  savings?: number;
};

const STATUS_LABELS: Record<DiagnosticStatus, string> = {
  pending: "En attente",
  treated: "Traité",
};

const EXPENSE_FIELDS = [
  { name: "food", label: "Achats alimentaires" },
  { name: "drinks", label: "Boissons" },
  { name: "energy", label: "Énergie" },
  { name: "telecom", label: "Télécom" },
  { name: "internet", label: "Internet" },
  { name: "insurance", label: "Assurance" },
  { name: "supplies", label: "Fournitures" },
  { name: "vehicles", label: "Véhicules" },
  { name: "mutuelle", label: "Mutuelle / prévoyance" },
  { name: "rh", label: "RH / services externalisés" },
  { name: "pack", label: "Emballages" },
];

const inputClass = "px-3 py-2 rounded text-sm border outline-none transition-colors duration-300";
const inputStyle = {
  backgroundColor: "var(--input-bg)",
  borderColor: "var(--input-border)",
  color: "var(--input-color)",
};
const primaryButtonClass = "bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer disabled:opacity-50";
const secondaryButtonClass = "px-3 py-1.5 rounded font-semibold text-xs border transition-colors duration-300 cursor-pointer hover:border-brand hover:text-brand disabled:opacity-50";
const secondaryButtonStyle = { borderColor: "var(--border-color)", color: "var(--text-primary)" };
const dangerButtonClass = "px-3 py-1.5 rounded font-semibold text-xs border border-red-300 text-red-600 transition-colors duration-300 cursor-pointer hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseItems(diagnostic: Diagnostic): DiagnosticItem[] {
  const items = parseJson(diagnostic.items);
  return Array.isArray(items) ? (items as DiagnosticItem[]) : [];
}

function parseExpenses(diagnostic: Diagnostic) {
  const raw = parseJson(diagnostic.rawPayload);
  if (typeof raw !== "object" || raw === null) return [];
  const payload = raw as Record<string, unknown>;
  return EXPENSE_FIELDS.flatMap(({ name, label }) => {
    const amount = Number(payload[name]);
    return amount > 0 ? [{ label, amount }] : [];
  });
}

// Les cellules viennent d'un formulaire public : un "=" initial serait execute par Excel.
function csvCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  let cell = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[";\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function downloadCsv(rows: Diagnostic[]) {
  const header = [
    "Date", "Entreprise", "Activité", "Département", "Ville", "CA", "Score", "Label",
    "Économies basses", "Économies médianes", "Économies hautes", "Prénom", "Nom",
    "Email", "Téléphone", "Rappel souhaité", "Statut", "Notes",
  ];
  const lines = rows.map((row) => [
    dateTime.format(new Date(row.createdAt)), row.company, row.activity, row.department,
    row.city, row.ca, row.score, row.label, row.savingsLow, row.savingsMid, row.savingsHigh,
    row.firstName, row.lastName, row.email, row.phone, row.callbackWanted ? "Oui" : "Non",
    STATUS_LABELS[row.status], row.notes,
  ]);
  const csv = [header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");

  // BOM et ";" : format attendu par Excel en francais.
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `diagnostics-snaac-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: DiagnosticStatus }) {
  const colors = status === "treated" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colors}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold mb-2 text-brand">{title}</h3>
      {children}
    </section>
  );
}

function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
          <dd className="font-semibold break-words min-w-0" style={{ color: "var(--text-primary)" }}>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

type DetailPanelProps = {
  diagnostic: Diagnostic;
  onClose: () => void;
  onUpdate: (id: string, update: DiagnosticUpdate) => Promise<boolean>;
};

function DetailPanel({ diagnostic, onClose, onUpdate }: DetailPanelProps) {
  const [notes, setNotes] = useState(diagnostic.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const items = parseItems(diagnostic);
  const expenses = parseExpenses(diagnostic);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const saveNotes = async () => {
    setSaving(true);
    setSaved(false);
    const ok = await onUpdate(diagnostic.id, { notes: notes.trim() || null });
    setSaving(false);
    setSaved(ok);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Détail du diagnostic ${diagnostic.company}`}
        className="w-full max-w-xl h-full overflow-y-auto p-6 flex flex-col gap-6 shadow-2xl"
        style={{ backgroundColor: "var(--bg-card)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {diagnostic.company || "Entreprise non renseignée"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {dateTime.format(new Date(diagnostic.createdAt))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={diagnostic.status} />
            <button type="button" onClick={onClose} className={secondaryButtonClass} style={secondaryButtonStyle}>
              Fermer
            </button>
          </div>
        </div>

        <DetailSection title="Entreprise">
          <DetailRows
            rows={[
              ["Activité", diagnostic.activity],
              ["Département", diagnostic.department],
              ["Ville", diagnostic.city],
              ["Chiffre d'affaires", euros.format(diagnostic.ca)],
            ]}
          />
        </DetailSection>

        <DetailSection title="Contact">
          <DetailRows
            rows={[
              ["Nom", `${diagnostic.firstName} ${diagnostic.lastName}`.trim()],
              ["Email", diagnostic.email],
              ["Téléphone", diagnostic.phone],
              ["Rappel souhaité", diagnostic.callbackWanted ? "Oui" : "Non"],
            ]}
          />
        </DetailSection>

        <DetailSection title="Résultat">
          <DetailRows
            rows={[
              ["Score", diagnostic.score === null ? "—" : `${diagnostic.score} / 100`],
              ["Appréciation", diagnostic.label ?? ""],
              ["Économies basses", euros.format(diagnostic.savingsLow)],
              ["Économies médianes", euros.format(diagnostic.savingsMid)],
              ["Économies hautes", euros.format(diagnostic.savingsHigh)],
              ["Méthode", diagnostic.methodVersion],
            ]}
          />
        </DetailSection>

        {items.length > 0 && (
          <DetailSection title="Postes analysés">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                    <th scope="col" className="py-2 pr-4 font-semibold">Poste</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-right whitespace-nowrap">Dépense / an</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-right">Maîtrise</th>
                    <th scope="col" className="py-2 font-semibold text-right">Économie</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.post}-${index}`} style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}>
                      <td className="py-2 pr-4">{item.post ?? "—"}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap">{typeof item.annual === "number" ? euros.format(item.annual) : "—"}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap">{typeof item.mastery === "number" ? `${Math.round(item.mastery)} %` : "—"}</td>
                      <td className="py-2 text-right whitespace-nowrap">{typeof item.savings === "number" ? euros.format(item.savings) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>
        )}

        {expenses.length > 0 && (
          <DetailSection title="Dépenses mensuelles déclarées">
            <DetailRows rows={expenses.map(({ label, amount }) => [label, euros.format(amount)])} />
          </DetailSection>
        )}

        <DetailSection title="Notes">
          <textarea
            aria-label="Notes"
            rows={5}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setSaved(false);
            }}
            className={`${inputClass} w-full`}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div className="flex items-center gap-3 mt-3">
            <button type="button" onClick={saveNotes} disabled={saving} className={primaryButtonClass}>
              {saving ? "Enregistrement..." : "Enregistrer les notes"}
            </button>
            {saved && <p role="status" className="text-sm font-semibold text-green-600">Notes enregistrées.</p>}
          </div>
        </DetailSection>
      </aside>
    </div>
  );
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const [rows, setRows] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activityFilter, setActivityFilter] = useState("all");

  const loadDiagnostics = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/diagnostics", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) throw new Error(`Chargement en erreur (${response.status})`);
      setRows((await response.json()) as Diagnostic[]);
      setLoadError(false);
    } catch (error) {
      console.error("Admin diagnostics load error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const activities = useMemo(
    () => [...new Set(rows.map((row) => row.activity).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (statusFilter === "all" || row.status === statusFilter) &&
          (activityFilter === "all" || row.activity === activityFilter)
      ),
    [rows, statusFilter, activityFilter]
  );

  const detail = rows.find((row) => row.id === detailId);

  const updateDiagnostic = async (id: string, update: DiagnosticUpdate) => {
    setActionError("");
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/diagnostics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error(`Mise à jour en erreur (${response.status})`);
      const updated = (await response.json()) as Diagnostic;
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
      return true;
    } catch (error) {
      console.error("Admin diagnostic update error:", error);
      setActionError("La mise à jour a échoué. Veuillez réessayer.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const deleteDiagnostic = async (row: Diagnostic) => {
    if (!window.confirm(`Supprimer définitivement le diagnostic de ${row.company || "cette entreprise"} ?`)) {
      return;
    }
    setActionError("");
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/admin/diagnostics/${row.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Suppression en erreur (${response.status})`);
      setRows((current) => current.filter(({ id }) => id !== row.id));
    } catch (error) {
      console.error("Admin diagnostic delete error:", error);
      setActionError("La suppression a échoué. Veuillez réessayer.");
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Back-office <span className="text-brand">SNAAC</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {filteredRows.length} diagnostic{filteredRows.length > 1 ? "s" : ""} affiché{filteredRows.length > 1 ? "s" : ""} sur {rows.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer" className={secondaryButtonClass} style={secondaryButtonStyle}>
              Ouvrir le site
            </a>
            <Link href="/admin/emails" className={secondaryButtonClass} style={secondaryButtonStyle}>
              Emails
            </Link>
            <Link href="/admin/settings" className={secondaryButtonClass} style={secondaryButtonStyle}>
              Paramètres
            </Link>
            <button type="button" onClick={logout} className={dangerButtonClass}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Filtrer par statut"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">{STATUS_LABELS.pending}</option>
              <option value="treated">{STATUS_LABELS.treated}</option>
            </select>
            <select
              aria-label="Filtrer par activité"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="all">Toutes les activités</option>
              {activities.map((activity) => (
                <option key={activity} value={activity}>{activity}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(filteredRows)}
            disabled={filteredRows.length === 0}
            className={primaryButtonClass}
          >
            Export CSV
          </button>
        </div>

        {actionError && (
          <p role="alert" className="text-sm font-semibold text-red-600 mb-4">{actionError}</p>
        )}

        <div
          className="rounded-2xl shadow-sm overflow-x-auto"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          {loading ? (
            <p role="status" className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Chargement des diagnostics...
            </p>
          ) : loadError ? (
            <div role="alert" className="p-8 text-center">
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Impossible de charger les diagnostics. Vérifiez la connexion à la base de données.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void loadDiagnostics();
                }}
                className={primaryButtonClass}
              >
                Réessayer
              </button>
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Aucun diagnostic à afficher.
            </p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                  {["Date", "Entreprise", "Activité", "Ville", "Score", "Économies (mid)", "Contact", "Statut", "Actions"].map((column) => (
                    <th key={column} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}>
                    <td className="px-4 py-3 whitespace-nowrap">{dateTime.format(new Date(row.createdAt))}</td>
                    <td className="px-4 py-3 font-semibold">{row.company}</td>
                    <td className="px-4 py-3">{row.activity}</td>
                    <td className="px-4 py-3">{row.city}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.score ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{euros.format(row.savingsMid)}</td>
                    <td className="px-4 py-3">
                      <p>{`${row.firstName} ${row.lastName}`.trim()}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.email}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.phone}</p>
                      {row.callbackWanted && <p className="text-xs font-semibold text-brand">Rappel souhaité</p>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => updateDiagnostic(row.id, { status: row.status === "pending" ? "treated" : "pending" })}
                          className={secondaryButtonClass}
                          style={secondaryButtonStyle}
                        >
                          {row.status === "pending" ? "Traiter" : "Réouvrir"}
                        </button>
                        <button type="button" onClick={() => setDetailId(row.id)} className={secondaryButtonClass} style={secondaryButtonStyle}>
                          Détail
                        </button>
                        <button type="button" disabled={busyId === row.id} onClick={() => deleteDiagnostic(row)} className={dangerButtonClass}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detail && (
        <DetailPanel
          key={detail.id}
          diagnostic={detail}
          onClose={() => setDetailId(null)}
          onUpdate={updateDiagnostic}
        />
      )}
    </main>
  );
}
