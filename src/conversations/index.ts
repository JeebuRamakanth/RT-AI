/**
 * Conversation Library — public barrel.
 *
 * The UI (Home composer, Chat page, history sidebar, search) depends only
 * on this seam. Internals (storage backend, repository, owner) can evolve
 * — or be replaced by a remote/synced backend — without touching call sites.
 */

export type {
  Owner,
  ConversationStatus,
  ConversationStyle,
  AssetReference,
  StoredMessage,
  ConversationStats,
  ConversationRecord,
  NewConversationInput,
  SearchQuery,
  SearchHit,
  SearchResult,
  ListQuery,
  ListResult,
  ConversationBucket,
  ConversationRepository,
  isReadable,
  canonicalModelOf,
  attachmentsOf,
} from "@/conversations/types";

export {
  LocalConversationRepository,
} from "@/conversations/repository";

export {
  MemoryStore,
  IndexedDbStore,
  createDefaultStore,
  type KeyValueStore,
} from "@/conversations/storage";

export {
  getCurrentOwner,
  setCurrentOwner,
  listOwners,
  OWNERS,
} from "@/conversations/owner";

export {
  generateTitle,
  placeholderTitle,
} from "@/conversations/titles";
