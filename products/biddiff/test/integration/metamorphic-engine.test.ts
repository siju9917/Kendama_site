/**
 * Metamorphic testing of the diff engine (5.7.5 continuous bug-hunt, a
 * DIFFERENT technique from the property fuzz). Instead of asserting outputs
 * for known inputs, assert *relationships between outputs* that must hold:
 *
 *   - INVERSION: diff(current=A, prior=B) and diff(current=B, prior=A) are
 *     mirror images — INSERT count in one equals DELETE count in the other,
 *     MODIFY and MOVE counts are equal, total change count is equal, and
 *     criticalCount is equal (criticality does not depend on edit direction).
 *   - LOCALITY: appending an identical new section to BOTH documents does
 *     not change the diff of the original sections, and contributes no new
 *     changes itself.
 *
 * Run against the real labeled corpus, so a failure is a real engine
 * asymmetry, not a contrived input.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import { loadAllPairs } from "../corpus/harness.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

const engine = new DiffEngine(new LocalClauseClient());

function counts(changes: { changeType: string }[]) {
  const c = { INSERT: 0, DELETE: 0, MODIFY: 0, MOVE: 0 };
  for (const ch of changes) c[ch.changeType as keyof typeof c]++;
  return c;
}

function withExtraSection(doc: StructuredDocument, ordinalBase: number): StructuredDocument {
  // An identical, clearly-unrelated appended section.
  const extra = buildSection({
    heading: "SECTION Z — UNRELATED APPENDIX",
    headingLevel: 1,
    ucfLetter: null,
    sectionType: "OTHER",
    ordinal: ordinalBase,
    blocks: [
      buildBlock({ sectionPath: "Z", ordinal: 0, blockType: "PARAGRAPH", rawText: "This appendix is identical in both versions and unrelated to the rest." }),
    ],
  });
  return { metadata: doc.metadata, sections: [...doc.sections, extra] };
}

// A representative slice of the corpus (covers all the change categories).
const SAMPLE = [
  "af-001-due-date", "it-svc-003-clause-add", "navy-004-clin-add",
  "dhs-006-attachment-add", "nasa-003-eval-add-factor", "stress-009-all-categories",
  "it-svc-016-eval-factor-reorder", "navy-009-sow-modify",
];

describe("Diff engine metamorphic properties (real corpus)", () => {
  const pairs = loadAllPairs();

  it("INVERSION: diff(A,B) mirrors diff(B,A)", () => {
    for (const id of SAMPLE) {
      const p = pairs.find((b) => b.pairId === id)!;
      const A = enrichStructuredDocument(p.current);
      const B = enrichStructuredDocument(p.prior);
      const fwd = engine.diff(A, B);
      const rev = engine.diff(B, A);

      expect(fwd.changes.length, `${id}: total change count symmetric`).toBe(rev.changes.length);
      expect(fwd.criticalCount, `${id}: criticalCount symmetric`).toBe(rev.criticalCount);

      const cf = counts(fwd.changes);
      const cr = counts(rev.changes);
      // INSERT/DELETE swap; MODIFY/MOVE are direction-independent.
      expect(cf.INSERT, `${id}: fwd INSERT == rev DELETE`).toBe(cr.DELETE);
      expect(cf.DELETE, `${id}: fwd DELETE == rev INSERT`).toBe(cr.INSERT);
      expect(cf.MODIFY, `${id}: MODIFY symmetric`).toBe(cr.MODIFY);
      expect(cf.MOVE, `${id}: MOVE symmetric`).toBe(cr.MOVE);
    }
  });

  it("LOCALITY: an identical appended section does not perturb the rest", () => {
    for (const id of SAMPLE) {
      const p = pairs.find((b) => b.pairId === id)!;
      const base = engine.diff(
        enrichStructuredDocument(p.current),
        enrichStructuredDocument(p.prior),
      );
      const withExtra = engine.diff(
        enrichStructuredDocument(withExtraSection(p.current, 900)),
        enrichStructuredDocument(withExtraSection(p.prior, 900)),
      );
      // The identical appendix adds no changes; the original diff is unchanged.
      expect(withExtra.changes.length, `${id}: appended identical section adds no changes`).toBe(
        base.changes.length,
      );
      expect(withExtra.criticalCount, `${id}: criticalCount unchanged`).toBe(base.criticalCount);
    }
  });
});
