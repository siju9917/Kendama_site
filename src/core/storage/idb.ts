/**
 * Tiny IndexedDB wrapper used by DiffStorage for large diff payloads.
 *
 * chrome.storage.local has a per-key cap (~10 MB) that some diff results
 * could exceed. IndexedDB has no such cap (subject only to overall quota),
 * so we store payloads there and keep the small summary index in
 * chrome.storage for O(1) listing without touching the heavier store.
 *
 * Falls back gracefully when indexedDB is unavailable (Node tests).
 */

const DB_NAME = "biddiff";
const STORE = "diffs";
const VERSION = 1;

function hasIndexedDb(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (globalThis as any).indexedDB !== "undefined";
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (globalThis as any).indexedDB.open(DB_NAME, VERSION) as IDBOpenDBRequest;
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbAvailable(): Promise<boolean> {
  if (!hasIndexedDb()) return false;
  try {
    const db = await openDb();
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  const result = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
