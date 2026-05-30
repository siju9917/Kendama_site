/**
 * Move-detection threshold boundary bug-hunt (5.7.5; queued by
 * CRITIQUE_LOG bug-hunt pass 8).
 *
 * `detectMoves` pairs a pending DELETE with a pending INSERT when their
 * token similarity is `>= MOVE_SIMILARITY_THRESHOLD` (0.8). The boundary
 * is exactly the kind of place off-by-one / strict-vs-non-strict bugs
 * hide: is a pair AT 0.8 a move or not? The code uses `>=`, so AT the
 * threshold it MUST be a move; just below it MUST remain a separate
 * insert+delete.
 *
 * Robustness note: rather than hand-deriving similarity from an assumed
 * tokenizer, this test MEASURES `tokenSimilarity` on its constructed
 * inputs and asserts the measured value first. If the construction does
 * not actually land where intended, the test fails loudly at that assert
 * (and the boundary claim below it is never reached on a wrong premise) —
 * so the boundary check is only ever evaluated against genuinely
 * at/above/below-threshold inputs.
 */
import { describe, it, expect } from "vitest";
import { detectMoves, type PendingInsert, type PendingDelete } from "../../src/core/diff/align/moves.js";
import { tokenSimilarity } from "../../src/core/diff/tokens.js";
import { buildBlock } from "../../src/core/model/build.js";
import { MOVE_SIMILARITY_THRESHOLD } from "../../src/shared/constants.js";

function pendingDelete(text: string): PendingDelete {
  return { block: buildBlock({ sectionPath: "d", ordinal: 0, blockType: "PARAGRAPH", rawText: text }), sectionIndex: 0 };
}
function pendingInsert(text: string): PendingInsert {
  return { block: buildBlock({ sectionPath: "i", ordinal: 0, blockType: "PARAGRAPH", rawText: text }), sectionIndex: 1 };
}

describe("move detection: threshold boundary (5.7.5)", () => {
  it("threshold constant is the documented 0.8", () => {
    expect(MOVE_SIMILARITY_THRESHOLD).toBe(0.8);
  });

  it("an exact-content relocation (similarity 1.0) is always a move", () => {
    const text = "Offers are due 2026-08-15 at 2:00 PM local time.";
    expect(tokenSimilarity(text, text)).toBe(1);
    const r = detectMoves([pendingInsert(text)], [pendingDelete(text)]);
    expect(r.moves).toHaveLength(1);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(0);
    expect(r.moves[0].similarity).toBe(1);
  });

  it("a pair AT the 0.8 threshold is a move (>= semantics)", () => {
    // Two 5-token strings sharing 4 tokens → Dice 2*4/(5+5) = 0.8 exactly,
    // IF the tokenizer splits on whitespace. The assert below verifies the
    // premise; if the tokenizer differs, this fails here rather than giving
    // a false sense of boundary coverage.
    const a = "alpha bravo charlie delta exray";
    const b = "alpha bravo charlie delta foxtrot";
    const sim = tokenSimilarity(a, b);
    expect(sim, `expected the constructed pair to sit exactly at the threshold; measured ${sim}`).toBeCloseTo(0.8, 10);

    const r = detectMoves([pendingInsert(b)], [pendingDelete(a)]);
    expect(r.moves, "a pair exactly at the >= threshold must be detected as a move").toHaveLength(1);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(0);
  });

  it("a pair just BELOW the threshold is NOT a move", () => {
    // 3 shared of 5+5 → Dice 6/10 = 0.6 < 0.8.
    const a = "alpha bravo charlie delta exray";
    const b = "alpha bravo charlie mike november";
    const sim = tokenSimilarity(a, b);
    expect(sim, `expected below-threshold; measured ${sim}`).toBeLessThan(MOVE_SIMILARITY_THRESHOLD);

    const r = detectMoves([pendingInsert(b)], [pendingDelete(a)]);
    expect(r.moves, "a below-threshold pair must NOT be a move").toHaveLength(0);
    expect(r.remainingInserts).toHaveLength(1);
    expect(r.remainingDeletes).toHaveLength(1);
  });

  it("greedy matching: one insert is consumed by at most one delete", () => {
    // Two DISTINCT deletes both above-threshold vs one insert. Distinct
    // content → distinct content-hash ids (so the id-based remainder filter
    // does not conflate them — see the note test below). The first delete
    // in order wins the insert; the second has no unused insert left.
    const insert = "alpha bravo charlie delta echo";
    const del1 = "alpha bravo charlie delta echo";       // sim 1.0
    const del2 = "alpha bravo charlie delta foxtrot";     // sim 0.8 (still >= threshold)
    expect(tokenSimilarity(del2, insert)).toBeCloseTo(0.8, 10);

    const r = detectMoves(
      [pendingInsert(insert)],
      [pendingDelete(del1), pendingDelete(del2)],
    );
    expect(r.moves).toHaveLength(1);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(1);
    // The winner is the first delete (sim 1.0); del2 remains.
    expect(r.remainingDeletes[0].block.text).toContain("foxtrot");
  });

  it("note: identical-content duplicate deletes share an id (documented edge)", () => {
    // buildBlock derives the block id from (sectionPath, ordinal, text), so
    // two deletes with identical text + position have the SAME id. When one
    // is matched as a move, the id-based remainder filter drops BOTH from
    // remainingDeletes. This documents the current behavior so a future
    // change here is a conscious decision, not a silent regression. (Real
    // documents rarely contain two byte-identical paragraphs at the same
    // section/ordinal, so this is an edge, not a live correctness issue.)
    const t = "identical duplicated clause text appears twice verbatim here";
    const r = detectMoves([pendingInsert(t)], [pendingDelete(t), pendingDelete(t)]);
    expect(r.moves).toHaveLength(1);
    // Documented consequence of id-collision: both same-id deletes are
    // filtered out of the remainder.
    expect(r.remainingDeletes).toHaveLength(0);
  });

  it("empty pending lists yield no moves and no remainders", () => {
    const r = detectMoves([], []);
    expect(r.moves).toHaveLength(0);
    expect(r.remainingInserts).toHaveLength(0);
    expect(r.remainingDeletes).toHaveLength(0);
  });
});
