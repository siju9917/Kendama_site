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

class ChromeKv implements KVStore {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).chrome?.storage?.local;
      if (!api) return resolve(null);
      api.get(key, (items: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (globalThis as any).chrome?.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve((items[key] as T) ?? null);
      });
    });
  }
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).chrome?.storage?.local;
      if (!api) return resolve();
      api.set({ [key]: value }, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (globalThis as any).chrome?.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve();
      });
    });
  }
  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (globalThis as any).chrome?.storage?.local;
      if (!api) return resolve();
      api.remove(key, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (globalThis as any).chrome?.runtime?.lastError;
        if (err) return reject(new Error(err.message));
        resolve();
      });
    });
  }
}

export function makeKv(): KVStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).chrome !== "undefined" && (globalThis as any).chrome?.storage?.local) {
    return new ChromeKv();
  }
  return new MemoryKv();
}

// --- The actual storage implementation ----------------------------------

export class DiffStorage implements IStorage {
  constructor(private readonly kv: KVStore = makeKv()) {}

  /**
   * A single chain of in-flight mutations so concurrent saveDiff /
   * deleteDiff / markViewed calls do not interleave their read-modify-
   * write of the index. chrome.storage offers no transactions; without
   * this lock, two simultaneous saves from two side-panel windows
   * could lose an entry (both read [], both write their own [x]).
   */
  private mutationQueue: Promise<void> = Promise.resolve();

  private async serialize<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.mutationQueue;
    let resolveNext!: () => void;
    this.mutationQueue = new Promise<void>((r) => (resolveNext = r));
    await prev;
    try {
      return await fn();
    } finally {
      resolveNext();
    }
  }

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
    return this.serialize(() => this._saveDiff(result));
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
        lastViewedAt: null,
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
    return this.serialize(async () => {
      const idx = await this.readIndex();
      const e = idx.entries.find((x) => x.id === id);
      if (!e) return;
      e.lastViewedAt = new Date().toISOString();
      e.lastAccess = Date.now();
      await this.writeIndex(idx);
    });
  }

  async getDiff(id: string): Promise<DiffResult | null> {
    const idx = await this.readIndex();
    const e = idx.entries.find((x) => x.id === id);
    let payload: string | null = null;
    if (e?.storage === "idb") {
      payload = await idbGet(id);
    } else {
      payload = await this.kv.get<string>(PAYLOAD_PREFIX + id);
    }
    if (!payload) return null;
    // Touch last-access.
    if (e) {
      e.lastAccess = Date.now();
      await this.writeIndex(idx);
    }
    return JSON.parse(payload) as DiffResult;
  }

  async deleteDiff(id: string): Promise<void> {
    return this.serialize(async () => {
      const idx = await this.readIndex();
      const e = idx.entries.find((x) => x.id === id);
      if (e?.storage === "idb") await idbDelete(id);
      else await this.kv.remove(PAYLOAD_PREFIX + id);
      idx.entries = idx.entries.filter((x) => x.id !== id);
      await this.writeIndex(idx);
    });
  }

  async pruneToLimit(maxBytes: number): Promise<void> {
    return this.serialize(() => this._pruneToLimit(maxBytes));
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
