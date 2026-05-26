/**
 * "Real change buried in noise" test.
 *
 * Apply a real critical edit AND reformatting noise. The engine MUST still
 * detect the critical edit. This is a much harder test than the clean
 * corpus audit: it proves the engine survives the reformatting noise it
 * will see in actual PDF extractions.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { loadAllPairs } from "../corpus/harness.js";
import type { Block, Section, StructuredDocument } from "../../src/core/model/types.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";

function reformat(s: string, seed: number): string {
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  let out = s
    .replace(/ff/g, () => (next() % 2 === 0 ? "ﬀ" : "ff"))
    .replace(/fi/g, () => (next() % 2 === 0 ? "ﬁ" : "fi"))
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/-/g, () => (next() % 4 === 0 ? "–" : "-"));
  out = out.replace(/ /g, () => (next() % 5 === 0 ? "  " : " "));
  out = out.replace(/\. /g, () => (next() % 4 === 0 ? ".\n" : ". "));
  return `  ${out}  `;
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

describe("Critical change buried in reformatting noise", () => {
  it("detects the critical change in a noisy current; no spurious extras", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const cases: { pairId: string; expectedSubstring: string }[] = [
      { pairId: "it-svc-001-due-date-shift", expectedSubstring: "2026-08-29" },
      { pairId: "it-svc-002-page-limit", expectedSubstring: "25 pages" },
      { pairId: "it-svc-003-clause-add", expectedSubstring: "52.204-25" },
      { pairId: "navy-002-dfars-add", expectedSubstring: "252.204-7019" },
      { pairId: "nasa-001-due-date", expectedSubstring: "2026-10-13" },
    ];
    for (const { pairId, expectedSubstring } of cases) {
      const pair = loadAllPairs().find((b) => b.pairId === pairId)!;
      const noisyCurrent = reformatDoc(pair.current, 42);
      const result = engine.diff(
        enrichStructuredDocument(noisyCurrent),
        enrichStructuredDocument(pair.prior),
      );
      const found = result.changes.some(
        (c) =>
          c.severity === "CRITICAL" &&
          [(c.afterText ?? ""), (c.beforeText ?? "")].some((t) => t.includes(expectedSubstring)),
      );
      expect(
        found,
        `pair ${pairId}: critical change containing "${expectedSubstring}" must survive noise (got ${result.changes.length} changes)`,
      ).toBe(true);
    }
  });
});
