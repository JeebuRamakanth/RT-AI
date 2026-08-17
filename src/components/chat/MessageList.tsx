/**
 * MessageList — renders the persisted conversation messages plus an in-flight
 * assistant turn. Reuses the canonical ConversationMessage shape. Designed to
 * feel native to the RT AI "Quiet Futurism" surface system — clean
 * typography, subtle dividers, premium spacing.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import type { ConversationMessage } from "@/ai/types";
import type { ConversationLifecycle } from "@/hooks/usePersistedConversation";
import { formatDate } from "@/lib/time";

interface MessageListProps {
  messages: ConversationMessage[];
  lifecycle: ConversationLifecycle;
  streamingText: string;
}

const easing = [0.16, 1, 0.3, 1] as const;

export function MessageList({ messages, lifecycle, streamingText }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest content while streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  // The streaming assistant turn is rendered from the engine state (the last
  // assistant message already carries accumulated deltas), so we don't need a
  // separate ghost bubble — just reflect messages.
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      <ol className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        {messages.map((m, i) => (
          <MessageBubble key={m.id} message={m} index={i} isStreaming={isStreamingAssistant(m, lifecycle, messages)} />
        ))}
        {messages.length === 0 && lifecycle === "idle" && (
          <li className="py-16 text-center text-[13px] text-pearl-faint">
            No messages yet. Start the conversation below.
          </li>
        )}
      </ol>
    </div>
  );
}

function isStreamingAssistant(
  m: ConversationMessage,
  lifecycle: ConversationLifecycle,
  messages: ConversationMessage[],
): boolean {
  const isLast = messages[messages.length - 1]?.id === m.id;
  return (
    isLast &&
    m.role === "assistant" &&
    (lifecycle === "thinking" || lifecycle === "streaming" || lifecycle === "preparing")
  );
}

interface MessageBubbleProps {
  message: ConversationMessage;
  index: number;
  isStreaming: boolean;
}

function MessageBubble({ message, index, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isDev = message.model?.development ?? false;
  const isErrored = message.state === "error";
  const isCancelled = message.state === "cancelled";

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: easing, delay: Math.min(index * 0.02, 0.1) }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex max-w-[88%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-signal/15 text-signal">
              <span className="h-2 w-2 rounded-full bg-signal" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">
              {isDev ? "RT AI · Development" : "RT AI"}
            </span>
          </div>
        )}

        <div
          className={cn(
            "rounded-[var(--radius-2xl)] px-4 py-3 text-[14.5px] leading-relaxed",
            isUser
              ? "bg-signal/12 text-pearl rounded-br-md"
              : "rt-surface text-pearl rounded-bl-md",
            isErrored && "border-alert/40",
          )}
        >
          {isErrored ? (
            <div className="flex items-center gap-2 text-alert">
              <Icon name="alert" size={14} />
              <span className="text-[13.5px]">{message.error?.message ?? "Something went wrong."}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-pretty">
              {message.text || (isStreaming ? "" : "")}
              {isStreaming && (
                <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-signal/80" />
              )}
              {isCancelled && (
                <span className="ml-2 text-[11.5px] text-pearl-faint">(cancelled)</span>
              )}
            </p>
          )}
        </div>

        <div className={cn("flex items-center gap-2 px-1 text-[10.5px] text-pearl-faint", isUser ? "justify-end" : "justify-start")}>
          <span>{formatDate(message.createdAt)}</span>
          {isStreaming && <span className="text-signal">typing…</span>}
        </div>
      </div>
    </motion.li>
  );
}
