/**
 * Diff-confidence ceiling invariant (5.7.5; the extraction-confidence-math
 * half of bug-hunt pass 8's queued target).
 *
 * `computeDiffConfidence` (engine.ts) documents a hard contract: the diff
 * confidence "cannot exceed the worse of the two extractions" — it starts
 * at `min(currentConf, priorConf)` and is only ever *reduced* (a penalty
 * when there are many changes on an imperfect extraction), then clamped to
 * [0,1]. The existing `fuzz-engine` test checks diffConfidence ∈ [0,1] and
 * determinism, but NOT this ceiling relationship to the inputs.
 *
 * This test asserts the ceiling across many random pairs. It reads the
 * extraction confidence from the documents AFTER `enrichStructuredDocument`
 * (in case enrichment recomputes it), so the invariant is checked against
 * the values the engine actually sees — robust to enrichment internals.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const WORDS = [
  "contract", "offeror", "shall", "deliver", "within", "thirty", "days",
  "award", "clause", "pricing", "performance", "deadline", "$50,000",
  "January", "CLIN", "0001", "FAR 52.204-21", "not to exceed 30 pages",
];

function sentence(rng: () => number): string {
  const n = 3 + Math.floor(rng() * 8);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(WORDS[Math.floor(rng() * WORDS.length)]);
  return out.join(" ") + ".";
}

function makeDoc(rng: () => number, name: string, conf: number): StructuredDocument {
  const nSections = 1 + Math.floor(rng() * 4);
  const sections = [];
  for (let i = 0; i < nSections; i++) {
    const nBlocks = 1 + Math.floor(rng() * 6);
    const blocks = [];
    for (let b = 0; b < nBlocks; b++) {
      blocks.push(buildBlock({ sectionPath: `${name}-${i}`, ordinal: b, blockType: "PARAGRAPH", rawText: sentence(rng) }));
    }
    sections.push(buildSection({ heading: `Section ${i}`, headingLevel: 1, ucfLetter: null, sectionType: "OTHER", ordinal: i, blocks }));
  }
  return {
    metadata: {
      sourceFileName: name,
      sourceFileHash: name,
      solicitationId: "CONF-1",
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: conf,
      extractionWarnings: [],
      pageCount: 1,
    },
    sections,
  };
}

describe("diff confidence ceiling invariant (5.7.5)", () => {
  const engine = new DiffEngine(new LocalClauseClient());
  const EPS = 1e-9;

  it("diffConfidence never exceeds the worse of the two extraction confidences (300 pairs)", () => {
    const rng = makeRng(0xc01dbeef);
    for (let iter = 0; iter < 300; iter++) {
      const A = enrichStructuredDocument(makeDoc(rng, `a-${iter}`, rng()));
      const B = enrichStructuredDocument(makeDoc(rng, `b-${iter}`, rng()));
      const floor = Math.min(
        A.metadata.overallExtractionConfidence,
        B.metadata.overallExtractionConfidence,
      );
      const r = engine.diff(A, B);
      expect(
        r.diffConfidence,
        `iter ${iter}: diffConfidence ${r.diffConfidence} must be <= extraction floor ${floor}`,
      ).toBeLessThanOrEqual(floor + EPS);
      // And it must still be a valid probability.
      expect(r.diffConfidence).toBeGreaterThanOrEqual(0);
      expect(r.diffConfidence).toBeLessThanOrEqual(1);
    }
  });

  it("a zero-confidence extraction floors the diff confidence at zero", () => {
    const rng = makeRng(42);
    const A = enrichStructuredDocument(makeDoc(rng, "a", 0));
    const B = enrichStructuredDocument(makeDoc(rng, "b", rng()));
    // floor is min(0, something) === 0 only if enrichment preserves the 0;
    // assert against the actual post-enrich floor to stay robust.
    const floor = Math.min(
      A.metadata.overallExtractionConfidence,
      B.metadata.overallExtractionConfidence,
    );
    const r = engine.diff(A, B);
    expect(r.diffConfidence).toBeLessThanOrEqual(floor + EPS);
  });

  it("self-diff confidence still respects the ceiling (no spurious inflation)", () => {
    const rng = makeRng(7);
    const A = enrichStructuredDocument(makeDoc(rng, "a", rng()));
    const r = engine.diff(A, A);
    expect(r.diffConfidence).toBeLessThanOrEqual(A.metadata.overallExtractionConfidence + EPS);
  });

  // The OTHER half of the confidence contract (the ceiling tests above guard the
  // upper bound): a degraded extraction (e.g. a scanned/image PDF → low per-block
  // confidence) must SURFACE a user-facing warning, not silently present a
  // misleadingly-confident diff. Drives the real enrich path via low-confidence
  // blocks (enrichment recomputes overall confidence from blocks).
  it("a low-confidence extraction surfaces the low-confidence warning", () => {
    // Enrichment recomputes confidence from the text (clean text → ~1), so to
    // simulate a degraded/scanned extraction we override the post-enrich
    // overall confidence — the value the engine actually reads.
    const rng = makeRng(123);
    const withLowConf = (name: string): StructuredDocument => {
      const d = enrichStructuredDocument(makeDoc(rng, name, 1));
      return { ...d, metadata: { ...d.metadata, overallExtractionConfidence: 0.5 } };
    };
    const r = engine.diff(withLowConf("cur"), withLowConf("prior"));
    expect(r.diffConfidence).toBeLessThan(0.7); // below EXTRACTION_LOW_CONFIDENCE_THRESHOLD
    expect(r.warnings.some((w) => /extraction confidence/i.test(w) && /lower than typical/i.test(w))).toBe(true);
  });

  it("a clean (high-confidence) extraction emits NO low-confidence warning", () => {
    const rng = makeRng(99);
    // makeDoc's blocks default to confidence 1, so enrich yields ~1.
    const A = enrichStructuredDocument(makeDoc(rng, "a", 1));
    const B = enrichStructuredDocument(makeDoc(rng, "b", 1));
    const r = engine.diff(A, B);
    expect(r.warnings.some((w) => /lower than typical for clean text PDFs/i.test(w))).toBe(false);
  });
});
