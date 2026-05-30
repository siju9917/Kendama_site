/**
 * Property-based swap-symmetry of the diff engine (5.7.5 continuous
 * bug-hunt / 5.7.2 adversarial second pass).
 *
 * `metamorphic-engine.test.ts` already asserts INVERSION (swap symmetry)
 * and LOCALITY — but only on 8 fixed corpus pairs. This complements it by
 * asserting the SAME swap-symmetry relation across HUNDREDS of randomly
 * *mutated* document pairs, exploring far more of the input space than the
 * fixed examples can. The mutation (edit / insert / delete / move applied
 * to a base doc) produces realistic, related before/after pairs — unlike
 * the existing fuzz test, which diffs two *independent* random docs and so
 * rarely produces MODIFY/MOVE pairs to symmetry-check.
 *
 * The relation: diff(A,B) and diff(B,A) must mirror —
 *   - INSERT count one way == DELETE count the other way (and vice versa),
 *   - MODIFY / MOVE / total counts are invariant under the swap,
 *   - criticalCount is invariant (criticality is a property of *what*
 *     changed, not of which file the user dropped first).
 * A failure means BidDiff's verdict depends on argument order — a real
 * correctness bug.
 *
 * Deterministic: a seeded PRNG drives generation, so any failure reproduces.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type {
  Section,
  SectionType,
  StructuredDocument,
} from "../../src/core/model/types.js";
import type { ChangeType } from "../../src/core/diff/types.js";

// Seeded LCG (same family as the other fuzz tests) — deterministic.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const SECTION_TYPES: SectionType[] = [
  "SOW", "EVALUATION_CRITERIA", "INSTRUCTIONS", "CLAUSES", "PRICING",
  "ATTACHMENT_LIST", "DELIVERIES", "REPS_CERTS", "ADMIN", "OTHER",
];
const UCF_LETTERS = [null, "A", "B", "C", "L", "M"];

const WORDS = [
  "contract", "offeror", "shall", "deliver", "within", "thirty", "days",
  "award", "pursuant", "clause", "pricing", "period", "performance",
  "submission", "deadline", "compliance", "requirement", "amount",
  "$50,000", "$75,000", "January", "March", "CLIN", "0001", "0002",
  "FAR 52.204-21", "DFARS 252.204-7012", "not to exceed 30 pages",
  "offers due 2026-08-15",
];

function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function sentence(rng: () => number): string {
  const n = 3 + Math.floor(rng() * 8);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pick(rng, WORDS));
  return out.join(" ") + ".";
}

interface RawSection {
  type: SectionType;
  ucf: (typeof UCF_LETTERS)[number];
  heading: string;
  blocks: string[];
}

function randomRaw(rng: () => number): RawSection[] {
  const nSections = 1 + Math.floor(rng() * 5); // 1..5
  const sections: RawSection[] = [];
  for (let i = 0; i < nSections; i++) {
    const nBlocks = 1 + Math.floor(rng() * 6); // 1..6
    const blocks: string[] = [];
    for (let b = 0; b < nBlocks; b++) blocks.push(sentence(rng));
    sections.push({
      type: pick(rng, SECTION_TYPES),
      ucf: pick(rng, UCF_LETTERS),
      heading: `Section ${i} ${pick(rng, WORDS)}`,
      blocks,
    });
  }
  return sections;
}

// Mutate a raw doc into a related variant: edit/insert/delete/move blocks
// within sections, and occasionally insert/delete a whole section.
function mutate(src: RawSection[], rng: () => number): RawSection[] {
  const out: RawSection[] = src.map((s) => ({ ...s, blocks: s.blocks.slice() }));
  const ops = 1 + Math.floor(rng() * 5);
  for (let i = 0; i < ops; i++) {
    const op = Math.floor(rng() * 6);
    const sec = out.length ? out[Math.floor(rng() * out.length)] : null;
    if (op === 0 && sec && sec.blocks.length) {
      // edit a block (→ MODIFY)
      const idx = Math.floor(rng() * sec.blocks.length);
      sec.blocks[idx] = sec.blocks[idx] + " " + pick(rng, WORDS);
    } else if (op === 1 && sec) {
      // insert a block (→ INSERT)
      sec.blocks.splice(Math.floor(rng() * (sec.blocks.length + 1)), 0, sentence(rng));
    } else if (op === 2 && sec && sec.blocks.length > 1) {
      // delete a block (→ DELETE)
      sec.blocks.splice(Math.floor(rng() * sec.blocks.length), 1);
    } else if (op === 3 && sec && sec.blocks.length > 1) {
      // move a block within the section (→ MOVE)
      const [b] = sec.blocks.splice(Math.floor(rng() * sec.blocks.length), 1);
      sec.blocks.splice(Math.floor(rng() * (sec.blocks.length + 1)), 0, b);
    } else if (op === 4) {
      // insert a whole section
      out.splice(Math.floor(rng() * (out.length + 1)), 0, randomRaw(rng)[0]);
    } else if (op === 5 && out.length > 1) {
      // delete a whole section
      out.splice(Math.floor(rng() * out.length), 1);
    }
  }
  return out;
}

function toDoc(raw: RawSection[], name: string): StructuredDocument {
  const sections: Section[] = raw.map((s, i) =>
    buildSection({
      heading: s.heading,
      headingLevel: 1,
      ucfLetter: s.ucf,
      sectionType: s.type,
      ordinal: i,
      blocks: s.blocks.map((text, b) =>
        buildBlock({
          sectionPath: `${name}-${i}`,
          ordinal: b,
          blockType: "PARAGRAPH",
          rawText: text,
        }),
      ),
    }),
  );
  return {
    metadata: {
      sourceFileName: name,
      sourceFileHash: name,
      solicitationId: "SYM-1",
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 0.9,
      extractionWarnings: [],
      pageCount: 1,
    },
    sections,
  };
}

function counts(changes: { changeType: ChangeType }[]) {
  const c = { INSERT: 0, DELETE: 0, MODIFY: 0, MOVE: 0 };
  for (const ch of changes) c[ch.changeType]++;
  return c;
}

describe("Diff engine swap symmetry (property-based, 5.7.5)", () => {
  const engine = new DiffEngine(new LocalClauseClient());

  it("diff(A,B) mirrors diff(B,A) across 300 random mutated pairs", () => {
    const rng = makeRng(0x5ee0c0de);
    for (let iter = 0; iter < 300; iter++) {
      const baseRaw = randomRaw(rng);
      const mutRaw = mutate(baseRaw, rng);
      const A = enrichStructuredDocument(toDoc(baseRaw, `a-${iter}`));
      const B = enrichStructuredDocument(toDoc(mutRaw, `b-${iter}`));

      const fwd = engine.diff(A, B);
      const rev = engine.diff(B, A);

      const cf = counts(fwd.changes);
      const cr = counts(rev.changes);

      expect(cf.INSERT, `iter ${iter}: fwd INSERT == rev DELETE`).toBe(cr.DELETE);
      expect(cf.DELETE, `iter ${iter}: fwd DELETE == rev INSERT`).toBe(cr.INSERT);
      expect(cf.MODIFY, `iter ${iter}: MODIFY symmetric`).toBe(cr.MODIFY);
      expect(cf.MOVE, `iter ${iter}: MOVE symmetric`).toBe(cr.MOVE);
      expect(fwd.changes.length, `iter ${iter}: total symmetric`).toBe(rev.changes.length);
      expect(fwd.criticalCount, `iter ${iter}: criticalCount symmetric`).toBe(rev.criticalCount);
    }
  });
});
