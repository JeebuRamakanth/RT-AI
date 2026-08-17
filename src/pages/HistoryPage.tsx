/**
 * HistoryPage — the conversation library. Surfaces Pinned, Recent, Archived,
 * and Trash, plus search across persisted conversations and messages. Uses
 * the existing RT AI design system (Section, EmptyState, surface utilities).
 *
 * Search runs against the repository (not the rendered list), so it finds
 * any persisted conversation — including archived ones — by title, preview,
 * tags, or message content.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchBar } from "@/components/library/SearchBar";
import { ConversationRow } from "@/components/library/ConversationRow";
import { useConversationLists } from "@/hooks/useConversationLists";
import { useLibraryActions } from "@/hooks/useLibraryActions";
import { useConversationStore } from "@/conversations/store";
import { cn } from "@/lib/cn";
import type { ConversationBucket } from "@/conversations/types";

type Tab = "recent" | "pinned" | "archived" | "trash";

const TABS: Array<{ id: Tab; label: string; icon: "clock" | "pin" | "archive" | "trash"; bucket: ConversationBucket }> = [
  { id: "recent", label: "Recent", icon: "clock", bucket: "recent" },
  { id: "pinned", label: "Pinned", icon: "pin", bucket: "pinned" },
  { id: "archived", label: "Archived", icon: "archive", bucket: "archived" },
  { id: "trash", label: "Trash", icon: "trash", bucket: "deleted" },
];

export function HistoryPage() {
  const lists = useConversationLists();
  const actions = useLibraryActions();
  const { repository, owner, bump } = useConversationStore();
  const [tab, setTab] = useState<Tab>("recent");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "emptyTrash"; title: string; message: string }
    | { kind: "permanentDelete"; id: string; title: string; message: string }
    | null
  >(null);

  const counts = useMemo(
    () => ({
      recent: lists.recent.length,
      pinned: lists.pinned.length,
      archived: lists.archived.length,
      trash: lists.deleted.length,
    }),
    [lists.recent.length, lists.pinned.length, lists.archived.length, lists.deleted.length],
  );

  const searching = lists.searchQuery.trim().length > 0;
  const current = TABS.find((t) => t.id === tab)!;

  function emptyState(bucket: ConversationBucket) {
    switch (bucket) {
      case "pinned":
        return {
          icon: "pin" as const,
          title: "No pinned conversations",
          message: "Pin a conversation to keep it close at hand — it stays here even as new ones come in.",
        };
      case "archived":
        return {
          icon: "archive" as const,
          title: "Nothing archived",
          message: "Archived conversations stay searchable and recoverable, but out of your recent view.",
        };
      case "deleted":
        return {
          icon: "trash" as const,
          title: "Trash is empty",
          message: "Deleted conversations land here first. Restore them, or remove them permanently.",
        };
      default:
        return {
          icon: "clock" as const,
          title: "No conversations yet",
          message: "Start something from Home and it will appear here, ready to continue.",
        };
    }
  }

  async function confirmEmptyTrash() {
    setConfirm(null);
    const n = await repository.emptyTrash(owner.id);
    bump();
    void n;
  }

  async function confirmPermanentDelete() {
    if (confirm?.kind !== "permanentDelete") return;
    await repository.permanentlyDelete(confirm.id);
    bump();
    setConfirm(null);
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight tracking-tight text-pearl">
            Conversation library
          </h1>
          <p className="mt-1.5 text-[13.5px] text-pearl-muted">
            Every conversation is saved — pinned, recent, archived, or in trash. Searchable across messages.
          </p>
        </div>
        <Link to="/" className="self-start sm:self-end">
          <Button variant="secondary" size="sm">
            <Icon name="plus" size={14} />
            New conversation
          </Button>
        </Link>
      </header>

      <SearchBar
        value={lists.searchQuery}
        onChange={lists.setQuery}
        onClear={lists.clearSearch}
        loading={lists.searching}
      />

      {searching ? (
        <SearchResults />
      ) : (
        <>
          <nav aria-label="Library sections" className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2",
                    active ? "bg-ink-800/80 text-pearl" : "text-pearl-muted hover:bg-ink-800/50 hover:text-pearl",
                  )}
                >
                  <Icon name={t.icon} size={15} className={active ? "text-signal" : "text-pearl-faint"} />
                  {t.label}
                  <span className="text-[11px] text-pearl-faint">{counts[t.id]}</span>
                </button>
              );
            })}
          </nav>

          <motion.section layout className="rt-surface rounded-[var(--radius-2xl)] p-2">
            <RenderBucket
              bucket={current.bucket}
              loading={lists.loading}
              renamingId={renamingId}
              onRenameStart={(id) => setRenamingId(id)}
              onRenameCancel={() => setRenamingId(null)}
              actions={actions}
              lists={lists}
              empty={emptyState(current.bucket)}
              onEmptyTrash={() =>
                setConfirm({
                  kind: "emptyTrash",
                  title: "Empty Trash?",
                  message: "All conversations in Trash will be permanently deleted. Generated assets are kept in the vault. This cannot be undone.",
                })
              }
              onPermanentDelete={(id, title) =>
                setConfirm({
                  kind: "permanentDelete",
                  id,
                  title: "Delete permanently?",
                  message: `"${title}" will be permanently deleted. Any generated assets it references remain available in the vault. This cannot be undone.`,
                })
              }
            />
          </motion.section>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.kind === "emptyTrash" ? "Empty Trash" : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (confirm?.kind === "emptyTrash") void confirmEmptyTrash();
          else void confirmPermanentDelete();
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function RenderBucket(props: {
  bucket: ConversationBucket;
  loading: boolean;
  renamingId: string | null;
  onRenameStart: (id: string) => void;
  onRenameCancel: () => void;
  actions: ReturnType<typeof useLibraryActions>;
  lists: ReturnType<typeof useConversationLists>;
  empty: { icon: "clock" | "pin" | "archive" | "trash"; title: string; message: string };
  onEmptyTrash: () => void;
  onPermanentDelete: (id: string, title: string) => void;
}) {
  const { bucket, loading, lists, actions, empty } = props;
  const items =
    bucket === "recent" ? lists.recent :
    bucket === "pinned" ? lists.pinned :
    bucket === "archived" ? lists.archived :
    lists.deleted;

  if (loading) {
    return <div className="px-4 py-8"><LoadingState label="Loading conversations" /></div>;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        message={empty.message}
        action={
          bucket === "deleted" ? null : (
            <Link to="/">
              <Button variant="secondary" size="sm">
                <Icon name="home" size={14} />
                Go to Home
              </Button>
            </Link>
          )
        }
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((c) => (
        <ConversationRow
          key={c.id}
          conversation={c}
          bucket={bucket}
          renaming={props.renamingId === c.id}
          onRenameStart={props.onRenameStart}
          onRenameCancel={props.onRenameCancel}
          handlers={{
            onOpen: actions.onOpen,
            onPin: actions.onPin,
            onUnpin: actions.onUnpin,
            onArchive: actions.onArchive,
            onUnarchive: actions.onUnarchive,
            onMoveToTrash: actions.onMoveToTrash,
            onRestore: actions.onRestore,
            onPermanentlyDelete: (id) => props.onPermanentDelete(id, c.title),
            onRenameCommit: actions.renameCommit,
          }}
        />
      ))}
      {bucket === "deleted" && items.length > 0 && (
        <li className="mt-2 flex items-center justify-between gap-3 px-3 py-2">
          <span className="text-[11px] text-pearl-faint">
            Conversations in Trash can be restored. Generated assets are kept.
          </span>
          <button
            type="button"
            onClick={props.onEmptyTrash}
            className="rounded-[var(--radius-md)] px-3 py-1.5 text-[12.5px] text-alert transition-colors hover:bg-alert/10 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Empty Trash
          </button>
        </li>
      )}
    </ul>
  );
}

function SearchResults() {
  const lists = useConversationLists();
  const actions = useLibraryActions();
  const { search, searching, searchQuery } = lists;

  if (searching) {
    return (
      <div className="rt-surface rounded-[var(--radius-2xl)] px-4 py-8">
        <LoadingState label="Searching" />
      </div>
    );
  }
  if (!search || search.hits.length === 0) {
    return (
      <EmptyState
        icon="search"
        title="No matches"
        message={`Nothing found for "${searchQuery}". Try a different title, message, or tag.`}
      />
    );
  }
  return (
    <section className="rt-surface rounded-[var(--radius-2xl)] p-2">
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-pearl-faint">
        {search.total} {search.total === 1 ? "result" : "results"}
      </div>
      <ul className="flex flex-col">
        {search.hits.map((hit) => (
          <li key={hit.conversation.id} className="px-2">
            <SearchHitRow hit={hit} actions={actions} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SearchHitRow({
  hit,
  actions,
}: {
  hit: { conversation: import("@/conversations/types").ConversationRecord; matchedField: string; snippet?: string };
  actions: ReturnType<typeof useLibraryActions>;
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <ConversationRow
      conversation={hit.conversation}
      bucket="recent"
      renaming={renaming}
      onRenameStart={() => setRenaming(true)}
      onRenameCancel={() => setRenaming(false)}
      handlers={{
        onOpen: actions.onOpen,
        onPin: actions.onPin,
        onUnpin: actions.onUnpin,
        onArchive: actions.onArchive,
        onUnarchive: actions.onUnarchive,
        onMoveToTrash: actions.onMoveToTrash,
        onRestore: actions.onRestore,
        onPermanentlyDelete: actions.onPermanentlyDelete,
        onRenameCommit: actions.renameCommit,
      }}
    />
  );
}
