"use client";

import { useRef, useState } from "react";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Palette,
  Paperclip,
  Send,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";

export type ComposeDraft = {
  title: string;
  to: string[];
  cc: string[];
  subject: string;
  html: string;
  inReplyTo: string | null;
};

export type OutgoingEmail = {
  to: string[];
  cc: string[];
  subject: string;
  html: string;
  inReplyTo: string | null;
  attachments: { filename: string; content: string; contentType: string }[];
};

type ComposeModalProps = {
  fromEmail: string;
  draft: ComposeDraft;
  maxAttachmentBytes: number;
  onClose: () => void;
  send: (email: OutgoingEmail) => Promise<void>;
};

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const fieldLabelClass = "w-14 shrink-0 text-sm text-[#64748b]";
const fieldRowClass = "flex items-start gap-2 px-5 py-2 border-b border-[#e2e8f0]";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });
}

type RecipientInputProps = {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  autoFocus?: boolean;
};

function RecipientInput({ id, label, values, onChange, autoFocus }: RecipientInputProps) {
  const [input, setInput] = useState("");

  const commit = (text: string) => {
    const added = text.split(/[,;\s]+/).filter(Boolean);
    if (added.length > 0) onChange([...new Set([...values, ...added])]);
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
      {values.map((address) => {
        const valid = EMAIL_PATTERN.test(address);
        return (
          <span
            key={address}
            className={`inline-flex items-center gap-1 max-w-full rounded-full px-2.5 py-0.5 text-sm ${valid ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-red-100 text-red-700"}`}
          >
            <span className="truncate">{address}</span>
            <button
              type="button"
              aria-label={`Retirer ${address}`}
              onClick={() => onChange(values.filter((value) => value !== address))}
              className="cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        );
      })}
      <input
        id={id}
        aria-label={label}
        type="text"
        autoFocus={autoFocus}
        autoComplete="off"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onBlur={() => commit(input)}
        onPaste={(event) => {
          event.preventDefault();
          commit(`${input} ${event.clipboardData.getData("text")}`);
        }}
        onKeyDown={(event) => {
          if (["Enter", ",", ";", " ", "Tab"].includes(event.key) && input.trim()) {
            event.preventDefault();
            commit(input);
          } else if (event.key === "Enter") {
            event.preventDefault();
          } else if (event.key === "Backspace" && !input) {
            onChange(values.slice(0, -1));
          }
        }}
        className="flex-1 min-w-32 py-0.5 text-sm outline-none bg-transparent"
      />
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Garde la selection de l'editeur au clic.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
    >
      {children}
    </button>
  );
}

export default function ComposeModal({ fromEmail, draft, maxAttachmentBytes, onClose, send }: ComposeModalProps) {
  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc);
  const [showCc, setShowCc] = useState(draft.cc.length > 0);
  const [subject, setSubject] = useState(draft.subject);
  const [files, setFiles] = useState<File[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [rawHtml, setRawHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bodyEdited = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      // StarterKit v3 embarque underline : l'extension dediee le remplace.
      StarterKit.configure({ underline: false, heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: draft.html,
    shouldRerenderOnTransaction: true,
    onUpdate: () => {
      bodyEdited.current = true;
    },
    editorProps: {
      attributes: { class: "compose-editor", role: "textbox", "aria-label": "Corps du message", "aria-multiline": "true" },
    },
  });

  const attachedBytes = files.reduce((total, file) => total + file.size, 0);

  const addFiles = (added: FileList | null) => {
    const selected = [...(added ?? [])];
    if (attachedBytes + selected.reduce((total, file) => total + file.size, 0) > maxAttachmentBytes) {
      setError(`Les pièces jointes sont limitées à ${formatSize(maxAttachmentBytes)} au total.`);
    } else {
      setError("");
      setFiles([...files, ...selected]);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const toggleRawMode = () => {
    if (!editor) return;
    if (rawMode) {
      editor.commands.setContent(rawHtml);
    } else {
      setRawHtml(editor.getHTML());
    }
    setRawMode(!rawMode);
  };

  const requestClose = () => {
    const edited = bodyEdited.current || subject !== draft.subject || to.join() !== draft.to.join() || files.length > 0;
    if (!edited || window.confirm("Abandonner ce message ?")) onClose();
  };

  const handleSend = async () => {
    if (!editor) return;
    if (to.length === 0) {
      setError("Ajoutez au moins un destinataire.");
      return;
    }
    if (![...to, ...cc].every((address) => EMAIL_PATTERN.test(address))) {
      setError("Corrigez les adresses en rouge.");
      return;
    }
    if (!subject.trim()) {
      setError("L'objet est obligatoire.");
      return;
    }

    setError("");
    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          content: await readAsBase64(file),
          contentType: file.type,
        }))
      );
      await send({
        to,
        cc,
        subject,
        html: rawMode ? rawHtml : editor.getHTML(),
        inReplyTo: draft.inReplyTo,
        attachments,
      });
    } catch (sendError) {
      console.error("Admin email send error:", sendError);
      setError(sendError instanceof Error ? sendError.message : "L'envoi du message a échoué.");
      setSending(false);
    }
  };

  const chain = () => editor?.chain().focus();

  return (
    <div className="compose-overlay fixed inset-0 z-50 flex bg-[#0f172a]/60 lg:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title}
        className="compose-panel flex flex-col w-full h-full max-w-5xl mx-auto bg-white text-[#0f172a] lg:rounded-2xl shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 bg-[#0f172a] text-white">
          <div className="min-w-0">
            <h2 className="font-bold truncate">{draft.title}</h2>
            <p className="text-xs text-[#94a3b8] truncate">De : {fromEmail}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={requestClose} disabled={sending} className="p-1 rounded hover:bg-white/10 cursor-pointer disabled:opacity-50">
            <X size={20} />
          </button>
        </header>

        <div className={fieldRowClass}>
          <label htmlFor="compose-to" className={fieldLabelClass}>À</label>
          <RecipientInput id="compose-to" label="Destinataires" values={to} onChange={setTo} autoFocus={draft.to.length === 0} />
          {!showCc && (
            <button type="button" onClick={() => setShowCc(true)} className="text-sm font-semibold text-[#2563eb] cursor-pointer">
              Cc
            </button>
          )}
        </div>

        <div className={`grid transition-[grid-template-rows] duration-200 ${showCc ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            {showCc && (
              <div className={fieldRowClass}>
                <label htmlFor="compose-cc" className={fieldLabelClass}>Cc</label>
                <RecipientInput id="compose-cc" label="Copie" values={cc} onChange={setCc} />
              </div>
            )}
          </div>
        </div>

        <div className={fieldRowClass}>
          <label htmlFor="compose-subject" className={fieldLabelClass}>Objet</label>
          <input
            id="compose-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="flex-1 min-w-0 text-sm font-semibold outline-none"
          />
        </div>

        <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap items-center gap-0.5 px-4 py-1.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <ToolbarButton label="Gras" disabled={rawMode} active={editor?.isActive("bold")} onClick={() => chain()?.toggleBold().run()}><Bold size={16} /></ToolbarButton>
          <ToolbarButton label="Italique" disabled={rawMode} active={editor?.isActive("italic")} onClick={() => chain()?.toggleItalic().run()}><Italic size={16} /></ToolbarButton>
          <ToolbarButton label="Souligné" disabled={rawMode} active={editor?.isActive("underline")} onClick={() => chain()?.toggleUnderline().run()}><UnderlineIcon size={16} /></ToolbarButton>
          <span aria-hidden className="w-px h-5 mx-1 bg-[#e2e8f0]" />
          <ToolbarButton label="Titre 1" disabled={rawMode} active={editor?.isActive("heading", { level: 1 })} onClick={() => chain()?.toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></ToolbarButton>
          <ToolbarButton label="Titre 2" disabled={rawMode} active={editor?.isActive("heading", { level: 2 })} onClick={() => chain()?.toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
          <ToolbarButton label="Titre 3" disabled={rawMode} active={editor?.isActive("heading", { level: 3 })} onClick={() => chain()?.toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
          <span aria-hidden className="w-px h-5 mx-1 bg-[#e2e8f0]" />
          <ToolbarButton label="Liste à puces" disabled={rawMode} active={editor?.isActive("bulletList")} onClick={() => chain()?.toggleBulletList().run()}><List size={16} /></ToolbarButton>
          <ToolbarButton label="Liste numérotée" disabled={rawMode} active={editor?.isActive("orderedList")} onClick={() => chain()?.toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
          <span aria-hidden className="w-px h-5 mx-1 bg-[#e2e8f0]" />
          <ToolbarButton label="Aligner à gauche" disabled={rawMode} active={editor?.isActive({ textAlign: "left" })} onClick={() => chain()?.setTextAlign("left").run()}><AlignLeft size={16} /></ToolbarButton>
          <ToolbarButton label="Centrer" disabled={rawMode} active={editor?.isActive({ textAlign: "center" })} onClick={() => chain()?.setTextAlign("center").run()}><AlignCenter size={16} /></ToolbarButton>
          <ToolbarButton label="Aligner à droite" disabled={rawMode} active={editor?.isActive({ textAlign: "right" })} onClick={() => chain()?.setTextAlign("right").run()}><AlignRight size={16} /></ToolbarButton>
          <ToolbarButton label="Justifier" disabled={rawMode} active={editor?.isActive({ textAlign: "justify" })} onClick={() => chain()?.setTextAlign("justify").run()}><AlignJustify size={16} /></ToolbarButton>
          <span aria-hidden className="w-px h-5 mx-1 bg-[#e2e8f0]" />
          <label title="Couleur du texte" className={`relative p-1.5 rounded text-[#475569] ${rawMode ? "opacity-40" : "hover:bg-[#f1f5f9] cursor-pointer"}`}>
            <Palette size={16} />
            <input
              type="color"
              aria-label="Couleur du texte"
              disabled={rawMode}
              value={(editor?.getAttributes("textStyle").color as string | undefined) ?? "#0f172a"}
              onChange={(event) => chain()?.setColor(event.target.value).run()}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>
          <span aria-hidden className="w-px h-5 mx-1 bg-[#e2e8f0]" />
          <button
            type="button"
            aria-pressed={rawMode}
            onClick={toggleRawMode}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold cursor-pointer ${rawMode ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
          >
            <Code size={16} />
            HTML brut
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {rawMode ? (
            <div className="flex flex-col h-full">
              <p className="px-5 py-2 text-xs text-[#64748b] bg-[#f8fafc]">
                Ce HTML est envoyé tel quel. En revenant à l&apos;éditeur, la mise en page non gérée par celui-ci est perdue.
              </p>
              <textarea
                aria-label="HTML brut"
                spellCheck={false}
                value={rawHtml}
                onChange={(event) => {
                  bodyEdited.current = true;
                  setRawHtml(event.target.value);
                }}
                className="flex-1 w-full p-5 font-mono text-sm outline-none resize-none"
              />
            </div>
          ) : (
            <EditorContent editor={editor} className="h-full" />
          )}
        </div>

        {files.length > 0 && (
          <ul aria-label="Pièces jointes" className="flex flex-wrap gap-2 px-5 py-2 border-t border-[#e2e8f0]">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 max-w-full rounded bg-[#f1f5f9] px-2 py-1 text-xs">
                <span className="truncate">{file.name}</span>
                <span className="text-[#64748b] whitespace-nowrap">{formatSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${file.name}`}
                  onClick={() => setFiles(files.filter((_, position) => position !== index))}
                  className="cursor-pointer"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p role="alert" className="px-5 py-2 text-sm font-semibold text-red-600 border-t border-[#e2e8f0]">{error}</p>}

        <footer className="flex items-center gap-3 px-5 py-3 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !editor}
            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? "Envoi..." : "Envoyer"}
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            aria-label="Joindre des fichiers"
            onChange={(event) => addFiles(event.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={sending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm font-semibold text-[#475569] hover:bg-[#f1f5f9] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Paperclip size={16} />
            Joindre un fichier
          </button>
          {files.length > 0 && (
            <span className="text-sm text-[#64748b]">
              {files.length} pièce{files.length > 1 ? "s" : ""} jointe{files.length > 1 ? "s" : ""}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
