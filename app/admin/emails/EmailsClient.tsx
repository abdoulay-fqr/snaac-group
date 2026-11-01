"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailAccountInfo } from "@/lib/email-accounts";

type EmailSummary = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  seen: boolean;
};

type EmailList = {
  emails: EmailSummary[];
  unread: number;
  total: number;
  pageSize: number;
};

type EmailBody = {
  subject: string;
  from: string;
  date: string | null;
  html: string | null;
  text: string | null;
};

type ListState = { key: string; data?: EmailList; error?: string };
type MessageState = { uid: number; body?: EmailBody; error?: string };

const inputClass = "w-full px-3 py-2 rounded text-sm border outline-none transition-colors duration-300";
const inputStyle = {
  backgroundColor: "var(--input-bg)",
  borderColor: "var(--input-border)",
  color: "var(--input-color)",
};
const primaryButtonClass = "bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded font-semibold text-sm transition-colors duration-300 cursor-pointer disabled:opacity-50";
const secondaryButtonClass = "px-3 py-1.5 rounded font-semibold text-xs border transition-colors duration-300 cursor-pointer hover:border-brand hover:text-brand disabled:opacity-50";
const secondaryButtonStyle = { borderColor: "var(--border-color)", color: "var(--text-primary)" };
const cardStyle = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" };

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  return value ? dateTime.format(new Date(value)) : "";
}

// Le HTML vient de l'exterieur : iframe sandboxee sans scripts ni meme origine, et CSP
// qui bloque par defaut les images distantes (pixels de suivi).
function buildEmailDocument(html: string, showImages: boolean) {
  const images = showImages ? "data: https: http:" : "data:";
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src ${images}; font-src data:; form-action 'none'`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><base target="_blank"><style>body{margin:16px;font-family:Arial,sans-serif;font-size:14px;color:#1a2535;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

function UnreadBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} non lu${count > 1 ? "s" : ""}`}
      className="ml-2 inline-block min-w-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold text-center"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

type ComposeModalProps = {
  account: EmailAccountInfo;
  onClose: () => void;
  onSent: () => void;
  send: (fields: { to: string; subject: string; body: string }) => Promise<void>;
};

function ComposeModal({ account, onClose, onSent, send }: ComposeModalProps) {
  const [fields, setFields] = useState({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await send(fields);
      onSent();
    } catch (sendError) {
      console.error("Admin email send error:", sendError);
      setError(sendError instanceof Error ? sendError.message : "L'envoi du message a échoué.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau message"
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Nouveau message</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>De : {account.email}</p>
        </div>

        <div>
          <label htmlFor="compose-to" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>À</label>
          <input
            id="compose-to"
            type="text"
            required
            autoFocus
            value={fields.to}
            onChange={(event) => setFields({ ...fields, to: event.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="compose-subject" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Sujet</label>
          <input
            id="compose-subject"
            type="text"
            required
            value={fields.subject}
            onChange={(event) => setFields({ ...fields, subject: event.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="compose-body" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Corps</label>
          <textarea
            id="compose-body"
            required
            rows={10}
            value={fields.body}
            onChange={(event) => setFields({ ...fields, body: event.target.value })}
            className={inputClass}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={sending} className={primaryButtonClass}>
            {sending ? "Envoi..." : "Envoyer"}
          </button>
          <button type="button" onClick={onClose} disabled={sending} className={secondaryButtonClass} style={secondaryButtonStyle}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EmailsClient({ accounts }: { accounts: EmailAccountInfo[] }) {
  const router = useRouter();
  const [account, setAccount] = useState(accounts[0]);
  const [page, setPage] = useState(1);
  const [refreshCount, setRefreshCount] = useState(0);
  const [list, setList] = useState<ListState | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState("");
  const openRequest = useRef(0);

  const request = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(url, { cache: "no-store", ...init });
      if (response.status === 401) {
        router.push("/admin/login");
        throw new Error("Session expirée.");
      }
      const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
      if (!response.ok || !data) {
        throw new Error(data?.error ?? "La requête a échoué.");
      }
      return data;
    },
    [router]
  );

  const listKey = `${account.id}:${page}:${refreshCount}`;
  const loading = list?.key !== listKey;

  useEffect(() => {
    const controller = new AbortController();
    request<EmailList>(`/api/admin/emails/list?account=${account.id}&page=${page}`, { signal: controller.signal })
      .then((data) => {
        setList({ key: listKey, data });
        setUnread((current) => ({ ...current, [account.id]: data.unread }));
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        console.error("Admin emails load error:", error);
        setList({ key: listKey, error: error.message });
      });
    return () => controller.abort();
  }, [account.id, page, listKey, request]);

  useEffect(() => {
    for (const { id } of accounts.slice(1)) {
      request<EmailList>(`/api/admin/emails/list?account=${id}&summary=1`)
        .then((data) => setUnread((current) => ({ ...current, [id]: data.unread })))
        .catch((error: Error) => console.error(`Admin emails unread error (${id}):`, error));
    }
  }, [accounts, request]);

  const closeMessage = () => {
    openRequest.current += 1;
    setMessage(null);
  };

  const selectAccount = (next: EmailAccountInfo) => {
    closeMessage();
    setNotice("");
    setAccount(next);
    setPage(1);
  };

  const openEmail = async (email: EmailSummary) => {
    const token = ++openRequest.current;
    const accountId = account.id;
    setMessage({ uid: email.uid });
    setShowImages(false);
    try {
      const body = await request<EmailBody>(`/api/admin/emails/body?account=${accountId}&uid=${email.uid}`);
      if (token !== openRequest.current) return;
      setMessage({ uid: email.uid, body });
      if (!email.seen) {
        setList((current) =>
          current?.data
            ? {
                ...current,
                data: {
                  ...current.data,
                  emails: current.data.emails.map((row) => (row.uid === email.uid ? { ...row, seen: true } : row)),
                },
              }
            : current
        );
        setUnread((current) => ({ ...current, [accountId]: Math.max(0, (current[accountId] ?? 1) - 1) }));
      }
    } catch (error) {
      if (token !== openRequest.current) return;
      console.error("Admin email open error:", error);
      setMessage({ uid: email.uid, error: error instanceof Error ? error.message : "Le chargement du message a échoué." });
    }
  };

  const sendEmail = async (fields: { to: string; subject: string; body: string }) => {
    await request("/api/admin/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: account.id, ...fields }),
    });
  };

  const data = loading ? undefined : list?.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const body = message?.body;

  return (
    <main className="min-h-screen px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/admin" className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors">
          ← Retour au back-office
        </Link>

        <div className="flex flex-wrap gap-3 items-center justify-between mt-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Emails <span className="text-brand">SNAAC</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{account.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={loading}
              className={secondaryButtonClass}
              style={secondaryButtonStyle}
            >
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice("");
                setComposing(true);
              }}
              className={primaryButtonClass}
            >
              Nouveau message
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {accounts.map((item) => {
            const active = item.id === account.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectAccount(item)}
                className={`${secondaryButtonClass} text-sm ${active ? "border-brand! text-brand!" : ""}`}
                style={secondaryButtonStyle}
              >
                {item.label}
                <UnreadBadge count={unread[item.id]} />
              </button>
            );
          })}
        </div>

        {notice && <p role="status" className="text-sm font-semibold text-green-600 mb-4">{notice}</p>}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-start">
          <section
            aria-label="Liste des emails"
            className={`rounded-2xl shadow-sm overflow-hidden ${message ? "hidden md:block" : ""}`}
            style={cardStyle}
          >
            {loading ? (
              <p role="status" className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Chargement des emails...
              </p>
            ) : list?.error ? (
              <div role="alert" className="p-8 text-center">
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{list.error}</p>
                <button type="button" onClick={() => setRefreshCount((count) => count + 1)} className={primaryButtonClass}>
                  Réessayer
                </button>
              </div>
            ) : !data || data.emails.length === 0 ? (
              <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Aucun email à afficher.
              </p>
            ) : (
              <>
                <ul>
                  {data.emails.map((email) => (
                    <li key={email.uid} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <button
                        type="button"
                        aria-current={message?.uid === email.uid}
                        onClick={() => void openEmail(email)}
                        className={`w-full text-left px-4 py-3 cursor-pointer border-l-4 transition-colors duration-300 ${message?.uid === email.uid ? "border-brand" : "border-transparent"}`}
                        style={email.seen ? undefined : { backgroundColor: "var(--bg-card-alt)" }}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={`text-sm truncate ${email.seen ? "font-semibold" : "font-bold"}`} style={{ color: "var(--text-primary)" }}>
                            {email.from || "Expéditeur inconnu"}
                          </span>
                          <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                            {formatDate(email.date)}
                          </span>
                        </span>
                        <span className={`block text-sm truncate mt-0.5 ${email.seen ? "" : "font-semibold"}`} style={{ color: "var(--text-secondary)" }}>
                          {email.subject || "(sans sujet)"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className={secondaryButtonClass}
                    style={secondaryButtonStyle}
                  >
                    Précédent
                  </button>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Page {page} / {totalPages} · {data.total} message{data.total > 1 ? "s" : ""}
                  </p>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className={secondaryButtonClass}
                    style={secondaryButtonStyle}
                  >
                    Suivant
                  </button>
                </div>
              </>
            )}
          </section>

          <section
            aria-label="Lecture de l'email"
            className={`rounded-2xl shadow-sm overflow-hidden ${message ? "" : "hidden md:block"}`}
            style={cardStyle}
          >
            {!message ? (
              <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Sélectionnez un email pour le lire.
              </p>
            ) : message.error ? (
              <div role="alert" className="p-8 text-center">
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{message.error}</p>
                <button type="button" onClick={closeMessage} className={secondaryButtonClass} style={secondaryButtonStyle}>
                  Fermer
                </button>
              </div>
            ) : !body ? (
              <p role="status" className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Chargement du message...
              </p>
            ) : (
              <>
                <header className="p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={closeMessage} className={`${secondaryButtonClass} md:hidden mb-3`} style={secondaryButtonStyle}>
                    ← Retour à la liste
                  </button>
                  <h2 className="text-lg font-bold break-words" style={{ color: "var(--text-primary)" }}>
                    {body.subject || "(sans sujet)"}
                  </h2>
                  <p className="text-sm mt-1 break-words" style={{ color: "var(--text-secondary)" }}>{body.from}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{formatDate(body.date)}</p>
                  {body.html !== null && !showImages && (
                    <button type="button" onClick={() => setShowImages(true)} className={`${secondaryButtonClass} mt-3`} style={secondaryButtonStyle}>
                      Afficher les images
                    </button>
                  )}
                </header>
                {body.html !== null ? (
                  <iframe
                    title="Contenu de l'email"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={buildEmailDocument(body.html, showImages)}
                    className="w-full h-[65vh] bg-white"
                  />
                ) : (
                  <pre className="p-4 text-sm whitespace-pre-wrap break-words font-sans" style={{ color: "var(--text-primary)" }}>
                    {body.text || "Ce message n'a pas de contenu texte."}
                  </pre>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {composing && (
        <ComposeModal
          account={account}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            setNotice(`Message envoyé depuis ${account.email}.`);
          }}
          send={sendEmail}
        />
      )}
    </main>
  );
}
