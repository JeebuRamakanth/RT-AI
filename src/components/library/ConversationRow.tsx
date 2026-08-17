/**
 * ConversationRow — a single conversation in a library list. Shows title,
 * preview, relative time, pinned state, status badge, and a contextual
 * actions menu. Supports inline rename via keyboard.
 *
 * Designed for the existing RT AI surface system: subtle dividers, premium
 * hover states, accessible focus.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/time";
import type { ConversationRecord, ConversationBucket } from "@/conversations";
import { ConversationActions, type ConversationActionHandlers } from "@/components/library/ConversationActions";

interface ConversationRowProps {
  conversation: ConversationRecord;
  bucket: ConversationBucket;
  handlers: ConversationActionHandlers & {
    onRenameCommit?: (id: string, title: string) => Promise<void> | void;
  };
  renaming?: boolean;
  onRenameStart?: (id: string) => void;
  onRenameCancel?: () => void;
}

export function ConversationRow({
  conversation,
  bucket,
  handlers,
  renaming = false,
  onRenameStart,
  onRenameCancel,
}: ConversationRowProps) {
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(conversation.title);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming, conversation.title]);

  async function commitRename() {
    const next = draft.trim();
    if (!next || next === conversation.title) {
      onRenameCancel?.();
      return;
    }
    await handlers.onRenameCommit?.(conversation.id, next);
    onRenameCancel?.();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onRenameCancel?.();
    }
  }

  const statusLabel =
    conversation.status === "archived"
      ? "Archived"
      : conversation.status === "deleted"
        ? "In Trash"
        : conversation.pinned
          ? "Pinned"
          : "Active";

  return (
    <motion.li
      layout
      className={cn(
        "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 transition-colors",
        "hover:bg-ink-800/50",
        renaming && "bg-ink-800/40",
      )}
    >
      {/* Pinned indicator */}
      {conversation.pinned && bucket !== "deleted" && (
        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-signal" aria-hidden />
      )}

      <Link
        to={`/chat/${conversation.id}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
        aria-label={`Open conversation: ${conversation.title}`}
        onClick={(e) => renaming && e.preventDefault()}
      >
        {renaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => void commitRename()}
            aria-label="Rename conversation"
            className="w-full rounded-[var(--radius-sm)] border border-signal/40 bg-ink-950/60 px-2 py-1 text-[13.5px] font-medium text-pearl focus:border-signal focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium text-pearl">
              {conversation.title || "Untitled"}
            </span>
            {conversation.titleAuto && (
              <span className="shrink-0 text-[9.5px] uppercase tracking-[0.14em] text-pearl-faint">
                auto
              </span>
            )}
            {conversation.pinned && bucket !== "deleted" && (
              <Icon name="pin" size={12} className="shrink-0 text-signal" aria-label="Pinned" />
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[11.5px] text-pearl-faint">
          <span className="truncate">
            {conversation.preview || "No messages yet"}
          </span>
          <span className="text-pearl-faint/50">·</span>
          <span className="shrink-0">{formatRelativeTime(conversation.lastMessageAt)}</span>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden text-[10px] uppercase tracking-[0.14em] text-pearl-faint sm:inline">
          {statusLabel}
        </span>
        {renaming ? (
          <>
            <button
              type="button"
              onClick={() => void commitRename()}
              aria-label="Save name"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-signal hover:bg-ink-800/70 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="check" size={16} />
            </button>
            <button
              type="button"
              onClick={onRenameCancel}
              aria-label="Cancel rename"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-pearl-faint hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="close" size={16} />
            </button>
          </>
        ) : (
          <ConversationActions
            conversation={conversation}
            bucket={bucket}
            handlers={{ ...handlers, onRename: onRenameStart }}
            label={`Actions for ${conversation.title}`}
          />
        )}
      </div>
    </motion.li>
  );
}
