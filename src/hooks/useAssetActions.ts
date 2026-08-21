/**
 * useAssetActions — vault mutation handlers wired to toast notifications
 * with undo where the action is safely reversible (trash, archive), and
 * repository events flowing through the shared revision bump.
 */

import { useCallback } from "react";
import { useAssetStore, useVaultOwner } from "@/assets/store";
import { useToast } from "@/components/ui/Toast";
import { typeFromMime, type Asset, type UploadMetadata } from "@/assets/types";

export interface UploadResult {
  uploaded: Asset[];
  failed: string[];
}

export function useAssetActions() {
  const { repository, storage, bump } = useAssetStore();
  const owner = useVaultOwner();
  const { notify } = useToast();

  /**
   * Upload real files: bytes go to AssetStorage, metadata to the
   * repository. No file type is faked as previewable — the UI decides
   * preview honestly from the stored MIME/type.
   */
  const uploadFiles = useCallback(
    async (files: File[], origin: UploadMetadata["origin"] = "vault"): Promise<UploadResult> => {
      const uploaded: Asset[] = [];
      const failed: string[] = [];
      for (const file of files) {
        try {
          const ref = `blob:${owner.id}:${file.name}:${crypto.randomUUID()}`;
          await storage.put(ref, file, file.type || "application/octet-stream");
          const asset = await repository.register({
            ownerId: owner.id,
            name: file.name,
            type: typeFromMime(file.type || "", file.name),
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            source: "uploaded",
            storageReference: ref,
            status: "ready",
            uploadMetadata: { originalFileName: file.name, origin },
          });
          uploaded.push(asset);
        } catch {
          failed.push(file.name);
        }
      }
      bump();
      if (uploaded.length > 0) {
        notify(
          uploaded.length === 1
            ? `"${uploaded[0].name}" added to the vault`
            : `${uploaded.length} files added to the vault`,
        );
      }
      if (failed.length > 0) {
        notify(`${failed.length} ${failed.length === 1 ? "file" : "files"} could not be stored`);
      }
      return { uploaded, failed };
    },
    [repository, storage, owner.id, bump, notify],
  );

  const toggleFavorite = useCallback(
    async (asset: Asset) => {
      await repository.setFavorite(asset.id, !asset.favorite);
      bump();
    },
    [repository, bump],
  );

  const rename = useCallback(
    async (asset: Asset, name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === asset.name) return;
      await repository.update(asset.id, { name: trimmed });
      bump();
      notify("Asset renamed");
    },
    [repository, bump, notify],
  );

  const setArchived = useCallback(
    async (asset: Asset, archived: boolean) => {
      await repository.setArchived(asset.id, archived);
      bump();
      if (archived) {
        notify("Asset archived", async () => {
          await repository.setArchived(asset.id, false);
          bump();
        });
      } else {
        notify("Asset restored from archive");
      }
    },
    [repository, bump, notify],
  );

  const addTag = useCallback(
    async (asset: Asset, tag: string) => {
      const clean = tag.trim().replace(/^#/, "");
      if (!clean) return;
      await repository.addTag(asset.id, clean);
      bump();
    },
    [repository, bump],
  );

  const removeTag = useCallback(
    async (asset: Asset, tag: string) => {
      await repository.removeTag(asset.id, tag);
      bump();
    },
    [repository, bump],
  );

  const addToCollection = useCallback(
    async (asset: Asset, collectionId: string) => {
      await repository.addToCollection(asset.id, collectionId);
      bump();
      notify("Added to collection");
    },
    [repository, bump, notify],
  );

  const removeFromCollection = useCallback(
    async (asset: Asset, collectionId: string) => {
      await repository.removeFromCollection(asset.id, collectionId);
      bump();
    },
    [repository, bump],
  );

  const createCollection = useCallback(
    async (name: string): Promise<void> => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await repository.createCollection({ ownerId: owner.id, name: trimmed });
      bump();
      notify(`Collection "${trimmed}" created`);
    },
    [repository, owner.id, bump, notify],
  );

  const moveToTrash = useCallback(
    async (asset: Asset) => {
      await repository.moveToTrash(asset.id);
      bump();
      notify("Asset moved to Trash", async () => {
        await repository.restore(asset.id);
        bump();
      });
    },
    [repository, bump, notify],
  );

  const restore = useCallback(
    async (asset: Asset) => {
      await repository.restore(asset.id);
      bump();
      notify("Asset restored");
    },
    [repository, bump, notify],
  );

  /** Permanent delete removes metadata AND bytes. Irreversible — confirm first. */
  const permanentlyDelete = useCallback(
    async (asset: Asset) => {
      if (asset.storageReference) {
        await storage.delete(asset.storageReference).catch(() => undefined);
      }
      if (asset.thumbnailReference) {
        await storage.delete(asset.thumbnailReference).catch(() => undefined);
      }
      await repository.permanentlyDelete(asset.id);
      bump();
      notify("Asset permanently deleted");
    },
    [repository, storage, bump, notify],
  );

  const emptyTrash = useCallback(async (): Promise<number> => {
    const trash = await repository.list({ ownerId: owner.id, trashOnly: true, limit: 10_000 });
    for (const asset of trash) {
      if (asset.storageReference) {
        await storage.delete(asset.storageReference).catch(() => undefined);
      }
    }
    const n = await repository.emptyTrash(owner.id);
    bump();
    return n;
  }, [repository, storage, owner.id, bump]);

  /** Resolve a human-readable origin for the details panel. */
  const resolveSource = useCallback(
    async (asset: Asset): Promise<{ title: string | null; deleted: boolean }> => {
      if (!asset.sourceRef.conversationId) return { title: null, deleted: false };
      if (asset.sourceRef.isConversationDeleted) return { title: asset.sourceRef.conversationTitle, deleted: true };
      return { title: asset.sourceRef.conversationTitle, deleted: false };
    },
    [],
  );

  /** Future composer seam: stable id reference, never the bytes. */
  const referenceFor = useCallback((asset: Asset) => ({
    assetId: asset.id,
    kind: (asset.type === "pdf" || asset.type === "presentation" || asset.type === "spreadsheet" || asset.type === "code"
      ? "document"
      : asset.type) as "image" | "video" | "audio" | "document" | "other",
    name: asset.name,
    mime: asset.mimeType,
    vaultKey: asset.storageReference ?? undefined,
  }), []);

  return {
    uploadFiles,
    toggleFavorite,
    rename,
    setArchived,
    addTag,
    removeTag,
    addToCollection,
    removeFromCollection,
    createCollection,
    moveToTrash,
    restore,
    permanentlyDelete,
    emptyTrash,
    resolveSource,
    referenceFor,
  };
}

export type AssetActions = ReturnType<typeof useAssetActions>;
