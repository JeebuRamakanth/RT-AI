/**
 * Toast surface — lightweight, ephemeral notifications with an optional
 * undo affordance. Used for low-risk destructive actions ("Moved to Trash —
 * Undo") instead of forcing confirmation for every delete.
 *
 * Toasts live in a portal-less fixed container and auto-dismiss after a
 * timeout unless an action is hovered/focused.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface ToastContextValue {
  notify: (message: string, undo?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, undo?: () => void) => {
      const id = ++toastSeq;
      const toast: Toast = { id, message, undo };
      setToasts((prev) => [...prev, toast]);
      const lifetime = 6000;
      window.setTimeout(() => dismiss(id), lifetime);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rt-surface-raised pointer-events-auto flex items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3"
            >
              <span className="text-[13px] text-pearl">{t.message}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => {
                    t.undo?.();
                    dismiss(t.id);
                  }}
                  className="text-[12.5px] font-medium text-signal transition-colors hover:text-signal-glow focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-pearl-faint hover:bg-ink-800/70 hover:text-pearl"
              >
                <Icon name="close" size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
