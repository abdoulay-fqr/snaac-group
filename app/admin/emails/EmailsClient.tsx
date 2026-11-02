"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  Forward,
  Image as ImageIcon,
  ImageOff,
  Inbox,
  Mail,
  Menu,
  PenSquare,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { EmailAccountInfo, EmailFolder } from "@/lib/email-accounts";
import type { ComposeDraft, OutgoingEmail } from "./ComposeModal";

// Tiptap n'est charge qu'a l'ouverture du modal.
const ComposeModal = dynamic(() => import("./ComposeModal"), { ssr: false });

type Address = { name?: string; address?: string };

type EmailSummary = {
  uid: number;
  subject: string;
  from: Address | null;
  to: Address | null;
  date: string | null;
  seen: boolean;
};

type FolderCounts = Record<EmailFolder, number>;

type EmailList = {
  emails: EmailSummary[];
  folders: FolderCounts;
  total: number;
  pageSize: number;
};

type EmailBody = {
  subject: string;
  from: Address | null;
  replyTo: Address | null;
  to: Address[];
  cc: Address[];
  date: string | null;
  messageId: string | null;
  html: string | null;
  text: string | null;
};

type ListState = { key: string; data?: EmailList; error?: string };
type MessageState = { uid: number; body?: EmailBody; error?: string };
type ReadFilter = "all" | "unread" | "read";
type Notice = { kind: "success" | "error"; text: string };

// lib/email-accounts est server-only : satisfies garde ce nom aligne sur le serveur.
const SENT_FOLDER = "INBOX.INBOX.Sent" satisfies EmailFolder;

const FOLDERS = [
  { id: "INBOX", label: "Boîte de réception", Icon: Inbox },
  { id: SENT_FOLDER, label: "Envoyés", Icon: Send },
  { id: "INBOX.INBOX.Junk", label: "Spam", Icon: AlertTriangle },
] as const;

const READ_FILTERS: { id: ReadFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "unread", label: "Non lus" },
  { id: "read", label: "Lus" },
];

const AVATAR_COLORS = ["bg-[#2563eb]", "bg-[#7c3aed]", "bg-[#db2777]", "bg-[#ea580c]", "bg-[#0d9488]", "bg-[#4f46e5]", "bg-[#0284c7]"];
const SEARCH_DEBOUNCE_MS = 400;
const NOTICE_DURATION_MS = 5000;

const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

function formatRelativeDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? timeFormat.format(date) : dateFormat.format(date);
}

function formatFullDate(value: string | null) {
  return value ? dateTimeFormat.format(new Date(value)) : "";
}

function formatAddress(address: Address | null | undefined) {
  if (!address) return "";
  return address.name && address.address ? `${address.name} <${address.address}>` : address.address ?? address.name ?? "";
}

function displayName(address: Address | null | undefined) {
  return address?.name || address?.address || "Inconnu";
}

function initials(text: string) {
  const letters = text
    .split(/[\s@._-]+/)
    .map((word) => word.match(/\p{L}|\p{N}/u)?.[0] ?? "")
    .filter(Boolean);
  return letters.slice(0, 2).join("").toUpperCase() || "?";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Le HTML vient de l'exterieur : iframe sandboxee sans scripts ni meme origine, et CSP
// qui bloque par defaut les images distantes (pixels de suivi).
function buildEmailDocument(html: string, showImages: boolean) {
  const images = showImages ? "data: https: http:" : "data:";
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src ${images}; font-src data:; form-action 'none'`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><base target="_blank"><style>body{margin:20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

function originalContent(body: EmailBody) {
  return body.html ?? `<p>${escapeHtml(body.text ?? "").replace(/\r?\n/g, "<br>")}</p>`;
}

function prefixedSubject(prefix: string, subject: string) {
  return new RegExp(`^${prefix}\\s*:`, "i").test(subject) ? subject : `${prefix}: ${subject}`;
}

function addresses(list: (Address | null | undefined)[]) {
  return list.flatMap((item) => (item?.address ? [item.address] : []));
}

function buildReply(body: EmailBody, folder: EmailFolder): ComposeDraft {
  // Dans "Envoyes", l'expediteur est la boite elle-meme : on repond au destinataire.
  const recipients = folder === SENT_FOLDER ? body.to : [body.replyTo ?? body.from];
  const author = escapeHtml(formatAddress(body.from));
  return {
    title: `Répondre à ${displayName(recipients[0])}`,
    to: addresses(recipients),
    cc: [],
    subject: prefixedSubject("Re", body.subject),
    html: `<p></p><p>Le ${escapeHtml(formatFullDate(body.date))}, ${author} a écrit :</p><blockquote>${originalContent(body)}</blockquote>`,
    inReplyTo: body.messageId,
  };
}

function buildForward(body: EmailBody): ComposeDraft {
  const header = [
    "---------- Message transféré ----------",
    `De : ${escapeHtml(formatAddress(body.from))}`,
    `Date : ${escapeHtml(formatFullDate(body.date))}`,
    `Objet : ${escapeHtml(body.subject)}`,
    `À : ${escapeHtml(body.to.map(formatAddress).join(", "))}`,
  ].join("<br>");
  return {
    title: "Transférer le message",
    to: [],
    cc: [],
    subject: prefixedSubject("Fwd", body.subject),
    html: `<p></p><p>${header}</p>${originalContent(body)}`,
    inReplyTo: null,
  };
}

const NEW_MESSAGE: ComposeDraft = { title: "Nouveau message", to: [], cc: [], subject: "", html: "", inReplyTo: null };

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  const dimensions = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs";
  return (
    <span aria-hidden className={`${dimensions} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} shrink-0 inline-flex items-center justify-center rounded-full font-bold text-white`}>
      {initials(name)}
    </span>
  );
}

function SidebarBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span aria-label={`${count} non lu${count > 1 ? "s" : ""}`} className="ml-auto min-w-5 px-1.5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold text-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Chargement des emails">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="flex gap-3 px-4 py-3 border-b border-[#e2e8f0]">
          <span className="w-9 h-9 rounded-full bg-[#e2e8f0] animate-pulse" />
          <span className="flex-1 flex flex-col gap-2 py-1">
            <span className="h-3 w-2/3 rounded bg-[#e2e8f0] animate-pulse" />
            <span className="h-3 w-full rounded bg-[#e2e8f0] animate-pulse" />
          </span>
        </div>
      ))}
    </div>
  );
}

type EmailsClientProps = {
  accounts: EmailAccountInfo[];
  maxAttachmentBytes: number;
};

export default function EmailsClient({ accounts, maxAttachmentBytes }: EmailsClientProps) {
  const router = useRouter();
  const [account, setAccount] = useState(accounts[0]);
  const [folder, setFolder] = useState<EmailFolder>("INBOX");
  const [page, setPage] = useState(1);
  const [refreshCount, setRefreshCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [list, setList] = useState<ListState | null>(null);
  const [counts, setCounts] = useState<Record<string, FolderCounts>>({});
  const [message, setMessage] = useState<MessageState | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
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

  const listQuery = new URLSearchParams({ account: account.id, folder, page: String(page), search }).toString();
  const listKey = `${listQuery}:${refreshCount}`;
  const loading = list?.key !== listKey;

  useEffect(() => {
    const controller = new AbortController();
    request<EmailList>(`/api/admin/emails/list?${listQuery}`, { signal: controller.signal })
      .then((data) => {
        setList({ key: listKey, data });
        setCounts((current) => ({ ...current, [account.id]: data.folders }));
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        console.error("Admin emails load error:", error);
        setList({ key: listKey, error: error.message });
      });
    return () => controller.abort();
  }, [account.id, listKey, listQuery, request]);

  useEffect(() => {
    for (const { id } of accounts.slice(1)) {
      request<EmailList>(`/api/admin/emails/list?account=${id}&summary=1`)
        .then((data) => setCounts((current) => ({ ...current, [id]: data.folders })))
        .catch((error: Error) => console.error(`Admin emails unread error (${id}):`, error));
    }
  }, [accounts, request]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const closeMessage = () => {
    openRequest.current += 1;
    setMessage(null);
  };

  const selectMailbox = (nextAccount: EmailAccountInfo, nextFolder: EmailFolder) => {
    closeMessage();
    setAccount(nextAccount);
    setFolder(nextFolder);
    setPage(1);
    setSearchInput("");
    setSearch("");
    setMenuOpen(false);
  };

  const openEmail = async (email: EmailSummary) => {
    const token = ++openRequest.current;
    const accountId = account.id;
    const openedFolder = folder;
    setMessage({ uid: email.uid });
    setShowImages(false);
    try {
      const query = new URLSearchParams({ account: accountId, folder: openedFolder, uid: String(email.uid) });
      const body = await request<EmailBody>(`/api/admin/emails/body?${query}`);
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
        setCounts((current) => {
          const folders = current[accountId];
          if (!folders) return current;
          return { ...current, [accountId]: { ...folders, [openedFolder]: Math.max(0, folders[openedFolder] - 1) } };
        });
      }
    } catch (error) {
      if (token !== openRequest.current) return;
      console.error("Admin email open error:", error);
      setMessage({ uid: email.uid, error: error instanceof Error ? error.message : "Le chargement du message a échoué." });
    }
  };

  const deleteEmail = async (uid: number) => {
    if (!window.confirm("Déplacer ce message vers la corbeille ?")) return;
    try {
      await request("/api/admin/emails/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: account.id, folder, uid }),
      });
      closeMessage();
      setRefreshCount((count) => count + 1);
      setNotice({ kind: "success", text: "Message déplacé vers la corbeille." });
    } catch (error) {
      console.error("Admin email delete error:", error);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "La suppression a échoué." });
    }
  };

  const sendEmail = async (email: OutgoingEmail) => {
    const { savedToSent } = await request<{ savedToSent: boolean }>("/api/admin/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: account.id, ...email }),
    });
    setDraft(null);
    if (folder === SENT_FOLDER) setRefreshCount((count) => count + 1);
    setNotice(
      savedToSent
        ? { kind: "success", text: `Message envoyé depuis ${account.email}.` }
        : { kind: "error", text: "Message envoyé, mais la copie dans « Envoyés » a échoué." }
    );
  };

  const data = loading ? undefined : list?.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const body = message?.body;

  const visibleEmails = useMemo(() => {
    const filtered = (data?.emails ?? []).filter(
      (email) => readFilter === "all" || email.seen === (readFilter === "read")
    );
    return filtered.sort((a, b) => {
      const difference = new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime();
      return oldestFirst ? difference : -difference;
    });
  }, [data, readFilter, oldestFirst]);

  const FolderTitle = FOLDERS.find(({ id }) => id === folder)?.label;

  return (
    <div className="fixed inset-0 z-40 flex bg-[#f8fafc] text-[#0f172a]">
      {menuOpen && (
        <button type="button" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-[#0f172a]/50" />
      )}

      <aside
        className={`${menuOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} lg:static lg:flex w-[220px] shrink-0 flex-col bg-[#0f172a] text-[#cbd5e1]`}
      >
        <div className="flex items-center gap-2 px-4 py-5 text-white">
          <Mail size={20} className="text-[#60a5fa]" />
          <h1 className="text-sm font-bold">Messagerie SNAAC</h1>
        </div>

        <nav aria-label="Comptes" className="flex flex-col gap-0.5 px-2">
          {accounts.map((item) => {
            const active = item.id === account.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active}
                title={item.email}
                onClick={() => selectMailbox(item, "INBOX")}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${active ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
              >
                <Avatar name={item.label} size="sm" />
                <span className="truncate">{item.label}</span>
                <SidebarBadge count={counts[item.id]?.INBOX} />
              </button>
            );
          })}
        </nav>

        <hr className="mx-4 my-3 border-white/10" />

        <nav aria-label="Dossiers" className="flex flex-col gap-0.5 px-2">
          {FOLDERS.map(({ id, label, Icon }) => {
            const active = id === folder;
            return (
              <button
                key={id}
                type="button"
                aria-current={active}
                title={label}
                onClick={() => selectMailbox(account, id)}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] text-left transition-colors cursor-pointer ${active ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
                <SidebarBadge count={counts[account.id]?.[id]} />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 p-3">
          <Link href="/admin" className="flex items-center gap-2 px-1 py-1 text-xs text-[#94a3b8] hover:text-white transition-colors">
            <ArrowLeft size={14} />
            Back-office
          </Link>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDraft(NEW_MESSAGE);
            }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <PenSquare size={16} />
            Nouveau message
          </button>
        </div>
      </aside>

      <section
        aria-label="Liste des emails"
        className={`${message ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[350px] shrink-0 min-h-0 border-r border-[#e2e8f0] bg-[#f8fafc]`}
      >
        <div className="flex flex-col gap-3 p-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)} className="lg:hidden p-1.5 rounded text-[#64748b] hover:bg-[#e2e8f0] cursor-pointer">
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold truncate">{FolderTitle}</h2>
              <p className="text-xs text-[#64748b] truncate">{account.email}</p>
            </div>
            <button
              type="button"
              aria-label="Actualiser"
              title="Actualiser"
              disabled={loading}
              onClick={() => setRefreshCount((count) => count + 1)}
              className="p-1.5 rounded text-[#64748b] hover:bg-[#e2e8f0] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="search"
              aria-label="Rechercher par expéditeur, destinataire ou sujet"
              placeholder="Rechercher..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-[#e2e8f0] bg-white text-sm outline-none transition-colors focus:border-[#2563eb] [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput && (
              <button type="button" aria-label="Effacer la recherche" onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#94a3b8] hover:text-[#0f172a] cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="Filtrer" className="flex gap-1">
              {READ_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={readFilter === id}
                  onClick={() => setReadFilter(id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${readFilter === id ? "bg-[#2563eb] text-white" : "text-[#64748b] hover:bg-[#e2e8f0]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label={oldestFirst ? "Trier du plus récent au plus ancien" : "Trier du plus ancien au plus récent"}
              onClick={() => setOldestFirst(!oldestFirst)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-[#64748b] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
            >
              {oldestFirst ? <ArrowUpNarrowWide size={14} /> : <ArrowDownWideNarrow size={14} />}
              {oldestFirst ? "Plus ancien" : "Plus récent"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <ListSkeleton />
          ) : list?.error ? (
            <div role="alert" className="p-8 text-center">
              <AlertTriangle size={24} className="mx-auto mb-3 text-[#94a3b8]" />
              <p className="text-sm mb-4 text-[#64748b]">{list.error}</p>
              <button
                type="button"
                onClick={() => setRefreshCount((count) => count + 1)}
                className="px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : visibleEmails.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#64748b]">
              {search ? "Aucun résultat pour cette recherche." : "Aucun email à afficher."}
            </p>
          ) : (
            <ul>
              {visibleEmails.map((email) => {
                const contact = folder === SENT_FOLDER ? email.to : email.from;
                const name = displayName(contact);
                const selected = message?.uid === email.uid;
                return (
                  <li key={email.uid}>
                    <button
                      type="button"
                      aria-current={selected}
                      onClick={() => void openEmail(email)}
                      className={`flex gap-3 w-full px-4 py-3 text-left border-b border-[#e2e8f0] transition-colors cursor-pointer ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f1f5f9]"}`}
                    >
                      <Avatar name={name} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`text-sm truncate ${email.seen ? "font-medium" : "font-bold"}`}>{name}</span>
                          <span className="text-xs whitespace-nowrap text-[#64748b]">{formatRelativeDate(email.date)}</span>
                        </span>
                        {contact?.name && contact.address && (
                          <span className="block text-xs truncate text-[#64748b]">{contact.address}</span>
                        )}
                        <span className="flex items-start justify-between gap-2 mt-0.5">
                          <span className={`text-sm line-clamp-2 ${email.seen ? "text-[#64748b]" : "font-bold"}`}>
                            {email.subject || "(sans sujet)"}
                          </span>
                          {!email.seen && <span aria-label="Non lu" className="shrink-0 w-2.5 h-2.5 mt-1 rounded-full bg-[#2563eb]" />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[#e2e8f0]">
          <button
            type="button"
            aria-label="Page précédente"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
            className="p-1 rounded text-[#64748b] hover:bg-[#e2e8f0] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-xs text-[#64748b]">
            Page {page} / {totalPages}
            {data ? ` · ${data.total} message${data.total > 1 ? "s" : ""}` : ""}
          </p>
          <button
            type="button"
            aria-label="Page suivante"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
            className="p-1 rounded text-[#64748b] hover:bg-[#e2e8f0] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section aria-label="Lecture de l'email" className={`${message ? "flex" : "hidden lg:flex"} flex-col flex-1 min-w-0 min-h-0 bg-white`}>
        {!message ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#eff6ff] text-[#2563eb]">
              <Mail size={28} />
            </span>
            <p className="font-semibold">Aucun message sélectionné</p>
            <p className="text-sm text-[#64748b]">Choisissez un email dans la liste pour le lire.</p>
          </div>
        ) : message.error ? (
          <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle size={24} className="text-[#94a3b8]" />
            <p className="text-sm text-[#64748b]">{message.error}</p>
            <button type="button" onClick={closeMessage} className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-sm font-semibold cursor-pointer">
              Fermer
            </button>
          </div>
        ) : !body ? (
          <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-[#64748b]">
            <RefreshCw size={16} className="animate-spin" />
            Chargement du message...
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-3 p-5 border-b border-[#e2e8f0]">
              <button type="button" onClick={closeMessage} className="lg:hidden inline-flex items-center gap-1 w-fit text-sm font-semibold text-[#2563eb] cursor-pointer">
                <ArrowLeft size={16} />
                Retour à la liste
              </button>
              <h2 className="text-xl font-bold break-words">{body.subject || "(sans sujet)"}</h2>
              <div className="flex items-start gap-3">
                <Avatar name={displayName(body.from)} />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold break-words">{formatAddress(body.from) || "Expéditeur inconnu"}</p>
                  <p className="text-[#64748b] break-words">À : {body.to.map(formatAddress).join(", ") || "—"}</p>
                  {body.cc.length > 0 && <p className="text-[#64748b] break-words">Cc : {body.cc.map(formatAddress).join(", ")}</p>}
                  <p className="text-xs text-[#64748b] mt-0.5">{formatFullDate(body.date)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(buildReply(body, folder))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Reply size={16} />
                  Répondre
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(buildForward(body))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-sm font-semibold hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                >
                  <Forward size={16} />
                  Transférer
                </button>
                <button
                  type="button"
                  onClick={() => void deleteEmail(message.uid)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
                {body.html !== null && (
                  <button
                    type="button"
                    aria-pressed={showImages}
                    onClick={() => setShowImages(!showImages)}
                    className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                  >
                    {showImages ? <ImageOff size={16} /> : <ImageIcon size={16} />}
                    {showImages ? "Masquer images" : "Afficher images"}
                  </button>
                )}
              </div>
            </header>
            {body.html !== null ? (
              <iframe
                title="Contenu de l'email"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={buildEmailDocument(body.html, showImages)}
                className="flex-1 min-h-0 w-full bg-white"
              />
            ) : (
              <pre className="flex-1 min-h-0 overflow-y-auto p-5 text-sm whitespace-pre-wrap break-words font-sans">
                {body.text || "Ce message n'a pas de contenu texte."}
              </pre>
            )}
          </>
        )}
      </section>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`compose-overlay fixed bottom-4 right-4 z-[60] max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white ${notice.kind === "error" ? "bg-red-600" : "bg-[#0f172a]"}`}
        >
          {notice.text}
        </div>
      )}

      {draft && (
        <ComposeModal
          fromEmail={account.email}
          draft={draft}
          maxAttachmentBytes={maxAttachmentBytes}
          onClose={() => setDraft(null)}
          send={sendEmail}
        />
      )}
    </div>
  );
}
