/**
 * Move detection (Phase 3.3).
 *
 * Given the INSERT and DELETE block-level alignment items across the entire
 * document, find pairs whose token similarity exceeds the move threshold
 * and reclassify them as MOVEs.
 *
 * This pass runs ACROSS sections — a block can relocate between sections.
 */
import type { Block } from "../../model/types.js";
import { jaccardSimilarity } from "../../../shared/text.js";
import { DIFF_THRESHOLDS } from "../../../shared/constants.js";

export interface MovePair {
  current: Block;
  prior: Block;
  similarity: number;
  /** Section index in the section-pair list where the INSERT was found. */
  insertSectionIndex: number;
  /** Section index in the section-pair list where the DELETE was found. */
  deleteSectionIndex: number;
}

export interface PendingInsert {
  block: Block;
  sectionIndex: number;
}

export interface PendingDelete {
  block: Block;
  sectionIndex: number;
}

export function detectMoves(
  inserts: ReadonlyArray<PendingInsert>,
  deletes: ReadonlyArray<PendingDelete>,
): {
  moves: MovePair[];
  remainingInserts: PendingInsert[];
  remainingDeletes: PendingDelete[];
} {
  type Cand = { ii: number; di: number; sim: number };
  const cands: Cand[] = [];
  for (let ii = 0; ii < inserts.length; ii++) {
    for (let di = 0; di < deletes.length; di++) {
      const sim = jaccardSimilarity(inserts[ii].block.tokens, deletes[di].block.tokens);
      if (sim >= DIFF_THRESHOLDS.moveSimilarityMin) cands.push({ ii, di, sim });
    }
  }
  cands.sort((a, b) => b.sim - a.sim || a.ii - b.ii || a.di - b.di);

  const usedInsert = new Set<number>();
  const usedDelete = new Set<number>();
  const moves: MovePair[] = [];
  for (const c of cands) {
    if (usedInsert.has(c.ii) || usedDelete.has(c.di)) continue;
    usedInsert.add(c.ii);
    usedDelete.add(c.di);
    moves.push({
      current: inserts[c.ii].block,
      prior: deletes[c.di].block,
      similarity: c.sim,
      insertSectionIndex: inserts[c.ii].sectionIndex,
      deleteSectionIndex: deletes[c.di].sectionIndex,
    });
  }

  const remainingInserts: PendingInsert[] = [];
  for (let i = 0; i < inserts.length; i++) {
    if (!usedInsert.has(i)) remainingInserts.push(inserts[i]);
  }
  const remainingDeletes: PendingDelete[] = [];
  for (let i = 0; i < deletes.length; i++) {
    if (!usedDelete.has(i)) remainingDeletes.push(deletes[i]);
  }
  return { moves, remainingInserts, remainingDeletes };
}
