/**
 * REAL adversarial test for false-positive suppression.
 *
 * Null pairs in the corpus are byte-identical so they don't exercise the
 * normalization or the suppression code. THIS test applies *semantic-preserving
 * noise* — extra whitespace, line breaks, punctuation jitter, ligatures,
 * curly quotes — to one side and verifies the engine emits ZERO changes.
 *
 * This is the only honest test that the engine ignores reformatting.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { loadAllPairs } from "../corpus/harness.js";
import type { Block, Section, StructuredDocument } from "../../src/core/model/types.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";

/** Reformat a string while preserving semantics. */
function reformat(s: string, seed: number): string {
  // Deterministic LCG so tests are reproducible.
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };

  // 1. Inject curly quotes and ligatures back in.
  let out = s
    .replace(/ff/g, () => (next() % 2 === 0 ? "ﬀ" : "ff"))
    .replace(/fi/g, () => (next() % 2 === 0 ? "ﬁ" : "fi"))
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/-/g, () => (next() % 3 === 0 ? "–" : "-"));

  // 2. Inject extra whitespace and line breaks at word boundaries.
  out = out.replace(/ /g, () => (next() % 4 === 0 ? "  " : " "));
  out = out.replace(/\./g, () => (next() % 3 === 0 ? ".\n" : "."));

  // 3. Add trailing/leading whitespace.
  out = `  ${out}  `;
  return out;
}

function reformatBlock(b: Block, seed: number): Block {
  return buildBlock({
    sectionPath: b.id,
    ordinal: b.ordinal,
    blockType: b.blockType,
    rawText: reformat(b.text, seed),
    anchors: b.anchors,
    extractionConfidence: b.extractionConfidence,
  });
}

function reformatSection(s: Section, seedBase: number): Section {
  const blocks = s.blocks.map((b, i) => reformatBlock(b, seedBase + i * 7));
  return buildSection({
    heading: reformat(s.heading, seedBase + 999),
    headingLevel: s.headingLevel,
    ucfLetter: s.ucfLetter,
    sectionType: s.sectionType,
    blocks,
    ordinal: s.ordinal,
  });
}

function reformatDoc(doc: StructuredDocument, seed: number): StructuredDocument {
  return {
    metadata: doc.metadata,
    sections: doc.sections.map((s, i) => reformatSection(s, seed + i * 1000)),
  };
}

describe("Reformatting-only pairs produce zero changes (Phase 3.8)", () => {
  it("applies semantic-preserving noise to current; diff must be empty", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    // Take a handful of base templates (the prior side, which has no edits applied).
    const samples = ["it-svc-001-due-date-shift", "navy-001-due-date", "nasa-001-due-date"];
    for (const id of samples) {
      const pair = loadAllPairs().find((b) => b.pairId === id);
      if (!pair) continue;
      const noisy = reformatDoc(pair.prior, 12345);
      const result = engine.diff(
        enrichStructuredDocument(noisy),
        enrichStructuredDocument(pair.prior),
      );
      // After enrichment, anchors recompute; both sides are semantically
      // identical so block text after normalize() matches and LCS yields all
      // equals — zero changes expected.
      if (result.changes.length > 0) {
        const details = result.changes
          .map(
            (c) =>
              `  ${c.changeType}@${c.sectionHeading.slice(0, 30)}: before="${(c.beforeText ?? "").slice(0, 60)}" after="${(c.afterText ?? "").slice(0, 60)}"`,
          )
          .join("\n");
        console.error(`\n${id} produced ${result.changes.length} changes:\n${details}`);
      }
      expect(
        result.changes.length,
        `pair ${id}: reformatting-only diff should be empty`,
      ).toBe(0);
    }
  });
});
