/**
 * Conversation Library — canonical domain model.
 *
 * Strongly-typed conversation + message records persisted by the
 * ConversationRepository. These models are owner-aware, state-driven, and
 * asset-independent: a conversation references generated assets by id rather
 * than embedding them, so deleting a chat never deletes an asset.
 *
 * Message storage reuses the canonical AI Core message model
 * (ConversationMessage) where possible. `StoredMessage` is the persisted
 * envelope: it carries the canonical ConversationMessage plus a stable
 * `assetReferences` list and repo-level bookkeeping.
 */

import type {
  ConversationMessage,
  ModelDescriptor,
  RequestAttachment,
} from "@/ai/types";
import type {
  LanguageCode,
  Formality,
  Tone,
  Verbosity,
  TechnicalLevel,
} from "@/ai/language";
import type { EmojiPreference } from "@/ai/emoji";

/* ------------------------------------------------------------------ */
/* Owner                                                               */
/* ------------------------------------------------------------------ */

/**
 * A private RT AI user. RT AI is a two-user system (Ramakanth and his wife).
 * The id is a stable placeholder identity for local development; a future
 * secure auth layer replaces `getCurrentOwner()` without touching storage.
 */
export interface Owner {
  id: string;
  name: string;
  initials: string;
}

/* ------------------------------------------------------------------ */
/* Conversation state                                                  */
/* ------------------------------------------------------------------ */

export type ConversationStatus = "active" | "archived" | "deleted";

/**
 * Conversation-level style snapshot, preserved across sessions so the
 * intelligence layer has continuity. It is NOT a lock — the user may switch
 * languages naturally and the per-turn intelligence stays authoritative.
 */
export interface ConversationStyle {
  language: LanguageCode;
  secondaryLanguage: LanguageCode | null;
  isMixedLanguage: boolean;
  formality: Formality;
  tone: Tone;
  verbosity: Verbosity;
  technicalLevel: TechnicalLevel;
  emojiPreference: EmojiPreference;
}

/* ------------------------------------------------------------------ */
/* Asset references (independent from the conversation)               */
/* ------------------------------------------------------------------ */

/**
 * A reference to a generated asset that lives in a future Asset Vault.
 * The conversation only stores the reference — never the asset payload —
 * so CHAT DELETE ≠ ASSET DELETE. Removing a conversation leaves referenced
 * assets available for the vault.
 */
export interface AssetReference {
  /** Stable asset id in the Asset Vault namespace. */
  assetId: string;
  /** Asset kind — extensible as the vault grows. */
  kind: "image" | "video" | "audio" | "document" | "other";
  name: string;
  mime: string;
  /** Optional vault pointer / storage key (future). */
  vaultKey?: string;
}

/* ------------------------------------------------------------------ */
/* Stored message                                                      */
/* ------------------------------------------------------------------ */

/**
 * The persisted message envelope. It embeds the canonical AI Core
 * ConversationMessage (preserving role/content/model/state/error/timestamps)
 * and adds asset references + repo bookkeeping.
 */
export interface StoredMessage {
  /** Canonical AI Core message — reused, not duplicated. */
  message: ConversationMessage;
  /**
   * Assets produced or referenced by this message (by id only).
   * Assistant-generated images/videos/etc. live here as references; the
   * assets themselves survive conversation deletion.
   */
  assetReferences: AssetReference[];
}

/* ------------------------------------------------------------------ */
/* Conversation record                                                 */
/* ------------------------------------------------------------------ */

export interface ConversationStats {
  messageCount: number;
}

export interface ConversationRecord {
  id: string;
  /** Owning user — one of the two authorized RT AI users. */
  ownerId: string;
  title: string;
  /** True when the title is an auto placeholder pending a real/generated title. */
  titleAuto: boolean;
  createdAt: number;
  updatedAt: number;
  lastMessageAt: number;
  pinned: boolean;
  status: ConversationStatus;
  /** Soft-delete timestamp; null unless status === "deleted". */
  deletedAt: number | null;
  /** Optional project link for future project support. */
  projectId: string | null;
  tags: string[];
  /** Short preview of the latest turn, for lists. */
  preview: string;
  language: LanguageCode;
  style: ConversationStyle;
  stats: ConversationStats;
  /** Free-form metadata bag (extensible). */
  metadata: Record<string, unknown>;
}

/** Record without repo-managed audit fields — used by create(). */
export type NewConversationInput = Pick<
  ConversationRecord,
  "ownerId" | "title" | "titleAuto" | "language" | "style"
> & {
  projectId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchQuery {
  ownerId: string;
  /** Free-text query; matched against title, preview, tags, message text. */
  query: string;
  /** Scope which buckets are searched. Defaults to active + archived. */
  includeArchived?: boolean;
  includeDeleted?: boolean;
  /** Limit results (pagination). */
  limit?: number;
}

export interface SearchHit {
  conversation: ConversationRecord;
  /** Where the match was found, for optional highlight. */
  matchedField: "title" | "preview" | "tags" | "message";
  /** A snippet of the matched message text when matched on content. */
  snippet?: string;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

/* ------------------------------------------------------------------ */
/* List query / result                                                 */
/* ------------------------------------------------------------------ */

export type ConversationBucket = "recent" | "pinned" | "archived" | "deleted";

export interface ListQuery {
  ownerId: string;
  bucket: ConversationBucket;
  /** Limit for pagination. */
  limit?: number;
  /** Cursor: skip records older than this updatedAt (keyset pagination). */
  beforeUpdatedAt?: number;
}

export interface ListResult {
  items: ConversationRecord[];
  total: number;
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/* Repository interface                                                */
/* ------------------------------------------------------------------ */

/**
 * The persistence seam. The UI calls this — never IndexedDB or React state
 * directly. The local implementation is swappable for a remote/synced
 * backend in a future step without changing call sites.
 */
export interface ConversationRepository {
  create(input: NewConversationInput): Promise<ConversationRecord>;
  get(id: string): Promise<ConversationRecord | undefined>;
  list(query: ListQuery): Promise<ListResult>;
  /** Count conversations in a bucket for an owner. */
  count(ownerId: string, bucket: ConversationBucket): Promise<number>;
  /** Recent across active (pinned surfaced separately when requested). */
  recent(ownerId: string, limit?: number): Promise<ConversationRecord[]>;
  pinned(ownerId: string): Promise<ConversationRecord[]>;
  archived(ownerId: string, limit?: number): Promise<ConversationRecord[]>;
  deleted(ownerId: string, limit?: number): Promise<ConversationRecord[]>;
  update(
    id: string,
    patch: Partial<
      Pick<
        ConversationRecord,
        | "title"
        | "titleAuto"
        | "tags"
        | "projectId"
        | "metadata"
        | "style"
        | "language"
        | "preview"
        | "lastMessageAt"
      >
    >,
  ): Promise<ConversationRecord>;
  rename(id: string, title: string): Promise<ConversationRecord>;
  pin(id: string): Promise<ConversationRecord>;
  unpin(id: string): Promise<ConversationRecord>;
  archive(id: string): Promise<ConversationRecord>;
  unarchive(id: string): Promise<ConversationRecord>;
  moveToTrash(id: string): Promise<ConversationRecord>;
  restore(id: string): Promise<ConversationRecord>;
  permanentlyDelete(id: string): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult>;
  emptyTrash(ownerId: string): Promise<number>;

  /* Message storage ------------------------------------------------ */
  getMessages(id: string): Promise<StoredMessage[]>;
  appendMessage(id: string, stored: StoredMessage): Promise<ConversationRecord>;
  /** Replace the full message list (used on hydration/restore/cleanup). */
  setMessages(id: string, messages: StoredMessage[]): Promise<ConversationRecord>;
  /** Append a canonical ConversationMessage, wrapping it in a StoredMessage. */
  appendConversationMessage(
    id: string,
    message: ConversationMessage,
    assetReferences?: AssetReference[],
  ): Promise<ConversationRecord>;
  /** Recompute stats + preview from persisted messages. */
  refresh(id: string): Promise<ConversationRecord>;
  /** Remove all conversations + messages for an owner (local dev reset). */
  clear(ownerId: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function isReadable(conversation: ConversationRecord): boolean {
  return conversation.status !== "deleted";
}

export function canonicalModelOf(stored: StoredMessage): ModelDescriptor | undefined {
  return stored.message.model;
}

export function attachmentsOf(stored: StoredMessage): RequestAttachment[] {
  return stored.message.attachments ?? [];
}
