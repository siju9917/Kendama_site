/**
 * Numeric-value-change regression test (integration).
 *
 * Guards the 2026-05-30 P1 fix: reformatting-suppression must never hide a
 * change that alters a numeric value. The bug lived in the pipeline
 * (alignment → suppression → classification → criticality), so this test
 * drives a realistic pricing-section amendment through the whole engine —
 * not just the suppress unit — and asserts the material change surfaces,
 * while a true reformatting-only variant is still suppressed.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import type { StructuredDocument } from "../../src/core/model/types.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";

function pricingDoc(name: string, ceilingText: string): StructuredDocument {
  const block = buildBlock({
    sectionPath: "B",
    ordinal: 0,
    blockType: "PARAGRAPH",
    rawText: ceilingText,
  });
  const section = buildSection({
    heading: "SECTION B — SUPPLIES OR SERVICES AND PRICES",
    headingLevel: 1,
    ucfLetter: "B",
    sectionType: "PRICING",
    blocks: [block],
    ordinal: 0,
  });
  return {
    metadata: {
      sourceFileName: name,
      sourceFileHash: name,
      solicitationId: "TEST-PRICE-1",
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    sections: [section],
  };
}

const engine = new DiffEngine(new LocalClauseClient());

function diff(currentText: string, priorText: string) {
  return engine.diff(
    enrichStructuredDocument(pricingDoc("current.pdf", currentText)),
    enrichStructuredDocument(pricingDoc("prior.pdf", priorText)),
  );
}

describe("Numeric value changes survive the full pipeline (P1 regression)", () => {
  it("surfaces a $1.5M → $15M ceiling change as a flagged change", () => {
    const r = diff(
      "The total estimated ceiling value of this contract is $15M.",
      "The total estimated ceiling value of this contract is $1.5M.",
    );
    // The change must NOT have been suppressed as reformatting.
    expect(r.changes.length).toBeGreaterThan(0);
    const surfaced = r.changes.some(
      (c) => (c.afterText ?? "").includes("$15M") && (c.beforeText ?? "").includes("$1.5M"),
    );
    expect(surfaced, "the 10x ceiling change must surface, not be suppressed").toBe(true);
    // It is in a pricing section → critical.
    expect(r.criticalCount).toBeGreaterThan(0);
  });

  it("surfaces a decimal unit-price change ($3.50 → $350)", () => {
    const r = diff("Unit price is $350 each.", "Unit price is $3.50 each.");
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("still suppresses a true reformatting-only variant (same value)", () => {
    // Same dollar value, only whitespace differs → no change should surface.
    const r = diff(
      "The total estimated ceiling value of this contract is  $1.5M .",
      "The total estimated ceiling value of this contract is $1.5M.",
    );
    expect(r.changes.length).toBe(0);
  });
});
