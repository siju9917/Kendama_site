/**
 * Storage layer (Phase 4.10).
 *
 * `chrome.storage` for small metadata and IndexedDB for the large diff
 * payloads, with an LRU prune at the storage cap.
 *
 * In Node/test environments where chrome.storage isn't available, falls
 * back to an in-memory map so the storage code paths can still be unit-tested.
 */
import type { DiffResult } from "../diff/types.js";
import type { DiffSummary, IStorage } from "../interfaces.js";
import { STORAGE_HARD_CAP_BYTES } from "../../shared/constants.js";
import { idbAvailable, idbDelete, idbGet, idbPut } from "./idb.js";

/** A payload larger than this goes to IndexedDB; smaller stays in chrome.storage. */
const PAYLOAD_IDB_THRESHOLD_BYTES = 4 * 1024 * 1024;

const SUMMARY_INDEX_KEY = "biddiff.diffs.index";
const PAYLOAD_PREFIX = "biddiff.diff.";

interface DiffIndexEntry extends DiffSummary {
  /** Approximate bytes for LRU accounting. */
  sizeBytes: number;
  /** Last-access epoch ms; updated on read or write. */
  lastAccess: number;
  /** Where the full payload is stored. */
  storage: "kv" | "idb";
  /** ISO-8601 when the user last opened this diff. null = unseen. */
  lastViewedAt: string | null;
}

interface IndexFile {
  /** Schema version. Bump when DiffIndexEntry shape changes. */
  schemaVersion?: number;
  entries: DiffIndexEntry[];
}

/** Current index schema version. Bump on backwards-incompatible changes. */
const INDEX_SCHEMA_VERSION = 1;

// --- chrome.storage shim --------------------------------------------------

interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * In-memory KV used in test environments and any context without
 * chrome.storage. The backing map is module-level (shared across
 * MemoryKv instances) so it mirrors chrome.storage.local's "single
 * shared store per extension" semantics.
 */
const MEMORY_STORE = new Map<string, unknown>();

/** Reset the in-memory KV. For tests only. No-op in chrome.storage envs. */
export function __resetMemoryKvForTests(): void {
  MEMORY_STORE.clear();
}

class MemoryKv implements KVStore {
  async get<T>(key: string): Promise<T | null> {
    return (MEMORY_STORE.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    MEMORY_STORE.set(key, value);
  }
  async remove(key: string): Promise<void> {
    MEMORY_STORE.delete(key);
  }
}

function chromeLocal(): chrome.storage.LocalStorageArea | undefined {
  return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
}

class ChromeKv implements KVStore {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const api = chromeLocal();
      if (!api) return resolve(null);
      api.get(key, (items: Record<string, unknown>) => {
        const err = chrome.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve((items[key] as T) ?? null);
      });
    });
  }
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const api = chromeLocal();
      if (!api) return resolve();
      api.set({ [key]: value }, () => {
        const err = chrome.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve();
      });
    });
  }
  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const api = chromeLocal();
      if (!api) return resolve();
      api.remove(key, () => {
        const err = chrome.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve();
      });
    });
  }
}

export function makeKv(): KVStore {
  return chromeLocal() ? new ChromeKv() : new MemoryKv();
}

// --- The actual storage implementation ----------------------------------

/**
 * A single chain of in-flight mutations so concurrent saveDiff /
 * deleteDiff / markViewed calls do not interleave their read-modify-
 * write of the index. chrome.storage offers no transactions; without
 * this lock, two simultaneous mutations could lose an entry (both
 * read [], both write their own [x]).
 *
 * Module-level so a DiffStorage instance created on the Options page
 * (e.g. for clearHistory) shares the same lock as the side-panel's
 * instance — chrome.storage.local is a singleton per extension, so
 * the queue must be too.
 */
let mutationQueue: Promise<void> = Promise.resolve();

async function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const prev = mutationQueue;
  let resolveNext!: () => void;
  mutationQueue = new Promise<void>((r) => (resolveNext = r));
  await prev;
  try {
    return await fn();
  } finally {
    resolveNext();
  }
}

export class DiffStorage implements IStorage {
  constructor(private readonly kv: KVStore = makeKv()) {}

  private async readIndex(): Promise<IndexFile> {
    const f = await this.kv.get<IndexFile>(SUMMARY_INDEX_KEY);
    if (!f) return { schemaVersion: INDEX_SCHEMA_VERSION, entries: [] };
    if (!f.entries || !Array.isArray(f.entries)) {
      return { schemaVersion: INDEX_SCHEMA_VERSION, entries: [] };
    }
    const valid = f.entries.filter(
      (e): e is DiffIndexEntry =>
        !!e &&
        typeof e.id === "string" &&
        typeof e.sizeBytes === "number" &&
        typeof e.lastAccess === "number",
    );
    // Future: when INDEX_SCHEMA_VERSION bumps, branch on f.schemaVersion
    // here to migrate older shapes forward.
    return { schemaVersion: INDEX_SCHEMA_VERSION, entries: valid };
  }
  private async writeIndex(idx: IndexFile): Promise<void> {
    await this.kv.set(SUMMARY_INDEX_KEY, { ...idx, schemaVersion: INDEX_SCHEMA_VERSION });
  }

  async saveDiff(result: DiffResult): Promise<void> {
    return serialize(() => this._saveDiff(result));
  }

  private async _saveDiff(result: DiffResult): Promise<void> {
    const payload = JSON.stringify(result);
    const useIdb = payload.length > PAYLOAD_IDB_THRESHOLD_BYTES && (await idbAvailable());

    // Two-phase write so a failure does not leave half-state:
    //   1. Write the payload. If this fails, we throw — index untouched.
    //   2. Write the updated index. If THIS fails, roll the payload back.
    if (useIdb) {
      await idbPut(result.id, payload);
    } else {
      await this.kv.set(PAYLOAD_PREFIX + result.id, payload);
    }

    try {
      const idx = await this.readIndex();
      // If we're overwriting an existing entry (same content hash → same
      // id), preserve its lastViewedAt so a re-run of an already-viewed
      // diff doesn't regress to the "new" badge.
      const existing = idx.entries.find((e) => e.id === result.id);
      const summary: DiffIndexEntry = {
        id: result.id,
        generatedAt: result.generatedAt,
        currentFileName: result.currentDoc.sourceFileName,
        priorFileName: result.priorDoc.sourceFileName,
        criticalCount: result.criticalCount,
        totalChanges: result.changes.length,
        solicitationId: result.currentDoc.solicitationId,
        sizeBytes: payload.length,
        lastAccess: Date.now(),
        storage: useIdb ? "idb" : "kv",
        lastViewedAt: existing?.lastViewedAt ?? null,
      };
      idx.entries = idx.entries.filter((e) => e.id !== result.id);
      idx.entries.push(summary);
      await this.writeIndex(idx);
    } catch (e) {
      // Roll back the payload so we never leave an orphaned write.
      try {
        if (useIdb) await idbDelete(result.id);
        else await this.kv.remove(PAYLOAD_PREFIX + result.id);
      } catch {
        /* best-effort rollback */
      }
      throw e;
    }
    // Already inside the serialize() lock; call the unlocked variant.
    await this._pruneToLimit(STORAGE_HARD_CAP_BYTES);
  }

  async listDiffs(): Promise<DiffSummary[]> {
    const idx = await this.readIndex();
    return idx.entries
      .map((e) => ({
        id: e.id,
        generatedAt: e.generatedAt,
        currentFileName: e.currentFileName,
        priorFileName: e.priorFileName,
        criticalCount: e.criticalCount,
        totalChanges: e.totalChanges,
        solicitationId: e.solicitationId,
        lastViewedAt: e.lastViewedAt ?? null,
      }))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async markViewed(id: string): Promise<void> {
    return serialize(async () => {
      const idx = await this.readIndex();
      const e = idx.entries.find((x) => x.id === id);
      if (!e) return;
      e.lastViewedAt = new Date().toISOString();
      e.lastAccess = Date.now();
      await this.writeIndex(idx);
    });
  }

  async getDiff(id: string): Promise<DiffResult | null> {
    // Read the payload outside the lock (no mutation), then touch
    // last-access inside the lock so concurrent reads don't trample
    // the index.
    const preIdx = await this.readIndex();
    const e = preIdx.entries.find((x) => x.id === id);
    let payload: string | null = null;
    if (e?.storage === "idb") {
      payload = await idbGet(id);
    } else {
      payload = await this.kv.get<string>(PAYLOAD_PREFIX + id);
    }
    if (!payload) return null;
    if (e) {
      await serialize(async () => {
        const idx = await this.readIndex();
        const live = idx.entries.find((x) => x.id === id);
        if (live) {
          live.lastAccess = Date.now();
          await this.writeIndex(idx);
        }
      });
    }
    return JSON.parse(payload) as DiffResult;
  }

  async deleteDiff(id: string): Promise<void> {
    return serialize(async () => {
      const idx = await this.readIndex();
      const e = idx.entries.find((x) => x.id === id);
      if (e?.storage === "idb") await idbDelete(id);
      else await this.kv.remove(PAYLOAD_PREFIX + id);
      idx.entries = idx.entries.filter((x) => x.id !== id);
      await this.writeIndex(idx);
    });
  }

  async pruneToLimit(maxBytes: number): Promise<void> {
    return serialize(() => this._pruneToLimit(maxBytes));
  }

  private async _pruneToLimit(maxBytes: number): Promise<void> {
    const idx = await this.readIndex();
    let total = idx.entries.reduce((n, e) => n + e.sizeBytes, 0);
    if (total <= maxBytes) return;
    // Oldest-access first
    const sorted = [...idx.entries].sort((a, b) => a.lastAccess - b.lastAccess);
    for (const e of sorted) {
      if (total <= maxBytes) break;
      if (e.storage === "idb") await idbDelete(e.id);
      else await this.kv.remove(PAYLOAD_PREFIX + e.id);
      total -= e.sizeBytes;
      idx.entries = idx.entries.filter((x) => x.id !== e.id);
    }
    await this.writeIndex(idx);
  }
}
