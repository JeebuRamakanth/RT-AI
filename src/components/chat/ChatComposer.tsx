/**
 * ChatComposer — the input surface for the Chat workspace. Presentational:
 * owns a typed draft (text + attachment metadata) and exposes an onSubmit
 * contract + isStreaming/onCancel for stop-while-streaming. Performs no
 * backend calls — the parent wires persistence + AI Core through the
 * usePersistedConversation hook.
 *
 * Mirrors the Home Composer's affordances but tuned for the conversation
 * workspace (Enter to send, Shift+Enter newline, attachment previews).
 */

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";

type AttachmentKind = "file" | "image" | "video" | "audio";

interface DraftAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  sizeLabel: string;
}

export interface ChatComposerSubmit {
  text: string;
  attachments: DraftAttachment[];
}

interface ChatComposerProps {
  onSubmit: (draft: ChatComposerSubmit) => void;
  isStreaming?: boolean;
  onCancel?: () => void;
  disabled?: boolean;
}

const PLACEHOLDER = "Continue the conversation…";

function inferKind(mime: string, name: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(name)) return "image";
  if (/\.(mp4|mov|webm|mkv)$/i.test(name)) return "video";
  if (/\.(mp3|wav|m4a|flac|ogg)$/i.test(name)) return "audio";
  return "file";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const kindIcon: Record<AttachmentKind, "file" | "image" | "film" | "mic"> = {
  file: "file",
  image: "image",
  video: "film",
  audio: "mic",
};

export function ChatComposer({ onSubmit, isStreaming = false, onCancel, disabled }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: DraftAttachment[] = Array.from(list).map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
      kind: inferKind(f.type, f.name),
      name: f.name,
      sizeLabel: formatSize(f.size),
    }));
    setAttachments((prev) => [...prev, ...next].slice(0, 8));
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSubmit?.({ text: trimmed, attachments });
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const sendDisabled = !text.trim() && attachments.length === 0;

  return (
    <div className="border-t border-ink-700/40 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-ink-700/60 bg-ink-900/70 py-1.5 pl-2 pr-1.5"
              >
                <Icon name={kindIcon[a.kind]} size={15} className="text-signal" />
                <span className="max-w-[160px] truncate text-[12px] text-pearl">{a.name}</span>
                <span className="text-[11px] text-pearl-faint">{a.sizeLabel}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded text-pearl-faint hover:bg-ink-800 hover:text-pearl"
                  aria-label={`Remove ${a.name}`}
                >
                  <Icon name="close" size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="rt-surface-raised flex items-end gap-2 rounded-[var(--radius-2xl)] p-2 sm:p-3">
          <label
            htmlFor={`${inputId}-file`}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-pearl-muted transition-colors hover:bg-ink-800/70 hover:text-pearl"
            title="Attach a file, image, video, or audio"
          >
            <Icon name="plus" size={20} />
            <span className="sr-only">Attach a file</span>
          </label>
          <input
            id={`${inputId}-file`}
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={PLACEHOLDER}
            aria-label="Compose a message"
            className="max-h-48 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-pearl placeholder:text-pearl-faint focus:outline-none"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
            }}
          />

          <button
            type="button"
            onClick={isStreaming ? onCancel : handleSubmit}
            disabled={isStreaming ? false : disabled || sendDisabled}
            aria-label={isStreaming ? "Stop" : "Send message"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-all duration-200",
              isStreaming
                ? "bg-ink-800 text-pearl hover:bg-ink-700 active:scale-95"
                : "bg-signal text-ink-950 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <Icon name={isStreaming ? "stop" : "send"} size={18} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-pearl-faint">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
