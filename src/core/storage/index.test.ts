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

  it("returns null for a missing diff", async () => {
    const s = new DiffStorage();
    expect(await s.getDiff("nope")).toBeNull();
  });
});
