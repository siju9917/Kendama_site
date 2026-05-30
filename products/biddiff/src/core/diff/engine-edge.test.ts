/**
 * Edge cases the diff engine must handle without crashing or producing nonsense:
 *   - Empty current, non-empty prior (whole-doc DELETE)
 *   - Empty prior, non-empty current (whole-doc INSERT)
 *   - Both empty
 *   - Doc with only a Preamble section (no UCF headers)
 *   - Doc with a section containing zero blocks
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "./engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { buildBlock, buildSection } from "../model/build.js";
import type { Section, StructuredDocument } from "../model/types.js";

function meta(name: string): StructuredDocument["metadata"] {
  return {
    sourceFileName: name,
    sourceFileHash: name,
    solicitationId: null,
    amendmentNumber: null,
    extractedAt: "2026-05-26T00:00:00.000Z",
    overallExtractionConfidence: 1,
    extractionWarnings: [],
    pageCount: 1,
  };
}

const emptyDoc: StructuredDocument = { metadata: meta("empty"), sections: [] };

function singleSection(text: string): StructuredDocument {
  const block = buildBlock({
    sectionPath: "X",
    ordinal: 0,
    blockType: "PARAGRAPH",
    rawText: text,
  });
  const section: Section = buildSection({
    heading: "Section X",
    headingLevel: 1,
    ucfLetter: null,
    sectionType: "OTHER",
    blocks: [block],
    ordinal: 0,
  });
  return { metadata: meta("single"), sections: [section] };
}

describe("DiffEngine edge cases", () => {
  const engine = new DiffEngine(new LocalClauseClient());

  it("two empty docs produce zero changes", () => {
    const r = engine.diff(emptyDoc, emptyDoc);
    expect(r.changes.length).toBe(0);
    expect(r.criticalCount).toBe(0);
  });

  it("empty prior + non-empty current is INSERTs only", () => {
    const r = engine.diff(singleSection("Hello world."), emptyDoc);
    // A new section appears: should yield an INSERT for the block.
    expect(r.changes.every((c) => c.changeType === "INSERT")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("empty current + non-empty prior is DELETEs only", () => {
    const r = engine.diff(emptyDoc, singleSection("Hello world."));
    expect(r.changes.every((c) => c.changeType === "DELETE")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("a small MODIFY computes token-level spans", () => {
    const prior = singleSection("The proposal shall not exceed 30 pages total.");
    const current = singleSection("The proposal shall not exceed 50 pages total.");
    const r = engine.diff(current, prior);
    const modify = r.changes.find((c) => c.changeType === "MODIFY");
    expect(modify).toBeTruthy();
    expect(modify?.tokenSpans).not.toBeNull();
  });

  it("a pathologically large MODIFY degrades gracefully (no 400MB dp) and still surfaces the change", () => {
    // ~3000 tokens on each side → product ~9M cells, over the 4M cap.
    // The previous per-dimension 10k cap would have let this allocate a
    // huge LCS table; the product cap skips token spans but still emits
    // the block-level MODIFY.
    const base = Array.from({ length: 3000 }, (_, i) => `word${i}`).join(" ");
    const prior = singleSection(base + " original-tail-token");
    const current = singleSection(base + " amended-tail-token");
    const t0 = Date.now();
    const r = engine.diff(current, prior);
    const elapsed = Date.now() - t0;
    const modify = r.changes.find((c) => c.changeType === "MODIFY");
    expect(modify).toBeTruthy();
    // Token spans are intentionally skipped for this size.
    expect(modify?.tokenSpans).toBeNull();
    // Both texts are still carried so the UI shows the whole-block diff.
    expect(modify?.beforeText).toContain("original-tail-token");
    expect(modify?.afterText).toContain("amended-tail-token");
    // Must not have gone down the 100M-op path.
    expect(elapsed).toBeLessThan(2000);
  });

  it("a section with zero blocks does not crash the engine", () => {
    const emptySection = buildSection({
      heading: "Section Y",
      headingLevel: 1,
      ucfLetter: null,
      sectionType: "OTHER",
      blocks: [],
      ordinal: 0,
    });
    const doc: StructuredDocument = { metadata: meta("z"), sections: [emptySection] };
    const r = engine.diff(doc, doc);
    expect(r.changes.length).toBe(0);
  });
});
