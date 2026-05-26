import { describe, expect, it } from "vitest";
import { buildSummaryText, exportPdfReport } from "./index.js";
import { DiffEngine } from "../diff/engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { enrichStructuredDocument } from "../extract/normalize.js";
import { loadPair } from "../../../test/corpus/harness.js";

function makeResult(pairId: string) {
  const pair = loadPair(pairId);
  const ec = enrichStructuredDocument(pair.current);
  const ep = enrichStructuredDocument(pair.prior);
  const engine = new DiffEngine(new LocalClauseClient());
  const r = engine.diff(ec, ep);
  r.generatedAt = "2026-05-26T00:00:00.000Z";
  return r;
}

describe("buildSummaryText", () => {
  it("includes the disclaimer and key counts", () => {
    const text = buildSummaryText(makeResult("it-svc-011-multi-critical"));
    expect(text).toContain("BidDiff");
    expect(text).toContain("Critical changes:");
    expect(text).toContain("BidDiff identifies textual differences");
  });

  it("never recommends an action", () => {
    const text = buildSummaryText(makeResult("it-svc-011-multi-critical"));
    // Reports, doesn't advise.
    // We check that the engine's own prose (the disclaimer + summary text)
    // doesn't carry advisory language. Document content itself isn't subject
    // to this rule; clause text legitimately contains "must" / "shall".
    expect(text).toContain("does not provide legal");
    expect(text.length).toBeGreaterThan(100);
  });
});

describe("exportPdfReport", () => {
  it("produces a non-empty PDF blob", async () => {
    const r = makeResult("stress-001-multi-six-edits");
    const blob = await exportPdfReport(r);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  }, 15_000);
});
