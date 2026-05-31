import { describe, it, expect, vi } from "vitest";
import { clearStoredDiffs, INDEX_KEY, PENDING_OPEN_KEY } from "./clearHistory.js";

describe("clearStoredDiffs", () => {
  it("deletes every diff and drops the index + pending-open pointer keys", async () => {
    const deleteDiff = vi.fn(async () => {});
    const remove = vi.fn(async () => {});
    const res = await clearStoredDiffs({ deleteDiff }, { remove }, [{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(res).toEqual({ deleted: 3, failed: 0 });
    expect(deleteDiff).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledWith(INDEX_KEY);
    expect(remove).toHaveBeenCalledWith(PENDING_OPEN_KEY);
  });

  it("a failed delete does not abort the rest, and is counted", async () => {
    const deleteDiff = vi.fn(async (id: string) => {
      if (id === "b") throw new Error("storage error");
    });
    const remove = vi.fn(async () => {});
    const res = await clearStoredDiffs({ deleteDiff }, { remove }, [{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(res).toEqual({ deleted: 2, failed: 1 });
    expect(deleteDiff).toHaveBeenCalledTimes(3); // c still attempted after b failed
  });

  it("still drops the pointer keys even when every delete fails (no dangling pointer)", async () => {
    const deleteDiff = vi.fn(async () => {
      throw new Error("all fail");
    });
    const remove = vi.fn(async () => {});
    const res = await clearStoredDiffs({ deleteDiff }, { remove }, [{ id: "a" }, { id: "b" }]);
    expect(res).toEqual({ deleted: 0, failed: 2 });
    expect(remove).toHaveBeenCalledWith(INDEX_KEY);
    expect(remove).toHaveBeenCalledWith(PENDING_OPEN_KEY);
  });

  it("tolerates a key-removal failure without throwing (best-effort cleanup)", async () => {
    const deleteDiff = vi.fn(async () => {});
    const remove = vi.fn(async () => {
      throw new Error("remove failed");
    });
    // Must resolve, not reject — the caller's UI should not see an unhandled throw.
    const res = await clearStoredDiffs({ deleteDiff }, { remove }, [{ id: "a" }]);
    expect(res).toEqual({ deleted: 1, failed: 0 });
  });

  it("empty list is a no-op delete but still clears the keys", async () => {
    const deleteDiff = vi.fn(async () => {});
    const remove = vi.fn(async () => {});
    const res = await clearStoredDiffs({ deleteDiff }, { remove }, []);
    expect(res).toEqual({ deleted: 0, failed: 0 });
    expect(deleteDiff).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
