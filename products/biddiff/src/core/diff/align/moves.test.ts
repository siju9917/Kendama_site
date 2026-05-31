import { describe, it, expect } from "vitest";
import { detectMoves, type PendingInsert, type PendingDelete } from "./moves.js";
import { buildBlock } from "../../model/build.js";
import { DIFF_THRESHOLDS } from "../../../shared/constants.js";

// detectMoves pairs a pending INSERT with a pending DELETE when their token
// Jaccard similarity is >= DIFF_THRESHOLDS.moveSimilarityMin (0.9), greedily,
// best-similarity first. It is exercised indirectly by the integration
// move-detection tests; this pins its direct contract + the conservation
// invariant that nothing is lost or double-counted.

let n = 0;
function ins(text: string, sectionIndex = 0): PendingInsert {
  return { block: buildBlock({ sectionPath: `i${n++}`, ordinal: 0, blockType: "PARAGRAPH", rawText: text }), sectionIndex };
}
function del(text: string, sectionIndex = 1): PendingDelete {
  return { block: buildBlock({ sectionPath: `d${n++}`, ordinal: 0, blockType: "PARAGRAPH", rawText: text }), sectionIndex };
}

describe("detectMoves", () => {
  it("threshold constant is 0.9 (guards a silent retune)", () => {
    expect(DIFF_THRESHOLDS.moveSimilarityMin).toBe(0.9);
  });

  it("pairs an identical relocated block as a move (similarity 1.0)", () => {
    const text = "The offeror shall submit the technical volume by the deadline.";
    const r = detectMoves([ins(text)], [del(text)]);
    expect(r.moves).toHaveLength(1);
    expect(r.moves[0].similarity).toBeGreaterThanOrEqual(DIFF_THRESHOLDS.moveSimilarityMin);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(0);
  });

  it("does NOT pair a clearly-different insert/delete (stays separate)", () => {
    const r = detectMoves(
      [ins("Pricing shall be firm fixed price for the base period.")],
      [del("Offers are due no later than 2:00 PM Eastern on the closing date.")],
    );
    expect(r.moves).toHaveLength(0);
    expect(r.remainingInserts).toHaveLength(1);
    expect(r.remainingDeletes).toHaveLength(1);
  });

  it("greedy: one delete is consumed by at most one insert", () => {
    const text = "The contractor shall provide monthly status reports to the COR.";
    // Two identical inserts compete for one identical delete.
    const r = detectMoves([ins(text), ins(text)], [del(text)]);
    expect(r.moves).toHaveLength(1);
    expect(r.remainingInserts).toHaveLength(1);
    expect(r.remainingDeletes).toHaveLength(0);
  });

  it("conservation: every insert/delete is matched OR remains, never lost or doubled (200 random)", () => {
    const sentences = [
      "The offeror shall submit a technical and a price volume.",
      "Offers are due by 2:00 PM Eastern on the closing date.",
      "Pricing shall be firm fixed price for the base period.",
      "The contractor shall provide monthly status reports.",
      "Past performance will be evaluated for relevance and recency.",
    ];
    let s = 0x3a17be >>> 0;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const pickText = () => {
      let t = sentences[Math.floor(rnd() * sentences.length)];
      if (rnd() < 0.5) t += " " + Math.floor(rnd() * 100); // small edits
      return t;
    };
    for (let iter = 0; iter < 200; iter++) {
      const nis = Math.floor(rnd() * 5);
      const nds = Math.floor(rnd() * 5);
      const inserts = Array.from({ length: nis }, () => ins(pickText()));
      const deletes = Array.from({ length: nds }, () => del(pickText()));
      const r = detectMoves(inserts, deletes);
      // Conservation: 2 per move + remainders == original totals.
      expect(r.moves.length * 2 + r.remainingInserts.length + r.remainingDeletes.length, `iter ${iter}`)
        .toBe(inserts.length + deletes.length);
      // Each move is at/above threshold and references real input blocks.
      for (const m of r.moves) {
        expect(m.similarity).toBeGreaterThanOrEqual(DIFF_THRESHOLDS.moveSimilarityMin);
      }
      // No more moves than the smaller side allows.
      expect(r.moves.length).toBeLessThanOrEqual(Math.min(inserts.length, deletes.length));
    }
  });

  it("empty inputs yield no moves and no remainders", () => {
    const r = detectMoves([], []);
    expect(r.moves).toHaveLength(0);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(0);
  });
});
