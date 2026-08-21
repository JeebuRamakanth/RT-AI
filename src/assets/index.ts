/**
 * Asset Vault — public barrel. The UI depends only on this seam; storage
 * backends and repository internals can evolve without touching call sites.
 */

export type {
  Asset,
  AssetType,
  AssetSource,
  AssetStatus,
  AssetTypeMeta,
  GenerationMetadata,
  UploadMetadata,
  AssetSourceRef,
  NewAssetInput,
  AssetCollection,
  NewCollectionInput,
  AssetSort,
  AssetQuery,
  AssetSearchQuery,
  AssetSearchHit,
  AssetSearchResult,
  AssetCounts,
  AssetEvent,
  AssetEventType,
  AssetRepository,
} from "@/assets/types";

export {
  typeFromMime,
  typeFromFileName,
  formatBytes,
  isInTrash,
  hasBytes,
  emptySourceRef,
} from "@/assets/types";

export { LocalAssetRepository } from "@/assets/repository";

export {
  MemoryAssetStorage,
  IndexedDbAssetStorage,
  createDefaultAssetStorage,
  type AssetStorage,
  type StoredBinary,
} from "@/assets/storage";
