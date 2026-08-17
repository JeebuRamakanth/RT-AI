/**
 * ChatPage — the conversation workspace. Loads a persisted conversation by id
 * (or starts a fresh one when no id is given), renders messages, streams the
 * assistant, and exposes pin/archive/rename/history through the same design
 * system as Home. Continuation works because the persisted canonical messages
 * are hydrated into the AI Core context.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageList } from "@/components/chat/MessageList";
import { ConversationActions } from "@/components/library/ConversationActions";
import {
  usePersistedConversation,
  type ConversationLifecycle,
} from "@/hooks/usePersistedConversation";
import { useLibraryActions } from "@/hooks/useLibraryActions";
import { useConversationStore } from "@/conversations/useStore";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/cn";

const easing = [0.16, 1, 0.3, 1] as const;

export function ChatPage() {
  const params = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const conversation = usePersistedConversation("chat-workspace");
  const actions = useLibraryActions();
  const { bump } = useConversationStore();
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load the requested conversation when the route id changes.
  useEffect(() => {
    if (params.conversationId) {
      void conversation.load(params.conversationId);
    } else {
      conversation.startFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.conversationId]);

  // Sync title draft when conversation loads.
  useEffect(() => {
    if (conversation.conversation) setDraftTitle(conversation.conversation.title);
  }, [conversation.conversation?.id, conversation.conversation?.title]);

  // After sending on a fresh /chat route (no id), navigate to the persisted id.
  useEffect(() => {
    if (!params.conversationId && conversation.conversationId && conversation.conversation) {
      navigate(`/chat/${conversation.conversationId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.conversationId]);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  async function commitRename() {
    const next = draftTitle.trim();
    if (!next || !conversation.conversation) {
      setRenaming(false);
      setDraftTitle(conversation.conversation?.title ?? "");
      return;
    }
    if (next !== conversation.conversation.title) {
      await conversation.rename(next);
      bump();
    }
    setRenaming(false);
  }

  function handleRenameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenaming(false);
      setDraftTitle(conversation.conversation?.title ?? "");
    }
  }

  const statusLabel = lifecycleLabel(conversation.lifecycle);

  const headerActions = useMemo(
    () => ({
      onPin: async (id: string) => {
        await actions.onPin?.(id);
      },
      onUnpin: async (id: string) => {
        await actions.onUnpin?.(id);
      },
      onArchive: async (id: string) => {
        await actions.onArchive?.(id);
        navigate("/history");
      },
      onMoveToTrash: async (id: string) => {
        await actions.onMoveToTrash?.(id);
        navigate("/history");
      },
    }),
    [actions, navigate],
  );

  if (params.conversationId && !conversation.conversation && conversation.lifecycle === "idle") {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingState label="Loading conversation" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easing }}
      className="flex h-[calc(100vh-var(--header-h)-1.5rem)] flex-col"
    >
      {/* Conversation header */}
      <header className="flex items-center gap-3 border-b border-ink-700/40 pb-3">
        <Link
          to="/history"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-pearl-muted transition-colors hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Back to conversation library"
        >
          <Icon name="back" size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          {renaming && conversation.conversation ? (
            <input
              ref={renameInputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleRenameKey}
              onBlur={() => void commitRename()}
              aria-label="Rename conversation"
              className="w-full max-w-md rounded-[var(--radius-sm)] border border-signal/40 bg-ink-950/60 px-2 py-1 font-display text-[1.3rem] leading-tight text-pearl focus:border-signal focus:outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-[clamp(1.3rem,2.6vw,1.8rem)] leading-tight tracking-tight text-pearl">
                {conversation.conversation?.title ?? "New conversation"}
              </h1>
              {conversation.conversation?.pinned && (
                <Icon name="pin" size={13} className="shrink-0 text-signal" aria-label="Pinned" />
              )}
              {conversation.conversation?.titleAuto && (
                <span className="shrink-0 text-[9.5px] uppercase tracking-[0.14em] text-pearl-faint">auto</span>
              )}
            </div>
          )}
          {conversation.conversation && (
            <p className="mt-0.5 text-[11.5px] text-pearl-faint">
              {conversation.messages.length} messages · {formatDate(conversation.conversation.lastMessageAt)}
            </p>
          )}
        </div>

        {/* Live status */}
        {conversation.isBusy && (
          <span className="hidden items-center gap-2 rounded-full border border-ink-700/50 bg-ink-900/60 px-3 py-1.5 text-[12px] text-pearl-muted sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            {statusLabel}
          </span>
        )}

        {/* Header actions */}
        {conversation.conversation && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              aria-label="Rename conversation"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-pearl-muted transition-colors hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                const id = conversation.conversation?.id;
                if (!id) return;
                if (conversation.conversation?.pinned) void headerActions.onUnpin(id);
                else void headerActions.onPin(id);
              }}
              aria-label={conversation.conversation?.pinned ? "Unpin conversation" : "Pin conversation"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-ink-800/70 focus-visible:outline-2 focus-visible:outline-offset-2",
                conversation.conversation?.pinned ? "text-signal" : "text-pearl-muted hover:text-pearl",
              )}
            >
              <Icon name={conversation.conversation?.pinned ? "pin-off" : "pin"} size={16} />
            </button>
            {conversation.conversation && (
              <ConversationActions
                conversation={conversation.conversation}
                bucket="recent"
                handlers={headerActions}
                label="Conversation actions"
              />
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <MessageList
        messages={conversation.messages.map((s) => s.message)}
        lifecycle={conversation.lifecycle}
        streamingText={conversation.streamingText}
      />

      {/* Error / retry banner */}
      {conversation.lifecycle === "error" && conversation.lastError && (
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="mb-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-alert/40 bg-alert/10 px-3 py-2.5">
            <Icon name="alert" size={15} className="shrink-0 text-alert" />
            <span className="flex-1 text-[13px] text-pearl-muted">{conversation.lastError.message}</span>
            {conversation.lastError.retryable && (
              <button
                type="button"
                onClick={() => void conversation.retry()}
                className="text-[12.5px] font-medium text-signal hover:text-signal-glow focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Honest development-core affordance */}
      {conversation.lifecycle === "idle" && conversation.messages.length === 0 && (
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p className="mb-2 flex items-center gap-2 text-[12px] text-pearl-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-pearl-faint" />
            Live development core. Real providers connect through a secure backend in a later step.
          </p>
        </div>
      )}

      {/* Composer */}
      <ChatComposer
        isStreaming={conversation.isBusy}
        onCancel={conversation.cancel}
        onSubmit={(draft) => {
          void conversation.send({
            text: draft.text,
            attachments: draft.attachments.map((a) => ({
              id: a.id,
              kind: a.kind,
              name: a.name,
              mime: "",
              size: 0,
            })),
          });
        }}
      />
    </motion.div>
  );
}

function lifecycleLabel(lifecycle: ConversationLifecycle): string {
  switch (lifecycle) {
    case "preparing":
      return "Preparing";
    case "thinking":
      return "Thinking";
    case "streaming":
      return "Streaming";
    case "completing":
      return "Finishing";
    default:
      return "";
  }
}
