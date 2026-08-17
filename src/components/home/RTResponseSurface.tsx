/**
 * RTResponseSurface — the compact assistant response surface that lives inside
 * the RT AI Home command center. It renders streaming output, lifecycle
 * states, errors, and cancellation WITHOUT redesigning the Home. It uses the
 * existing "Quiet Futurism" surface system so it feels native to RT AI.
 *
 * The model label is always honest: development providers are clearly marked
 * "Development" so output is never presented as real production AI.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { RTButton } from "@/components/ui/RTButton";
import { cn } from "@/lib/cn";
import type { AIErrorDescriptor, AIResponse } from "@/ai/types";
import type { ConversationStatus } from "@/hooks/useConversation";

const easing = [0.16, 1, 0.3, 1] as const;

interface RTResponseSurfaceProps {
  status: ConversationStatus;
  /** Final text once completed (may equal streamingText on completion). */
  text: string;
  lastResponse: AIResponse | null;
  lastError: AIErrorDescriptor | null;
  isBusy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

const STATUS_LABEL: Record<ConversationStatus, string> = {
  idle: "",
  preparing: "Preparing",
  thinking: "Thinking",
  streaming: "Streaming",
  completing: "Finishing",
  completed: "Complete",
  error: "Error",
};

export function RTResponseSurface({
  status,
  text,
  lastResponse,
  lastError,
  isBusy,
  onRetry,
  onDismiss,
}: RTResponseSurfaceProps) {
  const visible = isBusy || status === "completed" || status === "error";
  const label = STATUS_LABEL[status];
  const model = lastResponse?.model;
  const isDev = Boolean(model?.development);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.3, ease: easing }}
          className="overflow-hidden"
          aria-live="polite"
        >
          <div
            className={cn(
              "rt-surface rounded-[var(--radius-2xl)] px-4 py-3.5 sm:px-5 sm:py-4",
              status === "error" && "border-alert/40",
            )}
          >
            {/* Status row */}
            <div className="mb-2.5 flex items-center gap-2.5">
              {isBusy && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal/40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
                </span>
              )}
              {status === "completed" && (
                <Icon name="check" size={14} className="text-signal" />
              )}
              {status === "error" && (
                <Icon name="alert" size={14} className="text-alert" />
              )}
              <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-pearl-faint">
                {label}
              </span>
              {model && status !== "error" && (
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-wide",
                    isDev
                      ? "border-signal/30 bg-signal/10 text-signal"
                      : "border-ink-700/60 bg-ink-800/60 text-pearl-muted",
                  )}
                  title={isDev ? "Development provider — not real production AI" : model.label}
                >
                  {isDev && <span className="h-1 w-1 rounded-full bg-signal" />}
                  {isDev ? "Development" : model.label}
                </span>
              )}
              {status === "completed" && (
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss response"
                  className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] text-pearl-faint transition-colors hover:bg-ink-800/70 hover:text-pearl"
                >
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>

            {/* Body */}
            {status === "error" ? (
              <div className="space-y-3">
                <p className="text-[14px] leading-relaxed text-pearl-muted">
                  {lastError?.message ?? "Something went wrong."}
                </p>
                <div className="flex items-center gap-2">
                  {lastError?.retryable && (
                    <RTButton variant="secondary" size="sm" onClick={onRetry}>
                      <Icon name="retry" size={14} />
                      Retry
                    </RTButton>
                  )}
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-[12.5px] text-pearl-faint transition-colors hover:text-pearl"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-pretty text-[14.5px] leading-relaxed text-pearl">
                {text || (isBusy ? "…" : "")}
                {status === "streaming" && (
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-signal/80" />
                )}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
