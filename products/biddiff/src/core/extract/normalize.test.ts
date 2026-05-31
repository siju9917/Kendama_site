import { describe, it, expect } from "vitest";
import { loadAllPairs } from "../../../test/corpus/harness.js";
import {
  computeOverallConfidence,
  detectBlockAnchors,
  enrichBlock,
} from "./normalize.js";
import { enrichStructuredDocument } from "./normalize.js";
import { buildBlock } from "../model/build.js";

const block = (text: string, conf?: number) =>
  buildBlock({ sectionPath: "X", ordinal: 0, blockType: "PARAGRAPH", rawText: text, extractionConfidence: conf });

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

describe("computeOverallConfidence (previously untested)", () => {
  it("is the mean of block confidences", () => {
    expect(computeOverallConfidence([block("a", 0.4), block("b", 0.8)])).toBeCloseTo(0.6, 10);
  });
  it("returns 1 for an empty block list (vacuous)", () => {
    expect(computeOverallConfidence([])).toBe(1);
  });
  it("stays bounded in [0,1] and reflects the floor", () => {
    const v = computeOverallConfidence([block("a", 0), block("b", 0), block("c", 1)]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
    expect(v).toBeCloseTo(1 / 3, 10);
  });
});

describe("CLIN anchor gating (direct unit; corpus covers it indirectly)", () => {
  it("detects a CLIN anchor only when allowClin is true (Section B / PRICING)", () => {
    const text = "CLIN 0001 quantity 1,500 units.";
    const withClin = detectBlockAnchors(block(text), { allowClin: true });
    const noClin = detectBlockAnchors(block(text), { allowClin: false });
    expect(withClin.some((a) => a.type === "CLIN")).toBe(true);
    expect(noClin.some((a) => a.type === "CLIN")).toBe(false);
  });
  it("enrichBlock threads allowClin through to the produced anchors", () => {
    const b = block("CLIN 0002 unit price applies.");
    expect(enrichBlock(b, { allowClin: true }).anchors.some((a) => a.type === "CLIN")).toBe(true);
    expect(enrichBlock(b, { allowClin: false }).anchors.some((a) => a.type === "CLIN")).toBe(false);
  });
});
