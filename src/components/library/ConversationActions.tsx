/**
 * ConversationActions — a contextual menu of conversation operations. Only the
 * actions valid for the conversation's current state are shown, so the UI is
 * never overloaded. Actions route through the repository via callbacks the
 * parent supplies (so the same menu works on Home recent cards, the Chat
 * header, and the history library).
 */

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cn } from "@/lib/cn";
import type { ConversationRecord, ConversationBucket } from "@/conversations";

export interface ConversationActionHandlers {
  onOpen?: (id: string) => void;
  onRename?: (id: string) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onMoveToTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentlyDelete?: (id: string) => void;
}

interface ConversationActionsProps {
  conversation: ConversationRecord;
  /** Which list the card lives in — controls which actions appear. */
  bucket: ConversationBucket;
  handlers: ConversationActionHandlers;
  label?: string;
  align?: "left" | "right";
  className?: string;
}

interface ActionDef {
  id: string;
  label: string;
  icon: IconName;
  destructive?: boolean;
  handler: () => void;
}

export function ConversationActions({
  conversation,
  bucket,
  handlers,
  label = "Conversation actions",
  align = "right",
  className,
}: ConversationActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions: ActionDef[] = [];

  if (bucket !== "deleted") {
    if (handlers.onOpen) {
      actions.push({
        id: "open",
        label: "Open",
        icon: "arrow-right",
        handler: () => handlers.onOpen?.(conversation.id),
      });
    }
    if (conversation.pinned) {
      if (handlers.onUnpin) {
        actions.push({ id: "unpin", label: "Unpin", icon: "pin-off", handler: () => handlers.onUnpin?.(conversation.id) });
      }
    } else if (handlers.onPin) {
      actions.push({ id: "pin", label: "Pin", icon: "pin", handler: () => handlers.onPin?.(conversation.id) });
    }
    if (handlers.onRename) {
      actions.push({ id: "rename", label: "Rename", icon: "edit", handler: () => handlers.onRename?.(conversation.id) });
    }
    if (conversation.status === "archived") {
      if (handlers.onUnarchive) {
        actions.push({ id: "unarchive", label: "Unarchive", icon: "archive-restore", handler: () => handlers.onUnarchive?.(conversation.id) });
      }
    } else if (handlers.onArchive) {
      actions.push({ id: "archive", label: "Archive", icon: "archive", handler: () => handlers.onArchive?.(conversation.id) });
    }
    if (handlers.onMoveToTrash) {
      actions.push({
        id: "trash",
        label: "Move to Trash",
        icon: "trash",
        handler: () => handlers.onMoveToTrash?.(conversation.id),
      });
    }
  } else {
    if (handlers.onRestore) {
      actions.push({ id: "restore", label: "Restore", icon: "archive-restore", handler: () => handlers.onRestore?.(conversation.id) });
    }
    if (handlers.onPermanentlyDelete) {
      actions.push({
        id: "delete",
        label: "Delete permanently",
        icon: "trash",
        destructive: true,
        handler: () => handlers.onPermanentlyDelete?.(conversation.id),
      });
    }
  }

  if (actions.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-pearl-faint transition-colors hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rt-surface-raised rounded-[var(--radius-md)] p-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.handler();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] transition-colors",
                a.destructive
                  ? "text-alert hover:bg-alert/10"
                  : "text-pearl-muted hover:bg-ink-800/70 hover:text-pearl",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              <Icon name={a.icon} size={15} className={a.destructive ? "text-alert" : "text-pearl-faint"} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
