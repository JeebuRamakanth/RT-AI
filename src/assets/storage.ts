/**
 * Asset binary storage — the layer that owns actual file bytes.
 *
 * Deliberately separate from asset metadata (the repository). Bytes are
 * NEVER stored in React state, localStorage JSON, or the metadata KV store.
 * Two implementations ship:
 *
 *  - `IndexedDbAssetStorage` — Blobs in a dedicated IndexedDB database.
 *    Local-first, offline-capable, survives reloads.
 *  - `MemoryAssetStorage`   — in-memory Blob map for tests/SSR. Not
 *    persistent; `persistent = false` lets callers be honest about that.
 *
 * A future cloud/object-storage backend implements this same interface —
 * the repository and UI do not change.
 */

export interface StoredBinary {
  blob: Blob;
  mimeType: string;
}

export interface AssetStorage {
  /** Persist bytes; returns the storage reference the metadata records. */
  put(key: string, blob: Blob, mimeType: string): Promise<string>;
  /** Read bytes back, or undefined when the reference is unknown. */
  get(key: string): Promise<StoredBinary | undefined>;
  /** Remove bytes. No-op if missing. */
  delete(key: string): Promise<void>;
  /** True when bytes survive reloads (IndexedDB) vs session-only (memory). */
  readonly persistent: boolean;
}

/* ------------------------------------------------------------------ */
/* Memory storage (tests / Node)                                       */
/* ------------------------------------------------------------------ */

export class MemoryAssetStorage implements AssetStorage {
  readonly persistent = false;
  private map = new Map<string, StoredBinary>();

  async put(key: string, blob: Blob, mimeType: string): Promise<string> {
    this.map.set(key, { blob, mimeType });
    return key;
  }
  async get(key: string): Promise<StoredBinary | undefined> {
    return this.map.get(key);
  }
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB storage (browser)                                         */
/* ------------------------------------------------------------------ */

const DB_NAME = "rt-ai-assets";
const DB_VERSION = 1;
const STORE_NAME = "binaries";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export class IndexedDbAssetStorage implements AssetStorage {
  readonly persistent = true;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallback: MemoryAssetStorage | null = null;

  private db(): Promise<IDBDatabase> {
    if (this.fallback) return Promise.reject(new Error("fallback"));
    if (!this.dbPromise) {
      this.dbPromise = openDb().catch(() => {
        // Degrade gracefully when IndexedDB is blocked (private mode etc.):
        // session-only bytes, but the app keeps working honestly.
        this.fallback = new MemoryAssetStorage();
        this.dbPromise = null;
        return Promise.reject(new Error("fallback"));
      });
    }
    return this.dbPromise;
  }

  private async withFallback(): Promise<MemoryAssetStorage | null> {
    try {
      await this.db();
      return null;
    } catch {
      return this.fallback;
    }
  }

  async put(key: string, blob: Blob, mimeType: string): Promise<string> {
    const fb = await this.withFallback();
    if (fb) return fb.put(key, blob, mimeType);
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ blob, mimeType }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("put failed"));
    });
    return key;
  }

  async get(key: string): Promise<StoredBinary | undefined> {
    const fb = await this.withFallback();
    if (fb) return fb.get(key);
    const db = await this.db();
    return new Promise<StoredBinary | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as StoredBinary | undefined);
      req.onerror = () => reject(req.error ?? new Error("get failed"));
    });
  }

  async delete(key: string): Promise<void> {
    const fb = await this.withFallback();
    if (fb) return fb.delete(key);
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("delete failed"));
    });
  }
}

/** Pick the best available binary storage for the current environment. */
export function createDefaultAssetStorage(): AssetStorage {
  if (typeof indexedDB !== "undefined") {
    return new IndexedDbAssetStorage();
  }
  return new MemoryAssetStorage();
}
