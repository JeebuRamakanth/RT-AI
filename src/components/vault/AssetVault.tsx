/**
 * AssetVault — the vault module surface. Orchestrates toolbar, filters,
 * grid, search results, details dialog, upload (picker + drag & drop),
 * collections, and destructive confirmations. State lives in the
 * useAssetVault / useAssetActions hooks; this component stays presentational.
 */

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AssetToolbar } from "@/components/vault/AssetToolbar";
import { AssetFilters } from "@/components/vault/AssetFilters";
import { AssetGrid } from "@/components/vault/AssetGrid";
import { AssetDetails } from "@/components/vault/AssetDetails";
import { AssetUpload, type AssetUploadHandle } from "@/components/vault/AssetUpload";
import { useAssetVault } from "@/hooks/useAssetVault";
import { useAssetActions } from "@/hooks/useAssetActions";
import { useAssetStore } from "@/assets/store";
import { cn } from "@/lib/cn";
import type { Asset } from "@/assets/types";

export function AssetVault() {
  const vault = useAssetVault();
  const actions = useAssetActions();
  const { storagePersistent } = useAssetStore();
  const uploadRef = useRef<AssetUploadHandle>(null);

  const [selected, setSelected] = useState<Asset | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Asset | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const searching = vault.searchQuery.trim().length > 0;
  const filtered =
    vault.filters.type !== "all" ||
    vault.filters.source !== "all" ||
    vault.filters.collectionId !== null;

  const openPicker = useCallback(() => uploadRef.current?.openPicker(), []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) void actions.uploadFiles(files, "vault-drop");
  }

  const displayed = searching ? (vault.search?.hits.map((h) => h.asset) ?? []) : vault.assets;

  return (
    <div
      className="relative space-y-6 pb-10"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight tracking-tight text-pearl">
            Asset Vault
          </h1>
          <p className="mt-1.5 text-[13.5px] text-pearl-muted">
            A permanent library for everything RT AI creates or understands — independent of any conversation.
          </p>
        </div>
      </header>

      <AssetToolbar
        searchQuery={vault.searchQuery}
        onSearchChange={vault.setSearchQuery}
        onSearchClear={vault.clearSearch}
        searching={vault.searching}
        onUpload={openPicker}
        storagePersistent={storagePersistent}
      />

      <AssetFilters
        filters={vault.filters}
        counts={vault.counts}
        collections={vault.collections}
        onChange={vault.setFilters}
      />

      {searching && (
        <p className="px-1 text-[12px] text-pearl-faint" role="status">
          {vault.searching
            ? "Searching the vault…"
            : `${vault.search?.total ?? 0} ${(vault.search?.total ?? 0) === 1 ? "result" : "results"} across all assets, including trash`}
        </p>
      )}

      <AssetGrid
        assets={displayed}
        loading={vault.loading && !searching}
        error={vault.error}
        view={vault.filters.view}
        filtered={filtered || searching}
        onOpen={setSelected}
        onToggleFavorite={(asset) => void actions.toggleFavorite(asset)}
        onUpload={openPicker}
        onRetry={() => void vault.refresh()}
        onResetFilters={() => {
          vault.resetFilters();
          vault.clearSearch();
        }}
      />

      {vault.filters.view === "trash" && vault.assets.length > 0 && !searching && (
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-[11px] text-pearl-faint">
            Assets in Trash can be restored. Permanent deletion removes the file and its record.
          </span>
          <button
            type="button"
            onClick={() => setConfirmEmptyTrash(true)}
            className="rounded-[var(--radius-md)] px-3 py-1.5 text-[12.5px] text-alert transition-colors hover:bg-alert/10 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Empty Trash
          </button>
        </div>
      )}

      {!searching && (
        <section aria-label="Collections" className="space-y-2.5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-pearl-faint">Collections</h2>
          <div className="flex flex-wrap items-center gap-2">
            {vault.collections.map((c) => {
              const active = vault.filters.collectionId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => vault.setFilters({ collectionId: active ? null : c.id })}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2",
                    active ? "bg-signal/15 text-signal" : "rt-surface text-pearl-muted hover:text-pearl",
                  )}
                >
                  <Icon name="folder" size={13} />
                  {c.name}
                </button>
              );
            })}
            <input
              value={collectionDraft}
              onChange={(e) => setCollectionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && collectionDraft.trim()) {
                  void actions.createCollection(collectionDraft);
                  setCollectionDraft("");
                }
              }}
              placeholder="New collection…"
              aria-label="Create a collection"
              className="w-36 rounded-full bg-transparent px-3 py-1.5 text-[12.5px] text-pearl placeholder:text-pearl-faint focus:outline-none focus:ring-1 focus:ring-ink-700"
            />
          </div>
        </section>
      )}

      <AssetDetails
        asset={selected}
        collections={vault.collections}
        actions={actions}
        onClose={() => setSelected(null)}
        onRequestPermanentDelete={(asset) => setConfirmDelete(asset)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete permanently?"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" and its stored file will be permanently deleted. Conversations that reference it keep their history. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (confirmDelete) {
            void actions.permanentlyDelete(confirmDelete);
            setSelected(null);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmEmptyTrash}
        title="Empty Trash?"
        message="All assets in Trash will be permanently deleted, including their stored files. This cannot be undone."
        confirmLabel="Empty Trash"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          void actions.emptyTrash();
          setConfirmEmptyTrash(false);
        }}
        onCancel={() => setConfirmEmptyTrash(false)}
      />

      <AssetUpload ref={uploadRef} onFiles={(files) => void actions.uploadFiles(files, "vault")} />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[105] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
            aria-hidden
          >
            <div className="rt-surface-raised flex flex-col items-center gap-3 rounded-[var(--radius-2xl)] px-10 py-8">
              <Icon name="upload" size={28} className="text-signal" />
              <p className="text-[14px] text-pearl">Drop files to add them to your vault</p>
              <p className="text-[12px] text-pearl-faint">Images, videos, audio, documents, code — anything.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
