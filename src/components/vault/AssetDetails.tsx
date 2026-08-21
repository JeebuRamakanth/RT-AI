/**
 * AssetDetails — the premium detail experience for a single asset.
 *
 * Full preview, provenance (source conversation/message with an honest
 * "Original conversation deleted" state), tags, collections, version
 * lineage, metadata, and contextual actions. Keyboard: Escape closes.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { AssetPreview } from "@/components/vault/AssetPreview";
import { TYPE_LABELS, useAssetObjectUrl } from "@/components/vault/preview-utils";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/cn";
import { formatBytes, hasBytes, type Asset, type AssetCollection } from "@/assets/types";
import type { AssetActions } from "@/hooks/useAssetActions";

interface AssetDetailsProps {
  asset: Asset | null;
  collections: AssetCollection[];
  actions: AssetActions;
  onClose: () => void;
  onRequestPermanentDelete: (asset: Asset) => void;
}

export function AssetDetails({ asset, collections, actions, onClose, onRequestPermanentDelete }: AssetDetailsProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!asset) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, onClose]);

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${asset.name}`}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rt-surface-raised relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-2xl)]"
          >
            <DetailsBody
              asset={asset}
              collections={collections}
              actions={actions}
              onClose={onClose}
              onRequestPermanentDelete={onRequestPermanentDelete}
              closeRef={closeRef}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailsBody({
  asset,
  collections,
  actions,
  onClose,
  onRequestPermanentDelete,
  closeRef,
}: {
  asset: Asset;
  collections: AssetCollection[];
  actions: AssetActions;
  onClose: () => void;
  onRequestPermanentDelete: (asset: Asset) => void;
  closeRef: React.RefObject<HTMLButtonElement>;
}) {
  const url = useAssetObjectUrl(asset);
  const trashed = asset.deletedAt !== null;
  const [tagDraft, setTagDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(asset.name);

  useEffect(() => {
    setRenaming(false);
    setNameDraft(asset.name);
    setTagDraft("");
  }, [asset.id, asset.name]);

  const downloadable = hasBytes(asset) && url;

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.name;
    a.click();
  }

  function commitRename() {
    setRenaming(false);
    void actions.rename(asset, nameDraft);
  }

  function commitTag() {
    const clean = tagDraft.trim();
    if (clean) void actions.addTag(asset, clean);
    setTagDraft("");
  }

  const assetCollections = collections.filter((c) => asset.collectionIds.includes(c.id));
  const otherCollections = collections.filter((c) => !asset.collectionIds.includes(c.id));

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-ink-800/60 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="rounded-full bg-signal/15 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-signal">
            {TYPE_LABELS[asset.type]}
          </span>
          <span className="truncate text-[12px] text-pearl-faint">{asset.mimeType}</span>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-pearl-muted hover:bg-ink-800/70 hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex max-h-[42vh] items-center justify-center overflow-hidden bg-ink-950/50">
          <AssetPreview asset={asset} mode="full" className="max-h-[42vh]" />
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            {renaming ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                autoFocus
                aria-label="Asset name"
                className="rt-surface w-full rounded-[var(--radius-md)] px-3 py-2 text-[15px] text-pearl focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => !trashed && setRenaming(true)}
                className="group flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                title={trashed ? asset.name : "Rename"}
              >
                <h2 className="break-words font-sans text-[17px] font-medium text-pearl">{asset.name}</h2>
                {!trashed && (
                  <Icon name="edit" size={13} className="shrink-0 text-pearl-faint opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            )}
            <p className="mt-1.5 text-[12.5px] text-pearl-muted">
              {formatBytes(asset.size)} · Created {formatDate(asset.createdAt)} · Updated {formatDate(asset.updatedAt)}
              {asset.version > 1 && ` · Version ${asset.version}`}
            </p>
          </div>

          <section aria-label="Provenance" className="rt-surface rounded-[var(--radius-xl)] px-4 py-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">Source</h3>
            <p className="mt-1.5 text-[13px] capitalize text-pearl">{asset.source}</p>
            {asset.sourceRef.conversationId ? (
              asset.sourceRef.isConversationDeleted ? (
                <p className="mt-1 text-[12.5px] text-pearl-muted">
                  Original conversation deleted — this asset is kept in your vault.
                </p>
              ) : (
                <p className="mt-1 text-[12.5px] text-pearl-muted">
                  From conversation{" "}
                  <span className="text-pearl">“{asset.sourceRef.conversationTitle ?? "Untitled"}”</span>
                  {asset.sourceRef.messageId && " · linked to the originating message"}
                </p>
              )
            ) : (
              <p className="mt-1 text-[12.5px] text-pearl-muted">
                {asset.source === "uploaded"
                  ? "Added directly to the vault — independent of any conversation."
                  : "Not linked to a conversation."}
              </p>
            )}
            {asset.generationMetadata?.prompt && (
              <p className="mt-1.5 line-clamp-2 text-[12px] italic text-pearl-faint">
                “{asset.generationMetadata.prompt}”
              </p>
            )}
          </section>

          {!trashed && (
            <section aria-label="Tags">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">Tags</h3>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink-800/70 px-2.5 py-1 text-[12px] text-pearl-muted"
                  >
                    <Icon name="tag" size={11} className="text-pearl-faint" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => void actions.removeTag(asset, tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="text-pearl-faint transition-colors hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTag();
                  }}
                  onBlur={commitTag}
                  placeholder="Add tag…"
                  aria-label="Add a tag"
                  className="w-24 rounded-full bg-transparent px-2.5 py-1 text-[12px] text-pearl placeholder:text-pearl-faint focus:outline-none"
                />
              </div>
            </section>
          )}

          {!trashed && collections.length > 0 && (
            <section aria-label="Collections">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">Collections</h3>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {assetCollections.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-signal/10 px-2.5 py-1 text-[12px] text-signal"
                  >
                    <Icon name="folder" size={11} />
                    {c.name}
                    <button
                      type="button"
                      onClick={() => void actions.removeFromCollection(asset, c.id)}
                      aria-label={`Remove from ${c.name}`}
                      className="opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </span>
                ))}
                {otherCollections.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) void actions.addToCollection(asset, e.target.value);
                    }}
                    aria-label="Add to collection"
                    className="rounded-full bg-transparent px-2 py-1 text-[12px] text-pearl-faint focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <option value="">+ Add to collection</option>
                    {otherCollections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </section>
          )}

          {Object.keys(asset.metadata).length > 0 && (
            <section aria-label="Metadata">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">Metadata</h3>
              <dl className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="rt-surface rounded-[var(--radius-md)] px-3 py-2">
                    <dt className="text-[10.5px] uppercase tracking-wide text-pearl-faint">{key}</dt>
                    <dd className="mt-0.5 break-words text-[12.5px] text-pearl-muted">
                      {typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                        ? String(value)
                        : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-800/60 px-5 py-3.5">
        {trashed ? (
          <>
            <ActionButton icon="archive-restore" label="Restore" onClick={() => { void actions.restore(asset); onClose(); }} />
            <ActionButton icon="trash" label="Delete permanently" danger onClick={() => onRequestPermanentDelete(asset)} />
          </>
        ) : (
          <>
            <ActionButton
              icon={asset.favorite ? "star-filled" : "star"}
              label={asset.favorite ? "Favorited" : "Favorite"}
              active={asset.favorite}
              onClick={() => void actions.toggleFavorite(asset)}
            />
            {downloadable && <ActionButton icon="download" label="Download" onClick={download} />}
            <ActionButton
              icon={asset.archived ? "archive-restore" : "archive"}
              label={asset.archived ? "Unarchive" : "Archive"}
              onClick={() => void actions.setArchived(asset, !asset.archived)}
            />
            <ActionButton icon="trash" label="Move to Trash" danger onClick={() => { void actions.moveToTrash(asset); onClose(); }} />
          </>
        )}
      </div>
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[12.5px] font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        danger
          ? "text-alert hover:bg-alert/10"
          : active
            ? "bg-signal/15 text-signal"
            : "text-pearl-muted hover:bg-ink-800/70 hover:text-pearl",
      )}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}
