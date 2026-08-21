/**
 * Asset Vault — canonical domain model.
 *
 * The vault is a permanent, conversation-independent library for everything
 * RT AI creates, uploads, imports, transforms, or exports. Two hard rules:
 *
 *  - CHAT DELETE ≠ ASSET DELETE. A conversation references assets by id;
 *    the vault owns asset records. Deleting a conversation never deletes
 *    an asset, and deleting an asset never touches conversations.
 *  - METADATA ≠ BYTES. The repository persists asset metadata; the
 *    AssetStorage layer persists the actual binary. Neither pretends to be
 *    the other.
 *
 * All operations are owner-scoped: RT AI is a private two-user system, and
 * each owner's vault stays logically separate.
 */

/* ------------------------------------------------------------------ */
/* Categories & sources                                                */
/* ------------------------------------------------------------------ */

export type AssetType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "pdf"
  | "presentation"
  | "spreadsheet"
  | "code"
  | "other";

export type AssetSource =
  | "generated"
  | "uploaded"
  | "imported"
  | "transformed"
  | "exported";

/**
 * Lifecycle status. Independent from the presence of bytes — an asset can
 * be `ready` (metadata + bytes present) or `missing-bytes` (metadata is
 * intact but the binary is not available locally, e.g. after storage
 * eviction). `processing`/`failed` are for future generation flows.
 */
export type AssetStatus =
  | "processing"
  | "ready"
  | "missing-bytes"
  | "failed";

/* ------------------------------------------------------------------ */
/* Type-specific metadata (discriminated union, extensible)            */
/* ------------------------------------------------------------------ */

export interface ImageAssetMeta {
  kind: "image";
  width?: number;
  height?: number;
}
export interface VideoAssetMeta {
  kind: "video";
  width?: number;
  height?: number;
  durationSeconds?: number;
}
export interface AudioAssetMeta {
  kind: "audio";
  durationSeconds?: number;
}
export interface DocumentAssetMeta {
  kind: "document";
  pageCount?: number;
  wordCount?: number;
}
export interface PdfAssetMeta {
  kind: "pdf";
  pageCount?: number;
}
export interface PresentationAssetMeta {
  kind: "presentation";
  slideCount?: number;
}
export interface SpreadsheetAssetMeta {
  kind: "spreadsheet";
  sheetCount?: number;
}
export interface CodeAssetMeta {
  kind: "code";
  language?: string;
  lineCount?: number;
}
export interface OtherAssetMeta {
  kind: "other";
}

export type AssetTypeMeta =
  | ImageAssetMeta
  | VideoAssetMeta
  | AudioAssetMeta
  | DocumentAssetMeta
  | PdfAssetMeta
  | PresentationAssetMeta
  | SpreadsheetAssetMeta
  | CodeAssetMeta
  | OtherAssetMeta;

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

/**
 * How the asset came to exist. Pure metadata — future generation modules
 * register assets through the repository using this shape; nothing here
 * runs AI generation.
 */
export interface GenerationMetadata {
  /** Internal model label, e.g. "RT Development". */
  modelLabel?: string;
  prompt?: string;
  /** Free-form parameters used to produce the asset. */
  parameters?: Record<string, unknown>;
}

export interface UploadMetadata {
  originalFileName?: string;
  /** Where the file came from in the UI (vault upload, composer, …). */
  origin?: string;
}

/**
 * Traceability back to the originating conversation turn. The asset does
 * NOT depend on the conversation's existence: if the conversation is later
 * deleted, the vault keeps the record and renders an honest
 * "Original conversation deleted" state via `isConversationDeleted`.
 */
export interface AssetSourceRef {
  conversationId: string | null;
  conversationTitle: string | null;
  messageId: string | null;
  /** Set when the originating conversation can no longer be found. */
  isConversationDeleted: boolean;
}

/* ------------------------------------------------------------------ */
/* Asset record                                                        */
/* ------------------------------------------------------------------ */

export interface Asset {
  id: string;
  /** Owning user — one of the two authorized RT AI users. */
  ownerId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  /** Size in bytes of the stored binary; 0 when unknown/not stored. */
  size: number;
  createdAt: number;
  updatedAt: number;
  source: AssetSource;
  sourceRef: AssetSourceRef;
  /** Pointer the AssetStorage layer understands. Never the bytes. */
  storageReference: string | null;
  thumbnailReference: string | null;
  /** Type-specific metadata. */
  typeMeta: AssetTypeMeta;
  /** Free-form metadata bag (extensible; analysis results may land here). */
  metadata: Record<string, unknown>;
  tags: string[];
  collectionIds: string[];
  favorite: boolean;
  archived: boolean;
  /** Soft-delete timestamp; null unless the asset is in Trash. */
  deletedAt: number | null;
  /** 1-based version number within its version lineage. */
  version: number;
  /** Root asset id for a version lineage; null for a v1 original. */
  parentAssetId: string | null;
  generationMetadata: GenerationMetadata | null;
  uploadMetadata: UploadMetadata | null;
  status: AssetStatus;
  /** Reserved for future deduplication. Never computed by this step. */
  contentHash: string | null;
}

/** Input accepted by AssetRepository.register(). */
export interface NewAssetInput {
  ownerId: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
  source: AssetSource;
  storageReference?: string | null;
  thumbnailReference?: string | null;
  status?: AssetStatus;
  sourceRef?: Partial<AssetSourceRef>;
  typeMeta?: AssetTypeMeta;
  metadata?: Record<string, unknown>;
  tags?: string[];
  collectionIds?: string[];
  parentAssetId?: string | null;
  generationMetadata?: GenerationMetadata | null;
  uploadMetadata?: UploadMetadata | null;
  contentHash?: string | null;
}

/* ------------------------------------------------------------------ */
/* Collections (reference-only; never duplicate assets)                */
/* ------------------------------------------------------------------ */

export interface AssetCollection {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewCollectionInput {
  ownerId: string;
  name: string;
  description?: string | null;
}

/* ------------------------------------------------------------------ */
/* Query / search / sort                                               */
/* ------------------------------------------------------------------ */

export type AssetSort = "newest" | "oldest" | "name" | "size" | "updated";

export interface AssetQuery {
  ownerId: string;
  type?: AssetType | "all";
  source?: AssetSource | "all";
  favoritesOnly?: boolean;
  archivedOnly?: boolean;
  /** Only assets currently in Trash (deletedAt != null). */
  trashOnly?: boolean;
  collectionId?: string | null;
  tag?: string | null;
  sort?: AssetSort;
  limit?: number;
}

export interface AssetSearchQuery {
  ownerId: string;
  query: string;
  includeTrash?: boolean;
  limit?: number;
}

export interface AssetSearchHit {
  asset: Asset;
  matchedField: "name" | "type" | "tags" | "source" | "metadata";
}

export interface AssetSearchResult {
  hits: AssetSearchHit[];
  total: number;
}

export interface AssetCounts {
  active: number;
  favorites: number;
  archived: number;
  trash: number;
}

/* ------------------------------------------------------------------ */
/* Vault events (future notification center seam)                      */
/* ------------------------------------------------------------------ */

export type AssetEventType =
  | "asset.registered"
  | "asset.uploaded"
  | "asset.updated"
  | "asset.trashed"
  | "asset.restored"
  | "asset.deleted"
  | "asset.favorited"
  | "asset.unfavorited"
  | "asset.archived"
  | "asset.unarchived";

export interface AssetEvent {
  type: AssetEventType;
  assetId: string;
  ownerId: string;
  at: number;
}

/* ------------------------------------------------------------------ */
/* Repository interface                                                */
/* ------------------------------------------------------------------ */

/**
 * The metadata persistence seam. The UI calls this — never IndexedDB or
 * React state directly. Binary payloads go through AssetStorage; the
 * repository stores only the storageReference pointer.
 */
export interface AssetRepository {
  register(input: NewAssetInput): Promise<Asset>;
  get(id: string): Promise<Asset | undefined>;
  list(query: AssetQuery): Promise<Asset[]>;
  counts(ownerId: string): Promise<AssetCounts>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Asset,
        | "name"
        | "metadata"
        | "typeMeta"
        | "status"
        | "storageReference"
        | "thumbnailReference"
        | "generationMetadata"
        | "uploadMetadata"
        | "contentHash"
        | "sourceRef"
        | "size"
      >
    >,
  ): Promise<Asset>;
  setFavorite(id: string, favorite: boolean): Promise<Asset>;
  setArchived(id: string, archived: boolean): Promise<Asset>;
  addTag(id: string, tag: string): Promise<Asset>;
  removeTag(id: string, tag: string): Promise<Asset>;
  addToCollection(id: string, collectionId: string): Promise<Asset>;
  removeFromCollection(id: string, collectionId: string): Promise<Asset>;
  moveToTrash(id: string): Promise<Asset>;
  restore(id: string): Promise<Asset>;
  /** Removes the metadata record only — callers delete bytes via AssetStorage. */
  permanentlyDelete(id: string): Promise<void>;
  emptyTrash(ownerId: string): Promise<number>;
  search(query: AssetSearchQuery): Promise<AssetSearchResult>;
  /** All versions of a lineage (v1 first), given any member's id. */
  versions(id: string): Promise<Asset[]>;

  /* Collections ----------------------------------------------------- */
  createCollection(input: NewCollectionInput): Promise<AssetCollection>;
  listCollections(ownerId: string): Promise<AssetCollection[]>;
  deleteCollection(id: string): Promise<void>;

  /* Events (future notification center) ----------------------------- */
  subscribe(listener: (event: AssetEvent) => void): () => void;

  /** Remove all assets + collections for an owner (local dev reset). */
  clear(ownerId: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EXT_TYPE_MAP: Record<string, AssetType> = {
  // images
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  svg: "image", avif: "image", bmp: "image", ico: "image", tiff: "image",
  // videos
  mp4: "video", webm: "video", mov: "video", mkv: "video", avi: "video", m4v: "video",
  // audio
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio", aac: "audio", opus: "audio",
  // documents
  doc: "document", docx: "document", txt: "document", md: "document",
  rtf: "document", odt: "document", epub: "document",
  // presentations
  ppt: "presentation", pptx: "presentation", key: "presentation", odp: "presentation",
  // spreadsheets
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", ods: "spreadsheet", tsv: "spreadsheet",
  // code
  js: "code", jsx: "code", ts: "code", tsx: "code", py: "code", java: "code",
  c: "code", cpp: "code", h: "code", cs: "code", go: "code", rs: "code",
  rb: "code", php: "code", swift: "code", kt: "code", html: "code",
  css: "code", json: "code", xml: "code", yml: "code", yaml: "code",
  toml: "code", sql: "code", sh: "code", vue: "code", svelte: "code",
  wasm: "code", ipynb: "code",
};

/** Resolve the canonical AssetType from a MIME type, falling back to extension. */
export function typeFromMime(mime: string, fileName = ""): AssetType {
  const lower = mime.toLowerCase();
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("video/")) return "video";
  if (lower.startsWith("audio/")) return "audio";
  if (lower === "application/pdf") return "pdf";
  if (
    lower.includes("presentationml") ||
    lower.includes("vnd.ms-powerpoint") ||
    lower.includes("vnd.oasis.opendocument.presentation")
  ) {
    return "presentation";
  }
  if (
    lower.includes("spreadsheetml") ||
    lower.includes("vnd.ms-excel") ||
    lower.includes("vnd.oasis.opendocument.spreadsheet") ||
    lower === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    lower.includes("wordprocessingml") ||
    lower === "application/msword" ||
    lower.includes("vnd.oasis.opendocument.text") ||
    lower === "text/markdown" ||
    lower === "text/rtf" ||
    lower === "application/rtf" ||
    lower === "text/plain"
  ) {
    return "document";
  }
  if (lower.startsWith("text/") || lower === "application/json" || lower === "application/xml") {
    return "code";
  }
  return typeFromFileName(fileName);
}

/** Resolve the canonical AssetType from a file extension. */
export function typeFromFileName(fileName: string): AssetType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPE_MAP[ext] ?? "other";
}

/** Human-readable byte size. Never fabricates; shows "0 B" for empty. */
export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function isInTrash(asset: Asset): boolean {
  return asset.deletedAt !== null;
}

/** True when the asset binary is locally available via AssetStorage. */
export function hasBytes(asset: Asset): boolean {
  return asset.storageReference !== null && asset.status === "ready";
}

export function emptySourceRef(): AssetSourceRef {
  return {
    conversationId: null,
    conversationTitle: null,
    messageId: null,
    isConversationDeleted: false,
  };
}
