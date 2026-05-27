/**
 * Block alignment within a paired section (Phase 3.2).
 *
 * Fast path: if `current` and `prior` are textually identical in the same
 * order, return all EQUALs without running LCS. This is by far the common
 * case (most sections are unchanged in any single amendment) and saves the
 * O(n·m) dp allocation for the many unchanged sections of a real doc.
 *
 * Otherwise:
 *   1. LCS on block text equality — gives an INSERT/DELETE/EQUAL sequence
 *      preserving order.
 *   2. Pair adjacent DELETE/INSERT spans whose modify-similarity exceeds
 *      the MODIFY threshold; reclassify as MODIFY changes.
 */
import type { Block } from "../../model/types.js";
import { diffSequence } from "../myers.js";
import { modifySimilarity } from "../../../shared/text.js";
import { DIFF_THRESHOLDS } from "../../../shared/constants.js";

export type BlockAlignmentItem =
  | { kind: "EQUAL"; current: Block; prior: Block }
  | { kind: "INSERT"; current: Block }
  | { kind: "DELETE"; prior: Block }
  | { kind: "MODIFY"; current: Block; prior: Block; similarity: number };

export function alignBlocks(
  current: ReadonlyArray<Block>,
  prior: ReadonlyArray<Block>,
): BlockAlignmentItem[] {
  // Fast path: identical sequences (most sections are unchanged).
  if (current.length === prior.length) {
    let allEqual = true;
    for (let i = 0; i < current.length; i++) {
      if (current[i].text !== prior[i].text) {
        allEqual = false;
        break;
      }
    }
    if (allEqual) {
      const out: BlockAlignmentItem[] = new Array(current.length);
      for (let i = 0; i < current.length; i++) {
        out[i] = { kind: "EQUAL", current: current[i], prior: prior[i] };
      }
      return out;
    }
  }

  // General case: full LCS over block text.
  const ops = diffSequence(current, prior, (a, b) => a.text === b.text);
  // ops are in source order (a=current, b=prior).
  // Note: in diffSequence, "delete" = absent from B, "insert" = absent from A.
  // We're diffing current (a) against prior (b), so:
  //   - "equal" = same block
  //   - "delete" = block exists in current but not prior  → INSERTED in current
  //   - "insert" = block exists in prior but not current  → DELETED from current
  // That's the inverse of what we want, so we relabel:
  type Step =
    | { kind: "EQUAL"; current: Block; prior: Block }
    | { kind: "INSERT"; current: Block }
    | { kind: "DELETE"; prior: Block };
  const steps: Step[] = [];
  for (const o of ops) {
    if (o.op === "equal") {
      steps.push({ kind: "EQUAL", current: o.value as Block, prior: o.value as Block });
    } else if (o.op === "delete") {
      // present in a (current), missing in b (prior) — was inserted
      steps.push({ kind: "INSERT", current: o.value as Block });
    } else {
      // present in b (prior), missing in a (current) — was deleted
      steps.push({ kind: "DELETE", prior: o.value as Block });
    }
  }

  // Phase 2: collapse adjacent DELETE+INSERT runs into MODIFY pairs where
  // similarity exceeds the threshold. We pair greedily by best match within
  // the run.
  const out: BlockAlignmentItem[] = [];
  let i = 0;
  while (i < steps.length) {
    const s = steps[i];
    if (s.kind !== "DELETE" && s.kind !== "INSERT") {
      out.push(s);
      i++;
      continue;
    }
    // Collect the run of consecutive INSERT/DELETE.
    let j = i;
    const runDeletes: Block[] = [];
    const runInserts: Block[] = [];
    while (j < steps.length && (steps[j].kind === "DELETE" || steps[j].kind === "INSERT")) {
      const step = steps[j];
      if (step.kind === "DELETE") runDeletes.push(step.prior);
      else if (step.kind === "INSERT") runInserts.push(step.current);
      j++;
    }
    // Pair up: for each DELETE, find the best INSERT match by Jaccard.
    const matchedDel = new Set<number>();
    const matchedIns = new Set<number>();
    type Cand = { di: number; ii: number; sim: number };
    const cands: Cand[] = [];
    for (let di = 0; di < runDeletes.length; di++) {
      for (let ii = 0; ii < runInserts.length; ii++) {
        const sim = modifySimilarity(runDeletes[di].tokens, runInserts[ii].tokens);
        if (sim >= DIFF_THRESHOLDS.modifyCandidateMinJaccard) {
          cands.push({ di, ii, sim });
        }
      }
    }
    cands.sort((a, b) => b.sim - a.sim || a.di - b.di || a.ii - b.ii);
    const modifies: BlockAlignmentItem[] = [];
    for (const c of cands) {
      if (matchedDel.has(c.di) || matchedIns.has(c.ii)) continue;
      matchedDel.add(c.di);
      matchedIns.add(c.ii);
      modifies.push({
        kind: "MODIFY",
        prior: runDeletes[c.di],
        current: runInserts[c.ii],
        similarity: c.sim,
      });
    }
    // Emit modifies sorted by current.ordinal (deterministic order).
    modifies.sort((a, b) =>
      a.kind === "MODIFY" && b.kind === "MODIFY"
        ? a.current.ordinal - b.current.ordinal
        : 0,
    );
    out.push(...modifies);
    // Remaining unmatched DELETEs and INSERTs.
    for (let di = 0; di < runDeletes.length; di++) {
      if (!matchedDel.has(di)) out.push({ kind: "DELETE", prior: runDeletes[di] });
    }
    for (let ii = 0; ii < runInserts.length; ii++) {
      if (!matchedIns.has(ii)) out.push({ kind: "INSERT", current: runInserts[ii] });
    }
    i = j;
  }
  return out;
}
