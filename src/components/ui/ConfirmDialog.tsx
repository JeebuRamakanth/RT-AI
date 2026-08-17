/**
 * ConfirmDialog — accessible confirmation modal for destructive, irreversible
 * actions (permanent delete, empty trash). Renders a focus-trapped dialog
 * with explicit confirm/cancel and Escape-to-close.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="rt-surface-raised relative w-full max-w-md rounded-[var(--radius-2xl)] p-5"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  destructive ? "bg-alert/15 text-alert" : "bg-signal/15 text-signal",
                )}
              >
                <Icon name={destructive ? "alert" : "shield"} size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-sans text-sm font-medium text-pearl">
                  {title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-pearl-muted">{message}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] text-pearl-muted transition-colors hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={cn(
                  "rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2",
                  destructive
                    ? "bg-alert/90 text-ink-950 hover:bg-alert"
                    : "bg-signal text-ink-950 hover:brightness-110",
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
