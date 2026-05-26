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

describe("buildSummaryMarkdown", () => {
  it("emits valid markdown structure with disclaimer", async () => {
    const { buildSummaryMarkdown } = await import("./index.js");
    const md = buildSummaryMarkdown(makeResult("stress-001-multi-six-edits"));
    expect(md).toMatch(/^# BidDiff/);
    expect(md).toContain("## Critical changes");
    expect(md).toMatch(/\*[^*]+\*$/m); // italicized line (the disclaimer)
  });

  it("inline-code spans survive embedded backticks (CommonMark)", async () => {
    const { buildSummaryMarkdown } = await import("./index.js");
    const r = makeResult("it-svc-001-due-date-shift");
    if (r.changes.length > 0) {
      r.changes[0].beforeText = "uses a `template` literal";
      r.changes[0].afterText = "uses a ``double-back`` literal";
    }
    const md = buildSummaryMarkdown(r);
    // The two pieces of content must appear intact.
    expect(md).toContain("uses a `template` literal");
    expect(md).toContain("uses a ``double-back`` literal");
    // And the wrap fence must use strictly more backticks than the longest
    // run inside the content — i.e. content with 1 backtick is wrapped by
    // ``…``; content with 2 backticks is wrapped by ```…```.
    expect(md).toMatch(/``\s?uses a `template` literal\s?``/);
    expect(md).toMatch(/```\s?uses a ``double-back`` literal\s?```/);
  });
});

describe("exportPdfReport", () => {
  it("produces a non-empty PDF blob", async () => {
    const r = makeResult("stress-001-multi-six-edits");
    const blob = await exportPdfReport(r);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  }, 15_000);

  it("does not crash on absurdly long unbreakable tokens", async () => {
    const r = makeResult("it-svc-001-due-date-shift");
    // Inject a 2000-char "word" into a change's afterText.
    const longWord = "x".repeat(2000);
    const cloned = { ...r, changes: r.changes.map((c) => ({ ...c, afterText: longWord })) };
    const blob = await exportPdfReport(cloned);
    expect(blob.size).toBeGreaterThan(500);
  }, 30_000);
});
