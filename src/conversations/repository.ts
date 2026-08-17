/**
 * LocalConversationRepository — local-first ConversationRepository backed by
 * a KeyValueStore (IndexedDB in the browser, MemoryStore in tests).
 *
 * State model:
 *  - active:    status === "active"    (pinned flag is orthogonal)
 *  - archived:  status === "archived"
 *  - deleted:   status === "deleted"  + deletedAt set (soft-delete → trash)
 *
 * Permanent delete removes the conversation + its messages only. Asset
 * references are IDs stored on messages; the assets themselves live in a
 * future vault and are untouched by conversation deletion.
 *
 * All operations are scoped by ownerId so the two private users' histories
 * stay logically separate.
 */

import type {
  AssetReference,
  ConversationBucket,
  ConversationRecord,
  ConversationRepository,
  ConversationStatus,
  ListQuery,
  ListResult,
  NewConversationInput,
  SearchHit,
  SearchQuery,
  SearchResult,
  StoredMessage,
} from "@/conversations/types";
import type { KeyValueStore } from "@/conversations/storage";

const CONV_PREFIX = "conv:";
const MSG_PREFIX = "msgs:";
const INDEX_KEY = "index:conversations";

interface ConversationIndexEntry {
  id: string;
  ownerId: string;
  updatedAt: number;
  lastMessageAt: number;
  status: ConversationStatus;
  pinned: boolean;
}

interface ConversationIndex {
  entries: ConversationIndexEntry[];
}

function now(): number {
  return Date.now();
}

function uid(prefix: string): string {
  return `${prefix}_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function previewFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;
}

export class LocalConversationRepository implements ConversationRepository {
  constructor(private readonly store: KeyValueStore) {}

  /* ---------------------------------------------------------------- */
  /* Index helpers                                                    */
  /* ---------------------------------------------------------------- */

  private async readIndex(): Promise<ConversationIndex> {
    const idx = await this.store.get<ConversationIndex>(INDEX_KEY);
    return idx ?? { entries: [] };
  }

  private async writeIndex(idx: ConversationIndex): Promise<void> {
    await this.store.set<ConversationIndex>(INDEX_KEY, idx);
  }

  private async upsertIndex(rec: ConversationRecord): Promise<void> {
    const idx = await this.readIndex();
    const entry: ConversationIndexEntry = {
      id: rec.id,
      ownerId: rec.ownerId,
      updatedAt: rec.updatedAt,
      lastMessageAt: rec.lastMessageAt,
      status: rec.status,
      pinned: rec.pinned,
    };
    const i = idx.entries.findIndex((e) => e.id === rec.id);
    if (i === -1) idx.entries.push(entry);
    else idx.entries[i] = entry;
    await this.writeIndex(idx);
  }

  private async removeFromIndex(id: string): Promise<void> {
    const idx = await this.readIndex();
    idx.entries = idx.entries.filter((e) => e.id !== id);
    await this.writeIndex(idx);
  }

  private async save(rec: ConversationRecord): Promise<ConversationRecord> {
    await this.store.set<ConversationRecord>(`${CONV_PREFIX}${rec.id}`, rec);
    await this.upsertIndex(rec);
    return rec;
  }

  /* ---------------------------------------------------------------- */
  /* CRUD                                                              */
  /* ---------------------------------------------------------------- */

  async create(input: NewConversationInput): Promise<ConversationRecord> {
    const ts = now();
    const rec: ConversationRecord = {
      id: uid("conv"),
      ownerId: input.ownerId,
      title: input.title || "New conversation",
      titleAuto: input.titleAuto ?? true,
      createdAt: ts,
      updatedAt: ts,
      lastMessageAt: ts,
      pinned: false,
      status: "active",
      deletedAt: null,
      projectId: input.projectId ?? null,
      tags: input.tags ?? [],
      preview: "",
      language: input.language,
      style: input.style,
      stats: { messageCount: 0 },
      metadata: input.metadata ?? {},
    };
    return this.save(rec);
  }

  async get(id: string): Promise<ConversationRecord | undefined> {
    return this.store.get<ConversationRecord>(`${CONV_PREFIX}${id}`);
  }

  async list(query: ListQuery): Promise<ListResult> {
    const items = await this.bucketItems(query.ownerId, query.bucket);
    items.sort(byRecent);
    const limit = query.limit ?? 50;
    let slice = items;
    if (query.beforeUpdatedAt != null) {
      slice = items.filter((r) => r.updatedAt < (query.beforeUpdatedAt as number));
    }
    const trimmed = slice.slice(0, limit);
    return {
      items: trimmed,
      total: items.length,
      hasMore: slice.length > limit,
    };
  }

  async count(ownerId: string, bucket: ConversationBucket): Promise<number> {
    const items = await this.bucketItems(ownerId, bucket);
    return items.length;
  }

  async recent(ownerId: string, limit = 20): Promise<ConversationRecord[]> {
    const items = await this.bucketItems(ownerId, "recent");
    items.sort(byRecent);
    return items.slice(0, limit);
  }

  async pinned(ownerId: string): Promise<ConversationRecord[]> {
    const items = (await this.bucketItems(ownerId, "recent")).filter((r) => r.pinned);
    items.sort(byRecent);
    return items;
  }

  async archived(ownerId: string, limit = 50): Promise<ConversationRecord[]> {
    const items = await this.bucketItems(ownerId, "archived");
    items.sort(byRecent);
    return items.slice(0, limit);
  }

  async deleted(ownerId: string, limit = 50): Promise<ConversationRecord[]> {
    const items = await this.bucketItems(ownerId, "deleted");
    items.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
    return items.slice(0, limit);
  }

  /* ---------------------------------------------------------------- */
  /* Mutations                                                        */
  /* ---------------------------------------------------------------- */

  private async mutate(
    id: string,
    fn: (rec: ConversationRecord) => void,
  touch = true,
  ): Promise<ConversationRecord> {
    const rec = await this.get(id);
    if (!rec) throw new Error(`Conversation not found: ${id}`);
    fn(rec);
    if (touch) rec.updatedAt = now();
    return this.save(rec);
  }

  async update(
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
  ): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      Object.assign(rec, patch);
    });
  }

  async rename(id: string, title: string): Promise<ConversationRecord> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Title cannot be empty");
    return this.mutate(id, (rec) => {
      rec.title = trimmed;
      rec.titleAuto = false;
    });
  }

  async pin(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.pinned = true;
    });
  }

  async unpin(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.pinned = false;
    });
  }

  async archive(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.status = "archived";
    });
  }

  async unarchive(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.status = "active";
    });
  }

  async moveToTrash(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.status = "deleted";
      rec.deletedAt = now();
      rec.pinned = false;
    });
  }

  async restore(id: string): Promise<ConversationRecord> {
    return this.mutate(id, (rec) => {
      rec.status = "active";
      rec.deletedAt = null;
      // Pinned state was cleared on trash; restore leaves it unpinned by
      // documented policy (the user may re-pin explicitly).
    });
  }

  async permanentlyDelete(id: string): Promise<void> {
    // NOTE: only the conversation + its messages are removed. Asset
    // references are IDs on messages — the assets themselves live in the
    // future vault and are NOT deleted here (CHAT DELETE ≠ ASSET DELETE).
    await this.store.delete(`${CONV_PREFIX}${id}`);
    await this.store.delete(`${MSG_PREFIX}${id}`);
    await this.removeFromIndex(id);
  }

  async emptyTrash(ownerId: string): Promise<number> {
    const trash = await this.deleted(ownerId);
    for (const rec of trash) {
      await this.permanentlyDelete(rec.id);
    }
    return trash.length;
  }

  /* ---------------------------------------------------------------- */
  /* Messages                                                         */
  /* ---------------------------------------------------------------- */

  private async readMessages(id: string): Promise<StoredMessage[]> {
    return (await this.store.get<StoredMessage[]>(`${MSG_PREFIX}${id}`)) ?? [];
  }

  private async writeMessages(id: string, messages: StoredMessage[]): Promise<void> {
    await this.store.set<StoredMessage[]>(`${MSG_PREFIX}${id}`, messages);
  }

  async getMessages(id: string): Promise<StoredMessage[]> {
    return this.readMessages(id);
  }

  async appendMessage(id: string, stored: StoredMessage): Promise<ConversationRecord> {
    const messages = await this.readMessages(id);
    messages.push(stored);
    await this.writeMessages(id, messages);
    return this.refresh(id);
  }

  async setMessages(id: string, messages: StoredMessage[]): Promise<ConversationRecord> {
    await this.writeMessages(id, messages);
    return this.refresh(id);
  }

  async appendConversationMessage(
    id: string,
    message: ConversationMessageLike,
    assetReferences: AssetReference[] = [],
  ): Promise<ConversationRecord> {
    return this.appendMessage(id, { message, assetReferences });
  }

  async refresh(id: string): Promise<ConversationRecord> {
    const rec = await this.get(id);
    if (!rec) throw new Error(`Conversation not found: ${id}`);
    const messages = await this.readMessages(id);
    rec.stats = { messageCount: messages.length };
    const lastText = lastUserOrAssistantText(messages);
    if (lastText) {
      rec.preview = previewFromText(lastText);
      rec.lastMessageAt = messages[messages.length - 1]?.message.createdAt ?? rec.lastMessageAt;
    }
    rec.updatedAt = now();
    return this.save(rec);
  }

  async clear(ownerId: string): Promise<void> {
    const idx = await this.readIndex();
    const owned = idx.entries.filter((e) => e.ownerId === ownerId);
    for (const e of owned) {
      await this.store.delete(`${CONV_PREFIX}${e.id}`);
      await this.store.delete(`${MSG_PREFIX}${e.id}`);
    }
    idx.entries = idx.entries.filter((e) => e.ownerId !== ownerId);
    await this.writeIndex(idx);
  }

  /* ---------------------------------------------------------------- */
  /* Search                                                            */
  /* ---------------------------------------------------------------- */

  async search(query: SearchQuery): Promise<SearchResult> {
    const q = query.query.trim().toLowerCase();
    if (!q) return { hits: [], total: 0 };
    const includeArchived = query.includeArchived ?? true;
    const includeDeleted = query.includeDeleted ?? false;
    const limit = query.limit ?? 50;

    const candidates: ConversationRecord[] = [];
    const active = await this.bucketItems(query.ownerId, "recent");
    candidates.push(...active);
    if (includeArchived) candidates.push(...(await this.bucketItems(query.ownerId, "archived")));
    if (includeDeleted) candidates.push(...(await this.bucketItems(query.ownerId, "deleted")));

    const hits: SearchHit[] = [];
    const seen = new Set<string>();
    for (const conv of candidates) {
      if (seen.has(conv.id)) continue;
      seen.add(conv.id);
      // Title match
      if (conv.title.toLowerCase().includes(q)) {
        hits.push({ conversation: conv, matchedField: "title" });
        continue;
      }
      // Preview match
      if (conv.preview.toLowerCase().includes(q)) {
        hits.push({ conversation: conv, matchedField: "preview" });
        continue;
      }
      // Tag match
      if (conv.tags.some((t) => t.toLowerCase().includes(q))) {
        hits.push({ conversation: conv, matchedField: "tags" });
        continue;
      }
      // Message content match (requires reading persisted messages).
      const messages = await this.readMessages(conv.id);
      const msg = messages.find((m) => m.message.text.toLowerCase().includes(q));
      if (msg) {
        hits.push({
          conversation: conv,
          matchedField: "message",
          snippet: snippetOf(msg.message.text, q),
        });
      }
    }
    hits.sort((a, b) => byRecent(a.conversation, b.conversation));
    const trimmed = hits.slice(0, limit);
    return { hits: trimmed, total: hits.length };
  }

  /* ---------------------------------------------------------------- */
  /* Bucket resolution                                                */
  /* ---------------------------------------------------------------- */

  private async bucketItems(ownerId: string, bucket: ConversationBucket): Promise<ConversationRecord[]> {
    const idx = await this.readIndex();
    const ids = idx.entries
      .filter((e) => e.ownerId === ownerId && matchesBucket(e, bucket))
      .map((e) => e.id);
    const out: ConversationRecord[] = [];
    for (const id of ids) {
      const rec = await this.get(id);
      if (rec) out.push(rec);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

function matchesBucket(entry: ConversationIndexEntry, bucket: ConversationBucket): boolean {
  switch (bucket) {
    case "recent":
      return entry.status === "active";
    case "pinned":
      return entry.status === "active" && entry.pinned;
    case "archived":
      return entry.status === "archived";
    case "deleted":
      return entry.status === "deleted";
  }
}

function byRecent(a: ConversationRecord, b: ConversationRecord): number {
  return b.lastMessageAt - a.lastMessageAt;
}

function lastUserOrAssistantText(messages: StoredMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = messages[i].message.text;
    if (t && t.length > 0) return t;
  }
  return null;
}

function snippetOf(text: string, q: string): string {
  const lower = text.toLowerCase();
  const at = lower.indexOf(q);
  if (at === -1) return text.slice(0, 120);
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + q.length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

type ConversationMessageLike = StoredMessage["message"];
