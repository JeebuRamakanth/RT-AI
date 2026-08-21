/**
 * LocalAssetRepository — local-first AssetRepository backed by a
 * KeyValueStore (IndexedDB in the browser, MemoryStore in tests).
 *
 * Lifecycle:
 *  - active:    deletedAt === null, archived === false
 *  - favorites: deletedAt === null, favorite === true (orthogonal flag)
 *  - archived:  deletedAt === null, archived === true
 *  - trash:     deletedAt !== null (soft-delete → restore, or permanent)
 *
 * Permanent delete removes ONLY the metadata record (+ any collection
 * references). Binary payloads are deleted by callers through AssetStorage;
 * conversation records are never touched (ASSET DELETE ≠ CHAT DELETE).
 */

import type {
  Asset,
  AssetCollection,
  AssetCounts,
  AssetEvent,
  AssetEventType,
  AssetQuery,
  AssetRepository,
  AssetSearchQuery,
  AssetSearchResult,
  AssetSearchHit,
  AssetSort,
  NewAssetInput,
  NewCollectionInput,
} from "@/assets/types";
import { emptySourceRef } from "@/assets/types";
import type { KeyValueStore } from "@/conversations/storage";

const ASSET_PREFIX = "asset:";
const COLLECTION_PREFIX = "acol:";
const INDEX_KEY = "index:assets";

interface AssetIndexEntry {
  id: string;
  ownerId: string;
  updatedAt: number;
  createdAt: number;
  deletedAt: number | null;
  archived: boolean;
  favorite: boolean;
}

interface AssetIndex {
  entries: AssetIndexEntry[];
}

function now(): number {
  return Date.now();
}

function uid(prefix: string): string {
  return `${prefix}_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class LocalAssetRepository implements AssetRepository {
  private readonly listeners = new Set<(event: AssetEvent) => void>();

  constructor(private readonly store: KeyValueStore) {}

  /* ---------------------------------------------------------------- */
  /* Events (future notification center seam)                          */
  /* ---------------------------------------------------------------- */

  subscribe(listener: (event: AssetEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(type: AssetEventType, assetId: string, ownerId: string): void {
    const event: AssetEvent = { type, assetId, ownerId, at: now() };
    for (const l of this.listeners) l(event);
  }

  /* ---------------------------------------------------------------- */
  /* Index helpers                                                     */
  /* ---------------------------------------------------------------- */

  private async readIndex(): Promise<AssetIndex> {
    const idx = await this.store.get<AssetIndex>(INDEX_KEY);
    return idx ?? { entries: [] };
  }

  private async writeIndex(idx: AssetIndex): Promise<void> {
    await this.store.set<AssetIndex>(INDEX_KEY, idx);
  }

  private async save(asset: Asset): Promise<Asset> {
    await this.store.set<Asset>(`${ASSET_PREFIX}${asset.id}`, asset);
    const idx = await this.readIndex();
    const entry: AssetIndexEntry = {
      id: asset.id,
      ownerId: asset.ownerId,
      updatedAt: asset.updatedAt,
      createdAt: asset.createdAt,
      deletedAt: asset.deletedAt,
      archived: asset.archived,
      favorite: asset.favorite,
    };
    const i = idx.entries.findIndex((e) => e.id === asset.id);
    if (i === -1) idx.entries.push(entry);
    else idx.entries[i] = entry;
    await this.writeIndex(idx);
    return asset;
  }

  private async removeFromIndex(id: string): Promise<void> {
    const idx = await this.readIndex();
    idx.entries = idx.entries.filter((e) => e.id !== id);
    await this.writeIndex(idx);
  }

  /* ---------------------------------------------------------------- */
  /* CRUD                                                              */
  /* ---------------------------------------------------------------- */

  async register(input: NewAssetInput): Promise<Asset> {
    const ts = now();
    let version = 1;
    if (input.parentAssetId) {
      const siblings = await this.lineage(input.parentAssetId);
      version = siblings.length + 1;
    }
    const asset: Asset = {
      id: uid("asset"),
      ownerId: input.ownerId,
      name: input.name.trim() || "Untitled asset",
      type: input.type,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: ts,
      updatedAt: ts,
      source: input.source,
      sourceRef: { ...emptySourceRef(), ...input.sourceRef },
      storageReference: input.storageReference ?? null,
      thumbnailReference: input.thumbnailReference ?? null,
      typeMeta: input.typeMeta ?? { kind: "other" },
      metadata: input.metadata ?? {},
      tags: input.tags ?? [],
      collectionIds: input.collectionIds ?? [],
      favorite: false,
      archived: false,
      deletedAt: null,
      version,
      parentAssetId: input.parentAssetId ?? null,
      generationMetadata: input.generationMetadata ?? null,
      uploadMetadata: input.uploadMetadata ?? null,
      status: input.status ?? (input.storageReference ? "ready" : "missing-bytes"),
      contentHash: input.contentHash ?? null,
    };
    await this.save(asset);
    this.publish(
      input.source === "uploaded" ? "asset.uploaded" : "asset.registered",
      asset.id,
      asset.ownerId,
    );
    return asset;
  }

  async get(id: string): Promise<Asset | undefined> {
    return this.store.get<Asset>(`${ASSET_PREFIX}${id}`);
  }

  async list(query: AssetQuery): Promise<Asset[]> {
    const idx = await this.readIndex();
    const ids = idx.entries.filter((e) => e.ownerId === query.ownerId).map((e) => e.id);
    let assets = await this.readMany(ids);

    if (query.trashOnly) {
      assets = assets.filter((a) => a.deletedAt !== null);
    } else {
      assets = assets.filter((a) => a.deletedAt === null);
    }
    if (query.favoritesOnly) assets = assets.filter((a) => a.favorite);
    if (query.archivedOnly) assets = assets.filter((a) => a.archived);
    if (!query.archivedOnly && !query.trashOnly && !query.favoritesOnly) {
      assets = assets.filter((a) => !a.archived);
    }
    if (query.type && query.type !== "all") assets = assets.filter((a) => a.type === query.type);
    if (query.source && query.source !== "all") assets = assets.filter((a) => a.source === query.source);
    if (query.collectionId) assets = assets.filter((a) => a.collectionIds.includes(query.collectionId as string));
    if (query.tag) assets = assets.filter((a) => a.tags.includes(query.tag as string));

    sortAssets(assets, query.sort ?? "newest");
    const limit = query.limit ?? 500;
    return assets.slice(0, limit);
  }

  async counts(ownerId: string): Promise<AssetCounts> {
    const idx = await this.readIndex();
    const owned = idx.entries.filter((e) => e.ownerId === ownerId);
    return {
      active: owned.filter((e) => e.deletedAt === null && !e.archived).length,
      favorites: owned.filter((e) => e.deletedAt === null && e.favorite).length,
      archived: owned.filter((e) => e.deletedAt === null && e.archived).length,
      trash: owned.filter((e) => e.deletedAt !== null).length,
    };
  }

  private async readMany(ids: string[]): Promise<Asset[]> {
    const out: Asset[] = [];
    for (const id of ids) {
      const asset = await this.get(id);
      if (asset) out.push(asset);
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /* Mutations                                                         */
  /* ---------------------------------------------------------------- */

  private async mutate(
    id: string,
    event: AssetEventType | null,
    fn: (asset: Asset) => void,
  ): Promise<Asset> {
    const asset = await this.get(id);
    if (!asset) throw new Error(`Asset not found: ${id}`);
    fn(asset);
    asset.updatedAt = now();
    const saved = await this.save(asset);
    if (event) this.publish(event, id, asset.ownerId);
    return saved;
  }

  async update(
    id: string,
    patch: Parameters<AssetRepository["update"]>[1],
  ): Promise<Asset> {
    return this.mutate(id, "asset.updated", (asset) => {
      Object.assign(asset, patch);
    });
  }

  async setFavorite(id: string, favorite: boolean): Promise<Asset> {
    return this.mutate(id, favorite ? "asset.favorited" : "asset.unfavorited", (asset) => {
      asset.favorite = favorite;
    });
  }

  async setArchived(id: string, archived: boolean): Promise<Asset> {
    return this.mutate(id, archived ? "asset.archived" : "asset.unarchived", (asset) => {
      asset.archived = archived;
    });
  }

  async addTag(id: string, tag: string): Promise<Asset> {
    const clean = tag.trim().replace(/^#/, "");
    if (!clean) throw new Error("Tag cannot be empty");
    return this.mutate(id, "asset.updated", (asset) => {
      if (!asset.tags.includes(clean)) asset.tags.push(clean);
    });
  }

  async removeTag(id: string, tag: string): Promise<Asset> {
    return this.mutate(id, "asset.updated", (asset) => {
      asset.tags = asset.tags.filter((t) => t !== tag);
    });
  }

  async addToCollection(id: string, collectionId: string): Promise<Asset> {
    const collection = await this.store.get<AssetCollection>(`${COLLECTION_PREFIX}${collectionId}`);
    if (!collection) throw new Error(`Collection not found: ${collectionId}`);
    return this.mutate(id, "asset.updated", (asset) => {
      if (!asset.collectionIds.includes(collectionId)) asset.collectionIds.push(collectionId);
    });
  }

  async removeFromCollection(id: string, collectionId: string): Promise<Asset> {
    return this.mutate(id, "asset.updated", (asset) => {
      asset.collectionIds = asset.collectionIds.filter((c) => c !== collectionId);
    });
  }

  async moveToTrash(id: string): Promise<Asset> {
    return this.mutate(id, "asset.trashed", (asset) => {
      asset.deletedAt = now();
      asset.favorite = false;
    });
  }

  async restore(id: string): Promise<Asset> {
    return this.mutate(id, "asset.restored", (asset) => {
      asset.deletedAt = null;
      // Archived state survives trash/restore so the user's intent is kept.
    });
  }

  async permanentlyDelete(id: string): Promise<void> {
    // Metadata only. Bytes are removed by the caller via AssetStorage, and
    // conversations that reference this asset keep their historical
    // reference — the vault never cascades into the conversation library.
    await this.store.delete(`${ASSET_PREFIX}${id}`);
    await this.removeFromIndex(id);
  }

  async emptyTrash(ownerId: string): Promise<number> {
    const trash = await this.list({ ownerId, trashOnly: true, limit: 10_000 });
    for (const asset of trash) {
      await this.permanentlyDelete(asset.id);
    }
    return trash.length;
  }

  async search(query: AssetSearchQuery): Promise<AssetSearchResult> {
    const q = query.query.trim().toLowerCase();
    if (!q) return { hits: [], total: 0 };
    const idx = await this.readIndex();
    const ids = idx.entries.filter((e) => e.ownerId === query.ownerId).map((e) => e.id);
    let assets = await this.readMany(ids);
    if (!query.includeTrash) assets = assets.filter((a) => a.deletedAt === null);

    const hits: AssetSearchHit[] = [];
    for (const asset of assets) {
      if (asset.name.toLowerCase().includes(q)) {
        hits.push({ asset, matchedField: "name" });
        continue;
      }
      if (asset.type.includes(q) || asset.mimeType.toLowerCase().includes(q)) {
        hits.push({ asset, matchedField: "type" });
        continue;
      }
      if (asset.tags.some((t) => t.toLowerCase().includes(q))) {
        hits.push({ asset, matchedField: "tags" });
        continue;
      }
      if (asset.source.includes(q)) {
        hits.push({ asset, matchedField: "source" });
        continue;
      }
      if (JSON.stringify(asset.metadata).toLowerCase().includes(q)) {
        hits.push({ asset, matchedField: "metadata" });
      }
    }
    hits.sort((a, b) => b.asset.createdAt - a.asset.createdAt);
    const limit = query.limit ?? 100;
    return { hits: hits.slice(0, limit), total: hits.length };
  }

  /* ---------------------------------------------------------------- */
  /* Versions                                                          */
  /* ---------------------------------------------------------------- */

  private async lineage(anyMemberId: string): Promise<Asset[]> {
    const member = await this.get(anyMemberId);
    if (!member) return [];
    const rootId = member.parentAssetId ?? member.id;
    const idx = await this.readIndex();
    const ids = idx.entries.filter((e) => e.ownerId === member.ownerId).map((e) => e.id);
    const assets = await this.readMany(ids);
    return assets
      .filter((a) => a.id === rootId || a.parentAssetId === rootId)
      .sort((a, b) => a.version - b.version);
  }

  async versions(id: string): Promise<Asset[]> {
    return this.lineage(id);
  }

  /* ---------------------------------------------------------------- */
  /* Collections                                                       */
  /* ---------------------------------------------------------------- */

  async createCollection(input: NewCollectionInput): Promise<AssetCollection> {
    const name = input.name.trim();
    if (!name) throw new Error("Collection name cannot be empty");
    const ts = now();
    const collection: AssetCollection = {
      id: uid("acol"),
      ownerId: input.ownerId,
      name,
      description: input.description ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.store.set<AssetCollection>(`${COLLECTION_PREFIX}${collection.id}`, collection);
    return collection;
  }

  async listCollections(ownerId: string): Promise<AssetCollection[]> {
    const entries = await this.store.entries<AssetCollection>(COLLECTION_PREFIX);
    return entries
      .map((e) => e.value)
      .filter((c) => c.ownerId === ownerId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteCollection(id: string): Promise<void> {
    // Collections are references only: member assets stay in the vault.
    await this.store.delete(`${COLLECTION_PREFIX}${id}`);
    const idx = await this.readIndex();
    const ids = idx.entries.map((e) => e.id);
    const assets = await this.readMany(ids);
    for (const asset of assets) {
      if (asset.collectionIds.includes(id)) {
        asset.collectionIds = asset.collectionIds.filter((c) => c !== id);
        await this.save(asset);
      }
    }
  }

  async clear(ownerId: string): Promise<void> {
    const idx = await this.readIndex();
    const owned = idx.entries.filter((e) => e.ownerId === ownerId);
    for (const e of owned) {
      await this.store.delete(`${ASSET_PREFIX}${e.id}`);
    }
    idx.entries = idx.entries.filter((e) => e.ownerId !== ownerId);
    await this.writeIndex(idx);
    const collections = await this.store.entries<AssetCollection>(COLLECTION_PREFIX);
    for (const c of collections) {
      if (c.value.ownerId === ownerId) await this.store.delete(c.key);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

function sortAssets(assets: Asset[], sort: AssetSort): void {
  switch (sort) {
    case "newest":
      assets.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      assets.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "name":
      assets.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "size":
      assets.sort((a, b) => b.size - a.size);
      break;
    case "updated":
      assets.sort((a, b) => b.updatedAt - a.updatedAt);
      break;
  }
}
