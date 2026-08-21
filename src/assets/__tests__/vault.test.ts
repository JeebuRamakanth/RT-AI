/**
 * Asset Vault domain tests — repository lifecycle, search/filter/sort,
 * collections, tags, versions, binary storage, and the critical
 * independence rule: CHAT DELETE ≠ ASSET DELETE (and vice versa).
 */

import { describe, it, expect } from "vitest";
import { LocalAssetRepository } from "@/assets/repository";
import { MemoryAssetStorage } from "@/assets/storage";
import { MemoryStore } from "@/conversations/storage";
import {
  typeFromMime,
  typeFromFileName,
  formatBytes,
  hasBytes,
  isInTrash,
  type AssetEvent,
  type NewAssetInput,
} from "@/assets";
import { LocalConversationRepository } from "@/conversations/repository";
import { generateTitle } from "@/conversations";

const OWNER = "ramakanth";
const OTHER_OWNER = "wife";

function input(overrides: Partial<NewAssetInput> = {}): NewAssetInput {
  return {
    ownerId: OWNER,
    name: "Sample.png",
    type: "image",
    mimeType: "image/png",
    size: 2048,
    source: "uploaded",
    storageReference: "blob:sample",
    ...overrides,
  };
}

function makeRepo() {
  return new LocalAssetRepository(new MemoryStore());
}

describe("asset registration & retrieval", () => {
  it("registers an asset with defaults and returns it by id", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    expect(asset.id).toMatch(/^asset_/);
    expect(asset.version).toBe(1);
    expect(asset.parentAssetId).toBeNull();
    expect(asset.favorite).toBe(false);
    expect(asset.deletedAt).toBeNull();
    expect(asset.status).toBe("ready");
    expect(hasBytes(asset)).toBe(true);
    const fetched = await repo.get(asset.id);
    expect(fetched?.name).toBe("Sample.png");
  });

  it("marks assets without storage as missing-bytes, honestly", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input({ storageReference: null }));
    expect(asset.status).toBe("missing-bytes");
    expect(hasBytes(asset)).toBe(false);
  });

  it("scopes every operation by owner", async () => {
    const repo = makeRepo();
    await repo.register(input());
    const others = await repo.list({ ownerId: OTHER_OWNER });
    expect(others).toHaveLength(0);
    const counts = await repo.counts(OTHER_OWNER);
    expect(counts.active).toBe(0);
  });
});

describe("trash / restore / permanent delete", () => {
  it("soft-deletes to trash, restores, and permanently deletes", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());

    const trashed = await repo.moveToTrash(asset.id);
    expect(trashed.deletedAt).not.toBeNull();
    expect(isInTrash(trashed)).toBe(true);
    expect(await repo.list({ ownerId: OWNER })).toHaveLength(0);
    expect(await repo.list({ ownerId: OWNER, trashOnly: true })).toHaveLength(1);

    const restored = await repo.restore(asset.id);
    expect(restored.deletedAt).toBeNull();
    expect(await repo.list({ ownerId: OWNER })).toHaveLength(1);

    await repo.moveToTrash(asset.id);
    await repo.permanentlyDelete(asset.id);
    expect(await repo.get(asset.id)).toBeUndefined();
  });

  it("trash clears favorite so the favorites view stays clean", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    await repo.setFavorite(asset.id, true);
    const trashed = await repo.moveToTrash(asset.id);
    expect(trashed.favorite).toBe(false);
  });

  it("emptyTrash removes only trashed assets", async () => {
    const repo = makeRepo();
    const keep = await repo.register(input({ name: "keep.png" }));
    const drop = await repo.register(input({ name: "drop.png" }));
    await repo.moveToTrash(drop.id);
    const n = await repo.emptyTrash(OWNER);
    expect(n).toBe(1);
    expect(await repo.get(keep.id)).toBeDefined();
    expect(await repo.get(drop.id)).toBeUndefined();
  });
});

describe("favorites, archive, tags", () => {
  it("toggles favorite persistently", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    await repo.setFavorite(asset.id, true);
    expect((await repo.get(asset.id))?.favorite).toBe(true);
    expect(await repo.list({ ownerId: OWNER, favoritesOnly: true })).toHaveLength(1);
    await repo.setFavorite(asset.id, false);
    expect(await repo.list({ ownerId: OWNER, favoritesOnly: true })).toHaveLength(0);
  });

  it("archives out of the default view but keeps it queryable", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    await repo.setArchived(asset.id, true);
    expect(await repo.list({ ownerId: OWNER })).toHaveLength(0);
    expect(await repo.list({ ownerId: OWNER, archivedOnly: true })).toHaveLength(1);
  });

  it("adds and removes tags without duplication", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    await repo.addTag(asset.id, "#genai");
    await repo.addTag(asset.id, "genai");
    expect((await repo.get(asset.id))?.tags).toEqual(["genai"]);
    await repo.addTag(asset.id, "course");
    await repo.removeTag(asset.id, "genai");
    expect((await repo.get(asset.id))?.tags).toEqual(["course"]);
  });
});

describe("list filters & sorting", () => {
  async function seed(repo: LocalAssetRepository) {
    // Small spacing so createdAt differs — same-millisecond registrations
    // tie on purpose (stable sort keeps insertion order).
    const tick = () => new Promise((r) => setTimeout(r, 2));
    const a = await repo.register(input({ name: "alpha.png", type: "image", mimeType: "image/png", size: 100 }));
    await tick();
    const b = await repo.register(input({ name: "beta.mp4", type: "video", mimeType: "video/mp4", size: 9000 }));
    await tick();
    const c = await repo.register(input({ name: "gamma.pdf", type: "pdf", mimeType: "application/pdf", size: 500, source: "generated" }));
    return { a, b, c };
  }

  it("filters by type and source", async () => {
    const repo = makeRepo();
    await seed(repo);
    expect(await repo.list({ ownerId: OWNER, type: "image" })).toHaveLength(1);
    expect(await repo.list({ ownerId: OWNER, type: "pdf" })).toHaveLength(1);
    expect(await repo.list({ ownerId: OWNER, source: "generated" })).toHaveLength(1);
    expect(await repo.list({ ownerId: OWNER, source: "uploaded" })).toHaveLength(2);
  });

  it("sorts newest, oldest, name, size, updated", async () => {
    const repo = makeRepo();
    const { a, b, c } = await seed(repo);
    const newest = await repo.list({ ownerId: OWNER, sort: "newest" });
    expect(newest[0].id).toBe(c.id);
    const oldest = await repo.list({ ownerId: OWNER, sort: "oldest" });
    expect(oldest[0].id).toBe(a.id);
    const byName = await repo.list({ ownerId: OWNER, sort: "name" });
    expect(byName.map((x) => x.name)).toEqual(["alpha.png", "beta.mp4", "gamma.pdf"]);
    const bySize = await repo.list({ ownerId: OWNER, sort: "size" });
    expect(bySize[0].id).toBe(b.id);
    await repo.setFavorite(a.id, true);
    const byUpdated = await repo.list({ ownerId: OWNER, sort: "updated" });
    expect(byUpdated[0].id).toBe(a.id);
  });
});

describe("search across persisted assets", () => {
  it("matches name, type, tags, source, and metadata — not rendered state", async () => {
    const repo = makeRepo();
    const asset = await repo.register(
      input({ name: "Brand Logo v2.png", tags: ["logo", "genai"], metadata: { project: "arti" } }),
    );

    expect((await repo.search({ ownerId: OWNER, query: "brand" })).hits[0].matchedField).toBe("name");
    expect((await repo.search({ ownerId: OWNER, query: "logo" })).hits.length).toBeGreaterThan(0);
    expect((await repo.search({ ownerId: OWNER, query: "uploaded" })).hits[0].matchedField).toBe("source");
    expect((await repo.search({ ownerId: OWNER, query: "arti" })).hits[0].matchedField).toBe("metadata");
    expect((await repo.search({ ownerId: OWNER, query: "image/png" })).hits[0].asset.id).toBe(asset.id);
    expect((await repo.search({ ownerId: OWNER, query: "nonexistent" })).total).toBe(0);
  });

  it("excludes trashed assets from search unless requested", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input({ name: "trashed-find-me.png" }));
    await repo.moveToTrash(asset.id);
    expect((await repo.search({ ownerId: OWNER, query: "find-me" })).total).toBe(0);
    expect((await repo.search({ ownerId: OWNER, query: "find-me", includeTrash: true })).total).toBe(1);
  });
});

describe("collections", () => {
  it("creates collections, assigns assets to many, and deletes without touching assets", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    const projects = await repo.createCollection({ ownerId: OWNER, name: "AI Projects" });
    const courses = await repo.createCollection({ ownerId: OWNER, name: "Course Assets" });

    await repo.addToCollection(asset.id, projects.id);
    await repo.addToCollection(asset.id, courses.id);
    let fetched = await repo.get(asset.id);
    expect(fetched?.collectionIds.sort()).toEqual([courses.id, projects.id].sort());

    expect(await repo.list({ ownerId: OWNER, collectionId: projects.id })).toHaveLength(1);
    expect((await repo.listCollections(OWNER)).map((c) => c.name)).toEqual(["AI Projects", "Course Assets"]);

    await repo.deleteCollection(projects.id);
    fetched = await repo.get(asset.id);
    expect(fetched?.collectionIds).toEqual([courses.id]);
    expect(fetched).toBeDefined(); // asset survives collection deletion
  });

  it("rejects adding assets to unknown collections", async () => {
    const repo = makeRepo();
    const asset = await repo.register(input());
    await expect(repo.addToCollection(asset.id, "acol_nope")).rejects.toThrow();
  });
});

describe("versions", () => {
  it("links versions through parentAssetId with increasing version numbers", async () => {
    const repo = makeRepo();
    const v1 = await repo.register(input({ name: "Logo.png" }));
    const v2 = await repo.register(input({ name: "Logo.png", parentAssetId: v1.id }));
    const v3 = await repo.register(input({ name: "Logo.png", parentAssetId: v1.id }));
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
    const lineage = await repo.versions(v2.id);
    expect(lineage.map((a) => a.version)).toEqual([1, 2, 3]);
  });
});

describe("binary storage", () => {
  it("round-trips bytes and reports persistence honestly", async () => {
    const storage = new MemoryAssetStorage();
    expect(storage.persistent).toBe(false);
    const ref = await storage.put("asset_x", new Blob(["hello"], { type: "text/plain" }), "text/plain");
    const back = await storage.get(ref);
    expect(back?.mimeType).toBe("text/plain");
    expect(await back?.blob.text()).toBe("hello");
    await storage.delete(ref);
    expect(await storage.get(ref)).toBeUndefined();
  });
});

describe("conversation independence (CHAT DELETE ≠ ASSET DELETE)", () => {
  it("assets survive permanent conversation deletion, and vice versa", async () => {
    const store = new MemoryStore();
    const assets = new LocalAssetRepository(store);
    const conversations = new LocalConversationRepository(store);

    // A conversation referencing an asset, then deleted permanently.
    const conv = await conversations.create({
      ownerId: OWNER,
      title: generateTitle("logo ideas", "en"),
      titleAuto: true,
      language: "en",
      style: {
        language: "en",
        secondaryLanguage: null,
        isMixedLanguage: false,
        formality: "neutral",
        tone: "neutral",
        verbosity: "balanced",
        technicalLevel: "intermediate",
        emojiPreference: "none",
      },
    });
    const asset = await assets.register(
      input({
        name: "Generated Logo.png",
        source: "generated",
        sourceRef: {
          conversationId: conv.id,
          conversationTitle: conv.title,
          messageId: "user_abc",
        },
      }),
    );

    await conversations.permanentlyDelete(conv.id);
    expect(await conversations.get(conv.id)).toBeUndefined();
    // The asset remains, with provenance intact.
    const surviving = await assets.get(asset.id);
    expect(surviving).toBeDefined();
    expect(surviving?.sourceRef.conversationId).toBe(conv.id);

    // And deleting the asset never touches other conversations.
    const other = await conversations.create({
      ownerId: OWNER,
      title: "kept chat",
      titleAuto: false,
      language: "en",
      style: {
        language: "en",
        secondaryLanguage: null,
        isMixedLanguage: false,
        formality: "neutral",
        tone: "neutral",
        verbosity: "balanced",
        technicalLevel: "intermediate",
        emojiPreference: "none",
      },
    });
    await assets.permanentlyDelete(asset.id);
    expect(await conversations.get(other.id)).toBeDefined();
  });

  it("publishes vault events for a future notification center", async () => {
    const repo = makeRepo();
    const events: AssetEvent[] = [];
    const unsub = repo.subscribe((e) => events.push(e));
    const asset = await repo.register(input());
    await repo.setFavorite(asset.id, true);
    await repo.moveToTrash(asset.id);
    await repo.restore(asset.id);
    unsub();
    await repo.setFavorite(asset.id, false);
    expect(events.map((e) => e.type)).toEqual([
      "asset.uploaded",
      "asset.favorited",
      "asset.trashed",
      "asset.restored",
    ]);
  });
});

describe("type & formatting helpers", () => {
  it("maps MIME types to canonical asset types", () => {
    expect(typeFromMime("image/png")).toBe("image");
    expect(typeFromMime("video/mp4")).toBe("video");
    expect(typeFromMime("audio/mpeg")).toBe("audio");
    expect(typeFromMime("application/pdf")).toBe("pdf");
    expect(typeFromMime("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("presentation");
    expect(typeFromMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("spreadsheet");
    expect(typeFromMime("application/msword")).toBe("document");
    expect(typeFromMime("application/json")).toBe("code");
    expect(typeFromMime("application/octet-stream", "model.bin")).toBe("other");
  });

  it("falls back to extension when MIME is generic", () => {
    expect(typeFromMime("application/octet-stream", "deck.pptx")).toBe("presentation");
    expect(typeFromFileName("notes.md")).toBe("document");
    expect(typeFromFileName("app.tsx")).toBe("code");
    expect(typeFromFileName("archive.zip")).toBe("other");
  });

  it("formats bytes without fabrication", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(-3)).toBe("0 B");
  });
});

describe("counts", () => {
  it("tracks active, favorites, archived, trash", async () => {
    const repo = makeRepo();
    const a = await repo.register(input({ name: "a.png" }));
    const b = await repo.register(input({ name: "b.png" }));
    const c = await repo.register(input({ name: "c.png" }));
    await repo.register(input({ name: "d.png" }));
    await repo.setFavorite(a.id, true);
    await repo.setArchived(b.id, true);
    await repo.moveToTrash(c.id);
    const counts = await repo.counts(OWNER);
    expect(counts).toEqual({ active: 2, favorites: 1, archived: 1, trash: 1 });
  });
});
