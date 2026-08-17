"use client";

import { useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";

type AttachmentKind = "file" | "image" | "video" | "audio";

interface DraftAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  /** Visual only — no upload is performed. */
  sizeLabel: string;
}

const PLACEHOLDER =
  "Ask anything, drop a file, or describe what to build…";

const easing = [0.16, 1, 0.3, 1] as const;

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

/**
 * RTAIComposer — the central command input.
 *
 * Architecture note: This component owns a typed draft state (text +
 * attachments) and exposes a clear `onSubmit` contract, but performs NO
 * backend calls. The "submit" affordance is wired to a callback that
 * future steps connect to real AI/agent services. Until then, submitting
 * surfaces a non-fake "not yet connected" affordance via the parent.
 */
export interface RTAIComposerSubmit {
  text: string;
  attachments: DraftAttachment[];
}

interface RTAIComposerProps {
  onSubmit?: (draft: RTAIComposerSubmit) => void;
  disabled?: boolean;
}

export function RTAIComposer({ onSubmit, disabled }: RTAIComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
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
    // Note: we intentionally do not clear state here unless the parent
    // confirms acceptance. For the current step (no backend), the parent
    // will surface a "not connected" state, so we keep the draft.
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: easing, delay: 0.18 }}
      className="relative"
    >
      {/* Glow when focused */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-1 rounded-[var(--radius-3xl)] transition-opacity duration-500",
          focused ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(60% 60% at 50% 100%, rgb(var(--signal)/0.18), transparent 70%)",
        }}
        aria-hidden
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-3xl)] rt-surface-raised transition-all duration-300",
          focused && "shadow-glow",
          dragging && "ring-2 ring-signal/60",
        )}
      >
        {/* Drop overlay */}
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-3xl)] bg-ink-950/80 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 text-signal">
                <Icon name="attach" size={22} />
                <span className="text-sm font-medium">Drop to attach</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachments row */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {attachments.map((a) => (
              <motion.span
                layout
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-ink-700/60 bg-ink-900/70 py-1.5 pl-2 pr-1.5"
              >
                <Icon name={kindIcon[a.kind]} size={15} className="text-signal" />
                <span className="max-w-[160px] truncate text-[12px] text-pearl">
                  {a.name}
                </span>
                <span className="text-[11px] text-pearl-faint">{a.sizeLabel}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded text-pearl-faint hover:bg-ink-800 hover:text-pearl"
                  aria-label={`Remove ${a.name}`}
                >
                  <Icon name="close" size={13} />
                </button>
              </motion.span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-3 sm:p-4">
          <label
            htmlFor={`${inputId}-file`}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-xl)] text-pearl-muted transition-colors hover:bg-ink-800/70 hover:text-pearl"
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            placeholder={PLACEHOLDER}
            aria-label="Compose a request to RT AI"
            className={cn(
              "max-h-48 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-pearl",
              "placeholder:text-pearl-faint focus:outline-none",
            )}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
            }}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            aria-label="Send to RT AI"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-xl)] transition-all duration-200",
              "bg-signal text-ink-950 shadow-[0_0_28px_-8px_rgb(var(--signal-glow)/0.7)]",
              "hover:brightness-110 active:scale-95",
              "disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <Icon name="send" size={18} />
          </button>
        </div>

        {/* Footer affordances — clearly scoped as future capabilities */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-700/40 px-4 py-2.5">
          <div className="flex items-center gap-1">
            <ComposerChip icon="mic" label="Voice" />
            <ComposerChip icon="image" label="Image" />
            <ComposerChip icon="globe" label="Web" />
          </div>
          <span className="hidden text-[11px] text-pearl-faint sm:inline">
            Enter to send · Shift+Enter for newline
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ComposerChip({ icon, label }: { icon: "mic" | "image" | "globe"; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-pearl-faint"
      title={`${label} — coming soon`}
    >
      <Icon name={icon} size={14} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
