/**
 * Storage backend abstraction.
 *
 * The repository does NOT talk to IndexedDB (or localStorage) directly.
 * It talks to a `KeyValueStore` — an async key/value map with a few
 * collection helpers. Two implementations ship:
 *
 *  - `IndexedDbStore`  — local-first, offline-capable, used in the browser.
 *  - `MemoryStore`     — in-memory, used in tests and SSR/Node contexts.
 *
 * A future remote/synced backend can implement this interface (or a richer
 * one layered on top) and replace the local store without touching the
 * repository or UI. This is the "Local Storage + Remote Storage + Sync
 * Engine" extension point: the KV contract is the seam a sync layer wraps.
 */

export interface KeyValueStore {
  /** Get a single value by key, or undefined. */
  get<T>(key: string): Promise<T | undefined>;
  /** Set a value, overwriting any existing one. */
  set<T>(key: string, value: T): Promise<void>;
  /** Delete a key. No-op if missing. */
  delete(key: string): Promise<void>;
  /** List all keys with the given prefix. */
  keys(prefix: string): Promise<string[]>;
  /** Read all values whose key starts with prefix. */
  entries<T>(prefix: string): Promise<Array<{ key: string; value: T }>>;
  /** Remove all keys with the given prefix. */
  clearPrefix(prefix: string): Promise<void>;
  /** True when the backend persists across reloads. */
  readonly persistent: boolean;
}

/* ------------------------------------------------------------------ */
/* Memory store (tests / Node)                                         */
/* ------------------------------------------------------------------ */

export class MemoryStore implements KeyValueStore {
  readonly persistent = false;
  private map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
  async keys(prefix: string): Promise<string[]> {
    return Array.from(this.map.keys()).filter((k) => k.startsWith(prefix));
  }
  async entries<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    const out: Array<{ key: string; value: T }> = [];
    for (const [key, value] of this.map.entries()) {
      if (key.startsWith(prefix)) out.push({ key, value: value as T });
    }
    return out;
  }
  async clearPrefix(prefix: string): Promise<void> {
    for (const key of Array.from(this.map.keys())) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB store                                                     */
/* ------------------------------------------------------------------ */

const DB_NAME = "rt-ai";
const DB_VERSION = 1;
const STORE_NAME = "kv";

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

/**
 * IndexedDB-backed KV store. Each key maps to a structured-clonable value
 * (plain JSON-serializable objects). Offline-first: data survives reloads
 * and is available without network.
 */
export class IndexedDbStore implements KeyValueStore {
  readonly persistent = true;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallback: KeyValueStore | null = null;

  private db(): Promise<IDBDatabase> {
    if (this.fallback) return Promise.reject(new Error("fallback"));
    if (!this.dbPromise) {
      this.dbPromise = openDb().catch((err) => {
        // Degrade gracefully to an in-memory store if IndexedDB is blocked
        // (private mode, permissions, SSR). Persistence is lost but the app
        // still works for the session.
        this.fallback = new MemoryStore();
        this.dbPromise = null;
        void err;
        return openDb();
      }).then(undefined, () => {
        if (!this.fallback) this.fallback = new MemoryStore();
        return Promise.reject(new Error("fallback"));
      });
    }
    return this.dbPromise;
  }

  private async withFallback(): Promise<KeyValueStore | null> {
    try {
      await this.db();
      return null;
    } catch {
      return this.fallback;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const fb = await this.withFallback();
    if (fb) return fb.get<T>(key);
    const db = await this.db();
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error ?? new Error("get failed"));
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const fb = await this.withFallback();
    if (fb) return fb.set<T>(key, value);
    const db = await this.db();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("set failed"));
    });
  }

  async delete(key: string): Promise<void> {
    const fb = await this.withFallback();
    if (fb) return fb.delete(key);
    const db = await this.db();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("delete failed"));
    });
  }

  async keys(prefix: string): Promise<string[]> {
    const fb = await this.withFallback();
    if (fb) return fb.keys(prefix);
    const db = await this.db();
    return new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => {
        const all = req.result as IDBValidKey[];
        resolve(all.filter((k) => String(k).startsWith(prefix)).map(String));
      };
      req.onerror = () => reject(req.error ?? new Error("keys failed"));
    });
  }

  async entries<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    const fb = await this.withFallback();
    if (fb) return fb.entries<T>(prefix);
    const db = await this.db();
    return new Promise<Array<{ key: string; value: T }>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const out: Array<{ key: string; value: T }> = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(out);
          return;
        }
        const key = String(cursor.key);
        if (key.startsWith(prefix)) {
          out.push({ key, value: cursor.value as T });
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error("entries failed"));
    });
  }

  async clearPrefix(prefix: string): Promise<void> {
    const fb = await this.withFallback();
    if (fb) return fb.clearPrefix(prefix);
    const db = await this.db();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(prefix)) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("clearPrefix failed"));
    });
  }
}

/** Pick the best available store for the current environment. */
export function createDefaultStore(): KeyValueStore {
  if (typeof indexedDB !== "undefined") {
    return new IndexedDbStore();
  }
  return new MemoryStore();
}
