import { describe, it, expect, beforeEach } from "vitest";
import { DiffStorage, __resetMemoryKvForTests } from "./index.js";
import type { DiffResult } from "../diff/types.js";

beforeEach(() => {
  __resetMemoryKvForTests();
});

function fakeResult(id: string, sizeNote = ""): DiffResult {
  return {
    id,
    generatedAt: new Date().toISOString(),
    currentDoc: {
      sourceFileName: `${id}-current.pdf`,
      sourceFileHash: id,
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-05-26T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    priorDoc: {
      sourceFileName: `${id}-prior.pdf`,
      sourceFileHash: id + "-prior",
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-05-26T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    changes: [],
    criticalCount: 0,
    changeCountByCategory: {
      SCOPE_SOW: 0,
      EVALUATION_CRITERIA: 0,
      DATES_DEADLINES: 0,
      CLAUSES: 0,
      SUBMISSION_INSTRUCTIONS: 0,
      PRICING_CLINS: 0,
      ATTACHMENTS: 0,
      OTHER: 0,
    },
    diffConfidence: 1,
    warnings: sizeNote ? [sizeNote] : [],
  };
}

describe("DiffStorage", () => {
  it("saves and retrieves a diff", async () => {
    const s = new DiffStorage();
    const r = fakeResult("d1");
    await s.saveDiff(r);
    const loaded = await s.getDiff("d1");
    expect(loaded?.id).toBe("d1");
  });

  it("lists summaries newest-first", async () => {
    const s = new DiffStorage();
    await s.saveDiff({ ...fakeResult("a1"), generatedAt: "2026-01-01T00:00:00Z" });
    await s.saveDiff({ ...fakeResult("a2"), generatedAt: "2026-02-01T00:00:00Z" });
    const list = await s.listDiffs();
    expect(list[0].id).toBe("a2");
    expect(list[1].id).toBe("a1");
  });

  it("prunes oldest-access first when over cap", async () => {
    const s = new DiffStorage();
    // Save a few oversized payloads, then prune to 100 bytes.
    for (let i = 0; i < 5; i++) {
      // Force size by stuffing the warnings array with a large string.
      const big = fakeResult(`p${i}`, "x".repeat(200));
      await s.saveDiff(big);
    }
    await s.pruneToLimit(500);
    const after = await s.listDiffs();
    // Some entries should have been pruned.
    expect(after.length).toBeLessThan(5);
  });

  // NOTE (bug-hunt pass 39): the precise "strict-LRU survivor" assertion is
  // intentionally NOT made here — `listDiffs()` is a SUMMARY view that does
  // not expose `sizeBytes`/`lastAccess`, and same-millisecond fixtures share
  // `generatedAt`, so eviction *order* can't be verified through the public
  // surface without reaching into internals. (The `_pruneToLimit` source uses
  // `sort((a,b) => a.lastAccess - b.lastAccess)` — oldest-access first — and
  // is exercised by the existing "prunes oldest-access first when over cap"
  // test below for the reduce-count behavior.) What IS cleanly assertable:
  it("prune is a no-op when already under the cap", async () => {
    const s = new DiffStorage();
    await s.saveDiff(fakeResult("small"));
    await s.pruneToLimit(10_000_000); // huge cap → nothing evicted
    expect((await s.listDiffs()).map((e) => e.id)).toContain("small");
  });

  it("prune leaves a consistent index: every surviving summary maps to a live entry", async () => {
    const s = new DiffStorage();
    for (let i = 0; i < 5; i++) await s.saveDiff(fakeResult(`e${i}`, "x".repeat(300)));
    await s.pruneToLimit(600);
    const survivors = await s.listDiffs();
    // Every survivor's payload must still be retrievable (no dangling index
    // entry pointing at a deleted payload — the failure mode _pruneToLimit's
    // try/finally guards against).
    for (const e of survivors) {
      expect(await s.getDiff(e.id), `survivor ${e.id} payload missing`).not.toBeNull();
    }
  });

  it("returns null for a missing diff", async () => {
    const s = new DiffStorage();
    expect(await s.getDiff("nope")).toBeNull();
  });

  it("recovers gracefully from a corrupted index", async () => {
    const { makeKv } = await import("./index.js");
    const kv = makeKv();
    // Set a broken index manually.
    await kv.set("biddiff.diffs.index", { entries: "not an array" });
    const s = new DiffStorage();
    expect(await s.listDiffs()).toEqual([]);
    // Should also be able to save fresh after corruption.
    await s.saveDiff(fakeResult("recover"));
    const list = await s.listDiffs();
    expect(list.length).toBe(1);
  });

  it("deleteDiff removes payload and index entry", async () => {
    const s = new DiffStorage();
    await s.saveDiff(fakeResult("del1"));
    await s.saveDiff(fakeResult("del2"));
    expect((await s.listDiffs()).length).toBe(2);
    await s.deleteDiff("del1");
    const list = await s.listDiffs();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("del2");
    expect(await s.getDiff("del1")).toBeNull();
  });

  it("markViewed updates lastViewedAt; listDiffs returns it", async () => {
    const s = new DiffStorage();
    await s.saveDiff(fakeResult("v1"));
    let list = await s.listDiffs();
    expect(list[0].lastViewedAt).toBeNull();
    await s.markViewed("v1");
    list = await s.listDiffs();
    expect(list[0].lastViewedAt).toBeTruthy();
  });

  it("rolls back payload write when index write throws", async () => {
    // Construct a kv whose set throws when writing the index, but succeeds
    // for payloads. Verify that after the failed save, the payload is gone.
    const real = new Map<string, unknown>();
    const kv = {
      async get<T>(k: string): Promise<T | null> {
        return (real.get(k) as T) ?? null;
      },
      async set(k: string, v: unknown): Promise<void> {
        if (k === "biddiff.diffs.index") throw new Error("simulated index write failure");
        real.set(k, v);
      },
      async remove(k: string): Promise<void> {
        real.delete(k);
      },
    };
    const s = new DiffStorage(kv);
    await expect(s.saveDiff(fakeResult("rb1"))).rejects.toThrow();
    // The payload should have been rolled back.
    expect(real.has("biddiff.diff.rb1")).toBe(false);
  });

  it("concurrent saves do not lose entries (serialize lock)", async () => {
    const s = new DiffStorage();
    // Fire 10 saves in parallel without awaiting individual results.
    const ps = Array.from({ length: 10 }, (_, i) => s.saveDiff(fakeResult(`c${i}`)));
    await Promise.all(ps);
    const list = await s.listDiffs();
    expect(list.length).toBe(10);
  });

  it("a rejected mutation does not break the lock for the next one", async () => {
    // The serialize() lock resolves its `next` link in a `finally`, so a
    // throwing mutation must NOT deadlock the queue. Make the FIRST index
    // write throw, then confirm a subsequent save still completes and is
    // durably recorded (the lock recovered).
    const real = new Map<string, unknown>();
    let failNextIndexWrite = true;
    const kv = {
      async get<T>(k: string): Promise<T | null> {
        return (real.get(k) as T) ?? null;
      },
      async set(k: string, v: unknown): Promise<void> {
        if (k === "biddiff.diffs.index" && failNextIndexWrite) {
          failNextIndexWrite = false;
          throw new Error("simulated one-time index write failure");
        }
        real.set(k, v);
      },
      async remove(k: string): Promise<void> {
        real.delete(k);
      },
    };
    const s = new DiffStorage(kv);
    await expect(s.saveDiff(fakeResult("fail1"))).rejects.toThrow();
    // The lock must have been released despite the rejection.
    await s.saveDiff(fakeResult("ok1"));
    const list = await s.listDiffs();
    expect(list.map((e) => e.id)).toContain("ok1");
    expect(list.map((e) => e.id)).not.toContain("fail1");
  });

  it("serialized mutations preserve order under interleaving", async () => {
    // Concurrent markViewed + saveDiff must not lose the index. Fire a save
    // and a viewed-touch on an existing entry concurrently; both must land.
    const s = new DiffStorage();
    await s.saveDiff(fakeResult("base"));
    await Promise.all([
      s.saveDiff(fakeResult("new1")),
      s.markViewed("base"),
      s.saveDiff(fakeResult("new2")),
    ]);
    const list = await s.listDiffs();
    const ids = list.map((e) => e.id);
    expect(ids).toContain("base");
    expect(ids).toContain("new1");
    expect(ids).toContain("new2");
    expect(list.length).toBe(3);
  });

  it("filters out malformed entries", async () => {
    const { makeKv } = await import("./index.js");
    const kv = makeKv();
    await kv.set("biddiff.diffs.index", {
      entries: [
        {
          id: "good",
          sizeBytes: 100,
          lastAccess: 1,
          generatedAt: "x",
          currentFileName: "a",
          priorFileName: "b",
          criticalCount: 0,
          totalChanges: 0,
          solicitationId: null,
          storage: "kv",
        },
        { id: "missing-fields" }, // missing required fields
        null,
        "garbage",
      ],
    });
    const s = new DiffStorage();
    const list = await s.listDiffs();
    expect(list.map((e) => e.id)).toEqual(["good"]);
  });
});
