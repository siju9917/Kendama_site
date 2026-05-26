/**
 * False-positive suppression (Phase 3.8).
 *
 * Pre-emptively drop block-level diffs that are reformatting-only or pure
 * pagination/line-break reflow. We do this at the *aligner* level by
 * normalizing aggressively before comparison; this module is a final guard.
 */
import type { Block } from "../model/types.js";
import { normalizeText } from "../../shared/text.js";

/**
 * True if two blocks are equivalent after aggressive normalization
 * (case-insensitive, all whitespace collapsed, punctuation differences ignored).
 *
 * Used to suppress "modify" pairs that only differ in whitespace or punctuation
 * left over from upstream extraction quirks.
 */
export function isReformattingOnly(prior: Block, current: Block): boolean {
  const p = aggressiveNormalize(prior.text);
  const c = aggressiveNormalize(current.text);
  return p === c;
}

function aggressiveNormalize(s: string): string {
  return normalizeText(s)
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, "");
}
