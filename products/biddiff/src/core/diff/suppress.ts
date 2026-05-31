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
 * (case-insensitive, whitespace collapsed, non-numeric punctuation ignored).
 *
 * Used to suppress "modify" pairs that only differ in whitespace or punctuation
 * left over from upstream extraction quirks.
 *
 * CRITICAL INVARIANT: this must never collapse two *different numeric values*
 * to the same string. Stripping every punctuation mark (the previous
 * behavior) turned "$1.5M" → "$15M", "3.50" → "350", and "2.5 days" →
 * "25 days" into "reformatting" and silently hid them — a false negative,
 * which for a critical-change tool is the worst possible failure. We instead
 * preserve any punctuation that sits *between two digits* (decimal points,
 * etc.) because removing it can change a number's value. The deliberate bias
 * is toward surfacing a change rather than hiding one.
 */
export function isReformattingOnly(prior: Block, current: Block): boolean {
  const p = aggressiveNormalize(prior.text);
  const c = aggressiveNormalize(current.text);
  return p === c;
}

export function aggressiveNormalize(s: string): string {
  // Drop en-US thousands-separator commas first (digit, comma, exactly three
  // digits, then a non-digit/end). These are pure grouping and
  // value-preserving, so "1,500" and "1500" should still be treated as
  // reformatting. U.S. federal solicitations use the en-US numeric
  // convention (comma = thousands, period = decimal); this is domain-correct.
  const base = normalizeText(s)
    .toLowerCase()
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, "");

  // Remove whitespace and punctuation, but KEEP a punctuation character that
  // is value-bearing. Whitespace is always dropped. A punctuation mark is
  // value-bearing (and must survive, so distinct numbers never collapse) when:
  //   (a) it is flanked by digits on BOTH sides — e.g. the "." in "1.5" must
  //       survive so it never equals "15", and the "-" in a "3-5" range; OR
  //   (b) it is a "%" immediately PRECEDED by a digit — "50%" is a different
  //       value from "50" (a percentage vs a bare count); OR
  //   (c) it is a sign ("+"/"-") immediately FOLLOWED by a digit and NOT
  //       preceded by an alphanumeric — i.e. it reads as the sign of a number
  //       ("-5" differs in value from "5"), not a hyphen inside a word
  //       ("section-5", which stays reformatting-only).
  // The bias remains toward surfacing a change rather than hiding one.
  let out = "";
  for (let i = 0; i < base.length; i++) {
    const ch = base[i];
    if (/\s/u.test(ch)) continue;
    if (/\p{P}/u.test(ch)) {
      const prev = base[i - 1];
      const next = base[i + 1];
      const flankedByDigits =
        prev !== undefined && next !== undefined && /\d/.test(prev) && /\d/.test(next);
      const isTrailingPercent = ch === "%" && prev !== undefined && /\d/.test(prev);
      const isLeadingSign =
        (ch === "-" || ch === "+") &&
        next !== undefined &&
        /\d/.test(next) &&
        (prev === undefined || !/[\p{L}\p{N}]/u.test(prev));
      if (!flankedByDigits && !isTrailingPercent && !isLeadingSign) continue;
    }
    out += ch;
  }
  return out;
}
