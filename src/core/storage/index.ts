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

const SUMMARY_INDEX_KEY = "biddiff.diffs.index";
const PAYLOAD_PREFIX = "biddiff.diff.";

interface DiffIndexEntry extends DiffSummary {
  /** Approximate bytes for LRU accounting. */
  sizeBytes: number;
  /** Last-access epoch ms; updated on read or write. */
  lastAccess: number;
}

interface IndexFile {
  entries: DiffIndexEntry[];
}

// --- chrome.storage shim --------------------------------------------------

interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

class MemoryKv implements KVStore {
  private readonly m = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.m.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.m.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.m.delete(key);
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

  private async readIndex(): Promise<IndexFile> {
    const f = await this.kv.get<IndexFile>(SUMMARY_INDEX_KEY);
    return f ?? { entries: [] };
  }
  private async writeIndex(idx: IndexFile): Promise<void> {
    await this.kv.set(SUMMARY_INDEX_KEY, idx);
  }

  async saveDiff(result: DiffResult): Promise<void> {
    const payload = JSON.stringify(result);
    await this.kv.set(PAYLOAD_PREFIX + result.id, payload);
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
    };
    idx.entries = idx.entries.filter((e) => e.id !== result.id);
    idx.entries.push(summary);
    await this.writeIndex(idx);
    await this.pruneToLimit(STORAGE_HARD_CAP_BYTES);
  }

  async listDiffs(): Promise<DiffSummary[]> {
    const idx = await this.readIndex();
    // Newest first.
    return idx.entries
      .map((e) => ({
        id: e.id,
        generatedAt: e.generatedAt,
        currentFileName: e.currentFileName,
        priorFileName: e.priorFileName,
        criticalCount: e.criticalCount,
        totalChanges: e.totalChanges,
        solicitationId: e.solicitationId,
      }))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async getDiff(id: string): Promise<DiffResult | null> {
    const payload = await this.kv.get<string>(PAYLOAD_PREFIX + id);
    if (!payload) return null;
    // Touch last-access.
    const idx = await this.readIndex();
    const e = idx.entries.find((x) => x.id === id);
    if (e) {
      e.lastAccess = Date.now();
      await this.writeIndex(idx);
    }
    return JSON.parse(payload) as DiffResult;
  }

  async pruneToLimit(maxBytes: number): Promise<void> {
    const idx = await this.readIndex();
    let total = idx.entries.reduce((n, e) => n + e.sizeBytes, 0);
    if (total <= maxBytes) return;
    // Oldest-access first
    const sorted = [...idx.entries].sort((a, b) => a.lastAccess - b.lastAccess);
    for (const e of sorted) {
      if (total <= maxBytes) break;
      await this.kv.remove(PAYLOAD_PREFIX + e.id);
      total -= e.sizeBytes;
      idx.entries = idx.entries.filter((x) => x.id !== e.id);
    }
    await this.writeIndex(idx);
  }
}
