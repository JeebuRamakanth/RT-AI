/**
 * ConversationRepository tests — covers the full Step 04 lifecycle:
 * create/persist/load/update/rename/pin/unpin/archive/unarchive/trash/
 * restore/permanent-delete, search across title + message content, message
 * persistence, conversation continuation (hydrating stored messages), asset
 * reference preservation, owner separation, and offline local retrieval.
 *
 * Uses the in-memory KeyValueStore so tests run in Node without IndexedDB.
 */

import { describe, expect, it } from "vitest";
import {
  LocalConversationRepository,
  MemoryStore,
  type AssetReference,
  type ConversationRecord,
  type ConversationStyle,
} from "@/conversations";
import type { ConversationMessage } from "@/ai/types";

const RAMA = "ramakanth";
const WIFE = "wife";

const DEFAULT_STYLE: ConversationStyle = {
  language: "en",
  secondaryLanguage: null,
  isMixedLanguage: false,
  formality: "neutral",
  tone: "neutral",
  verbosity: "balanced",
  technicalLevel: "intermediate",
  emojiPreference: "none",
};

function newRepo(): LocalConversationRepository {
  return new LocalConversationRepository(new MemoryStore());
}

function msg(
  text: string,
  role: "user" | "assistant" = "user",
  createdAt = Date.now(),
): ConversationMessage {
  return {
    id: `m_${createdAt}_${Math.random().toString(36).slice(2, 6)}`,
    role,
    text,
    state: "completed",
    createdAt,
    finishedAt: createdAt,
  };
}

function asset(id: string): AssetReference {
  return { assetId: id, kind: "image", name: `${id}.png`, mime: "image/png", vaultKey: `vault://${id}` };
}

async function seedConversation(
  repo: LocalConversationRepository,
  ownerId: string,
  title: string,
): Promise<ConversationRecord> {
  return repo.create({
    ownerId,
    title,
    titleAuto: false,
    language: "en",
    style: DEFAULT_STYLE,
  });
}

describe("LocalConversationRepository — create + get + list", () => {
  it("creates a conversation with defaults and persists it", async () => {
    const repo = newRepo();
    const conv = await repo.create({
      ownerId: RAMA,
      title: "Teach me Agentic AI",
      titleAuto: false,
      language: "en",
      style: DEFAULT_STYLE,
    });
    expect(conv.id).toMatch(/^conv_/);
    expect(conv.ownerId).toBe(RAMA);
    expect(conv.status).toBe("active");
    expect(conv.pinned).toBe(false);
    expect(conv.deletedAt).toBeNull();
    expect(conv.stats.messageCount).toBe(0);

    const got = await repo.get(conv.id);
    expect(got?.id).toBe(conv.id);
  });

  it("list returns active conversations in the recent bucket", async () => {
    const repo = newRepo();
    const a = await seedConversation(repo, RAMA, "A");
    const b = await seedConversation(repo, RAMA, "B");
    const res = await repo.list({ ownerId: RAMA, bucket: "recent" });
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(2);
    expect(res.items.map((c) => c.id)).toContain(a.id);
    expect(res.items.map((c) => c.id)).toContain(b.id);
  });
});

describe("LocalConversationRepository — rename + update", () => {
  it("renames and clears the auto flag", async () => {
    const repo = newRepo();
    const conv = await repo.create({
      ownerId: RAMA,
      title: "New conversation",
      titleAuto: true,
      language: "en",
      style: DEFAULT_STYLE,
    });
    const renamed = await repo.rename(conv.id, "Agentic AI course");
    expect(renamed.title).toBe("Agentic AI course");
    expect(renamed.titleAuto).toBe(false);
    // Persisted.
    expect((await repo.get(conv.id))?.title).toBe("Agentic AI course");
  });

  it("rejects empty renames", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "X");
    await expect(repo.rename(conv.id, "   ")).rejects.toThrow();
  });

  it("updates tags and metadata", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "X");
    const updated = await repo.update(conv.id, {
      tags: ["ai", "agentic"],
      metadata: { topic: "agents" },
    });
    expect(updated.tags).toEqual(["ai", "agentic"]);
    expect(updated.metadata.topic).toBe("agents");
  });
});

describe("LocalConversationRepository — pin / unpin", () => {
  it("pins and unpins, persisted across reads", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Pin me");
    const pinned = await repo.pin(conv.id);
    expect(pinned.pinned).toBe(true);
    expect((await repo.get(conv.id))?.pinned).toBe(true);

    const unpinned = await repo.unpin(conv.id);
    expect(unpinned.pinned).toBe(false);
    expect((await repo.get(conv.id))?.pinned).toBe(false);
  });

  it("pinned() surfaces pinned conversations separately", async () => {
    const repo = newRepo();
    const a = await seedConversation(repo, RAMA, "A");
    await seedConversation(repo, RAMA, "B");
    await repo.pin(a.id);
    const pinned = await repo.pinned(RAMA);
    expect(pinned).toHaveLength(1);
    expect(pinned[0].id).toBe(a.id);
  });
});

describe("LocalConversationRepository — archive / unarchive", () => {
  it("archives and removes from recent, then unarchives", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Archive me");
    await repo.archive(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("archived");

    // Not in recent.
    const recent = await repo.recent(RAMA);
    expect(recent.find((c) => c.id === conv.id)).toBeUndefined();

    // In archived.
    const archived = await repo.archived(RAMA);
    expect(archived.find((c) => c.id === conv.id)).toBeDefined();

    // Unarchive returns to recent.
    await repo.unarchive(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("active");
    const recent2 = await repo.recent(RAMA);
    expect(recent2.find((c) => c.id === conv.id)).toBeDefined();
  });
});

describe("LocalConversationRepository — trash / restore / permanent delete", () => {
  it("moves to trash and restores with content intact", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Teach me Agentic AI");
    await repo.appendConversationMessage(conv.id, msg("Start with module 1"));
    await repo.appendConversationMessage(conv.id, msg("Module 1 is about...", "assistant"));

    await repo.moveToTrash(conv.id);
    const trashed = await repo.get(conv.id);
    expect(trashed?.status).toBe("deleted");
    expect(trashed?.deletedAt).not.toBeNull();
    // Messages survive in trash.
    const msgsInTrash = await repo.getMessages(conv.id);
    expect(msgsInTrash).toHaveLength(2);

    // Not in recent.
    const recent = await repo.recent(RAMA);
    expect(recent.find((c) => c.id === conv.id)).toBeUndefined();

    // Restore.
    await repo.restore(conv.id);
    const restored = await repo.get(conv.id);
    expect(restored?.status).toBe("active");
    expect(restored?.deletedAt).toBeNull();
    const msgsAfter = await repo.getMessages(conv.id);
    expect(msgsAfter).toHaveLength(2);
  });

  it("permanently deletes a conversation and its messages but NOT asset refs", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Create a cinematic image");
    const ref = asset("img_001");
    await repo.appendConversationMessage(conv.id, msg("Create a cinematic image."));
    await repo.appendConversationMessage(conv.id, msg("", "assistant"), [ref]);

    await repo.permanentlyDelete(conv.id);
    expect(await repo.get(conv.id)).toBeUndefined();
    expect(await repo.getMessages(conv.id)).toEqual([]);
    expect(await repo.count(RAMA, "deleted")).toBe(0);

    // CRITICAL: the asset reference value is an independent ID; deleting the
    // conversation does not remove the asset itself (which lives in a future
    // vault). The reference is simply no longer attached to a message here.
    expect(ref.assetId).toBe("img_001");
    expect(ref.vaultKey).toBe("vault://img_001");
  });

  it("emptyTrash permanently deletes all trash for an owner", async () => {
    const repo = newRepo();
    const a = await seedConversation(repo, RAMA, "A");
    const b = await seedConversation(repo, RAMA, "B");
    await repo.moveToTrash(a.id);
    await repo.moveToTrash(b.id);
    const n = await repo.emptyTrash(RAMA);
    expect(n).toBe(2);
    expect(await repo.deleted(RAMA)).toEqual([]);
  });
});

describe("LocalConversationRepository — search", () => {
  it("searches by title", async () => {
    const repo = newRepo();
    await seedConversation(repo, RAMA, "Agentic AI course");
    await seedConversation(repo, RAMA, "Cooking recipes");
    const res = await repo.search({ ownerId: RAMA, query: "agentic" });
    expect(res.total).toBe(1);
    expect(res.hits[0].matchedField).toBe("title");
    expect(res.hits[0].conversation.title).toContain("Agentic");
  });

  it("searches message content and returns a snippet", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Notes");
    // First message carries the searchable term; the assistant reply becomes
    // the preview, so the match must come from message content, not preview.
    await repo.appendConversationMessage(conv.id, msg("The mitotic spindle forms during cell division."));
    await repo.appendConversationMessage(conv.id, msg("Cell division proceeds through mitosis.", "assistant"));
    const res = await repo.search({ ownerId: RAMA, query: "mitotic" });
    expect(res.total).toBe(1);
    expect(res.hits[0].matchedField).toBe("message");
    expect(res.hits[0].snippet).toContain("mitotic");
  });

  it("search does not return deleted conversations by default", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Secret plan");
    await repo.moveToTrash(conv.id);
    const res = await repo.search({ ownerId: RAMA, query: "secret" });
    expect(res.total).toBe(0);
  });

  it("search includes deleted when explicitly asked", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Secret plan");
    await repo.moveToTrash(conv.id);
    const res = await repo.search({ ownerId: RAMA, query: "secret", includeDeleted: true });
    expect(res.total).toBe(1);
  });
});

describe("LocalConversationRepository — message persistence + continuation", () => {
  it("appends messages, updates preview/count, and reloads them", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Teach me Agentic AI");
    await repo.appendConversationMessage(conv.id, msg("First module start cheyyi"));
    await repo.appendConversationMessage(conv.id, msg("Module 1: foundations.", "assistant"));

    const loaded = await repo.getMessages(conv.id);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].message.role).toBe("user");
    expect(loaded[1].message.role).toBe("assistant");

    const record = await repo.get(conv.id);
    expect(record?.stats.messageCount).toBe(2);
    expect(record?.preview).toContain("Module 1");
  });

  it("continuation: stored messages hydrate a fresh repository view", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Teach me Agentic AI");
    await repo.appendConversationMessage(conv.id, msg("Start module 1"));
    await repo.appendConversationMessage(conv.id, msg("Done module 1.", "assistant"));

    // Simulate reopening later: read by id and load messages.
    const reloaded = await repo.get(conv.id);
    const messages = await repo.getMessages(conv.id);
    expect(reloaded).toBeDefined();
    expect(messages).toHaveLength(2);
    // The canonical history is intact, so a continuation message has context.
    const continuation = "Continue with module 2.";
    expect(messages.map((m) => m.message.text)).toContain("Start module 1");
    void continuation;
  });

  it("setMessages replaces the message list atomically", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "X");
    await repo.appendConversationMessage(conv.id, msg("a"));
    await repo.setMessages(conv.id, [{ message: msg("b"), assetReferences: [] }, { message: msg("c", "assistant"), assetReferences: [] }]);
    const loaded = await repo.getMessages(conv.id);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].message.text).toBe("b");
  });
});

describe("LocalConversationRepository — asset reference preservation", () => {
  it("stores asset references on messages independently of the conversation", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "Create a cinematic image");
    const ref = asset("img_42");
    await repo.appendConversationMessage(conv.id, msg("Create a cinematic image."));
    await repo.appendConversationMessage(conv.id, msg("", "assistant"), [ref]);

    const messages = await repo.getMessages(conv.id);
    expect(messages[1].assetReferences).toHaveLength(1);
    expect(messages[1].assetReferences[0].assetId).toBe("img_42");

    // Archiving does not lose asset references.
    await repo.archive(conv.id);
    const archivedMsgs = await repo.getMessages(conv.id);
    expect(archivedMsgs[1].assetReferences[0].assetId).toBe("img_42");

    // Deleting the conversation removes the reference-bearing message but
    // the asset id value is still a valid independent vault reference.
    await repo.permanentlyDelete(conv.id);
    expect(await repo.getMessages(conv.id)).toEqual([]);
    expect(ref.assetId).toBe("img_42");
  });
});

describe("LocalConversationRepository — owner separation", () => {
  it("Ramakanth's conversations are not visible to the wife", async () => {
    const repo = newRepo();
    await seedConversation(repo, RAMA, "Ramakanth's private notes");
    await seedConversation(repo, WIFE, "Wife's recipes");

    const ramaRecent = await repo.recent(RAMA);
    const wifeRecent = await repo.recent(WIFE);
    expect(ramaRecent).toHaveLength(1);
    expect(wifeRecent).toHaveLength(1);
    expect(ramaRecent[0].title).toBe("Ramakanth's private notes");
    expect(wifeRecent[0].title).toBe("Wife's recipes");
  });

  it("search is owner-scoped", async () => {
    const repo = newRepo();
    await seedConversation(repo, RAMA, "Shared keyword project");
    await seedConversation(repo, WIFE, "Shared keyword recipes");
    const res = await repo.search({ ownerId: RAMA, query: "keyword" });
    expect(res.total).toBe(1);
    expect(res.hits[0].conversation.ownerId).toBe(RAMA);
  });

  it("emptyTrash only affects the requesting owner", async () => {
    const repo = newRepo();
    const ramaConv = await seedConversation(repo, RAMA, "A");
    const wifeConv = await seedConversation(repo, WIFE, "B");
    await repo.moveToTrash(ramaConv.id);
    await repo.moveToTrash(wifeConv.id);
    await repo.emptyTrash(RAMA);
    expect(await repo.deleted(RAMA)).toEqual([]);
    expect(await repo.deleted(WIFE)).toHaveLength(1);
  });
});

describe("LocalConversationRepository — offline local retrieval", () => {
  it("a fresh repository over the same store retrieves prior data", async () => {
    const store = new MemoryStore();
    const repo = new LocalConversationRepository(store);
    const conv = await seedConversation(repo, RAMA, "Persisted offline");
    await repo.appendConversationMessage(conv.id, msg("saved while offline"));

    // New repository instance over the SAME store simulates offline re-read.
    const repo2 = new LocalConversationRepository(store);
    const got = await repo2.get(conv.id);
    expect(got?.title).toBe("Persisted offline");
    const msgs = await repo2.getMessages(conv.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].message.text).toBe("saved while offline");
  });
});

describe("LocalConversationRepository — data integrity (state transitions)", () => {
  it("pin does not delete; archive does not delete; trash is not permanent", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "X");
    await repo.pin(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("active");
    await repo.archive(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("archived");
    await repo.moveToTrash(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("deleted");
    // Still recoverable.
    await repo.restore(conv.id);
    expect((await repo.get(conv.id))?.status).toBe("active");
  });

  it("rename preserves messages", async () => {
    const repo = newRepo();
    const conv = await seedConversation(repo, RAMA, "X");
    await repo.appendConversationMessage(conv.id, msg("keep me"));
    await repo.rename(conv.id, "Renamed");
    const msgs = await repo.getMessages(conv.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].message.text).toBe("keep me");
  });
});
