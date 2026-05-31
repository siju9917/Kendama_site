/**
 * Clear-history logic, extracted from the options page so the destructive
 * path (delete every saved diff, then drop the orphan-prone pointer keys) is
 * unit-testable without rendering React. The component keeps the confirm()
 * prompt + status UI; this is just the data mutation.
 *
 * Partial-failure is explicit: a single failed delete must NOT abort the rest,
 * and the index + pending-open pointer keys are dropped regardless so a
 * half-cleared store can't leave a dangling "open this diff" pointer that
 * resolves to a missing payload (a spurious "no longer available" error).
 */
export interface ClearResult {
  deleted: number;
  failed: number;
}

interface DiffDeleter {
  deleteDiff(id: string): Promise<void>;
}
interface KvRemover {
  remove(key: string): Promise<void>;
}

export const INDEX_KEY = "biddiff.diffs.index";
export const PENDING_OPEN_KEY = "biddiff.pendingOpenDiffId";

export async function clearStoredDiffs(
  storage: DiffDeleter,
  kv: KvRemover,
  list: ReadonlyArray<{ id: string }>,
): Promise<ClearResult> {
  let deleted = 0;
  let failed = 0;
  for (const e of list) {
    try {
      await storage.deleteDiff(e.id);
      deleted++;
    } catch {
      failed++;
    }
  }
  // Belt-and-suspenders: drop the index + any stale popup→panel pointer even
  // if some payload deletes failed, so nothing dangles.
  await kv.remove(INDEX_KEY).catch(() => {});
  await kv.remove(PENDING_OPEN_KEY).catch(() => {});
  return { deleted, failed };
}
