import { describe, it, expect } from "vitest";
import { loadAllPairs } from "../../../test/corpus/harness.js";
import { enrichStructuredDocument } from "./normalize.js";

describe("normalize: enrichStructuredDocument", () => {
  it("adds anchors to blocks across the synthetic corpus", () => {
    let totalDateAnchors = 0;
    let totalClauseAnchors = 0;
    let totalPageLimitAnchors = 0;
    let totalClinAnchors = 0;

    for (const b of loadAllPairs()) {
      const enriched = enrichStructuredDocument(b.current);
      for (const s of enriched.sections) {
        for (const blk of s.blocks) {
          for (const a of blk.anchors) {
            if (a.type === "DATE") totalDateAnchors++;
            if (a.type === "CLAUSE_REF") totalClauseAnchors++;
            if (a.type === "PAGE_LIMIT") totalPageLimitAnchors++;
            if (a.type === "CLIN") totalClinAnchors++;
          }
        }
      }
    }

    // Every pair has Section L with a due date — at least once per pair.
    expect(totalDateAnchors).toBeGreaterThanOrEqual(40);
    // Every Section I is full of clause refs.
    expect(totalClauseAnchors).toBeGreaterThan(200);
    // Every Section L has a page limit.
    expect(totalPageLimitAnchors).toBeGreaterThanOrEqual(40);
    // CLINs only appear in Section B.
    expect(totalClinAnchors).toBeGreaterThan(0);
  });

  it("does not detect CLIN anchors outside Section B", () => {
    for (const b of loadAllPairs()) {
      const enriched = enrichStructuredDocument(b.current);
      for (const s of enriched.sections) {
        if (s.ucfLetter === "B") continue;
        for (const blk of s.blocks) {
          for (const a of blk.anchors) {
            expect(a.type).not.toBe("CLIN");
          }
        }
      }
    }
  });

  it("Section L picks up a PAGE_LIMIT anchor on every corpus pair", () => {
    for (const b of loadAllPairs()) {
      const enriched = enrichStructuredDocument(b.current);
      const L = enriched.sections.find((s) => s.ucfLetter === "L");
      expect(L).toBeDefined();
      const hasPageLimit = L!.blocks.some((bl) => bl.anchors.some((a) => a.type === "PAGE_LIMIT"));
      expect(hasPageLimit).toBe(true);
    }
  });

  it("Section I picks up CLAUSE_REF anchors on every corpus pair", () => {
    for (const b of loadAllPairs()) {
      const enriched = enrichStructuredDocument(b.current);
      const I = enriched.sections.find((s) => s.ucfLetter === "I");
      expect(I).toBeDefined();
      const clauseCount = I!.blocks.reduce(
        (n, bl) => n + bl.anchors.filter((a) => a.type === "CLAUSE_REF").length,
        0,
      );
      // Each clause-reference block has exactly one CLAUSE_REF anchor.
      expect(clauseCount).toBeGreaterThanOrEqual(5);
    }
  });
});
