/**
 * Section alignment (Phase 3.1).
 *
 * Strategy: compute a weighted similarity score between every (current, prior)
 * section pair, then solve with a greedy best-match-first assignment.
 * Unmatched sections become whole-section inserts/deletes.
 *
 * Determinism: the greedy pass orders candidates by (score desc, current ordinal
 * asc, prior ordinal asc). No timestamps, no randomness.
 */
import type { Section } from "../../model/types.js";
import { jaccardSimilarity, levenshteinRatio, tokenize } from "../../../shared/text.js";
import { DIFF_THRESHOLDS } from "../../../shared/constants.js";

export interface SectionPair {
  current: Section | null;
  prior: Section | null;
  score: number;
}

export function scoreSectionPair(curr: Section, pr: Section): number {
  // UCF letter match is the strongest signal.
  const ucfMatch = curr.ucfLetter && pr.ucfLetter && curr.ucfLetter === pr.ucfLetter ? 1 : 0;
  const typeMatch = curr.sectionType === pr.sectionType ? 1 : 0;
  const headingSim = levenshteinRatio(curr.heading, pr.heading);
  // Combine with a token-set Jaccard over headings too, weighted into headingSim.
  const headingJaccard = jaccardSimilarity(tokenize(curr.heading), tokenize(pr.heading));
  const headingBlend = 0.5 * headingSim + 0.5 * headingJaccard;
  return (
    DIFF_THRESHOLDS.weightUcfMatch * ucfMatch +
    DIFF_THRESHOLDS.weightSectionTypeMatch * typeMatch +
    DIFF_THRESHOLDS.weightHeadingSim * headingBlend
  );
}

/**
 * Greedy assignment of current sections to prior sections.
 *
 * Returns a list of pairs covering every section on both sides:
 *   - matched: both `current` and `prior` non-null
 *   - inserted: `prior` is null
 *   - deleted: `current` is null
 *
 * Pairs returned in deterministic order (matched by current ordinal first,
 * then INSERTs by current ordinal, then DELETEs by prior ordinal).
 */
export function alignSections(
  current: ReadonlyArray<Section>,
  prior: ReadonlyArray<Section>,
  minScore = 0.5,
): SectionPair[] {
  type Candidate = { c: number; p: number; score: number };
  const candidates: Candidate[] = [];
  for (let c = 0; c < current.length; c++) {
    for (let p = 0; p < prior.length; p++) {
      const score = scoreSectionPair(current[c], prior[p]);
      if (score >= minScore) candidates.push({ c, p, score });
    }
  }
  // Deterministic order: best score first, then by indexes.
  candidates.sort((a, b) => b.score - a.score || a.c - b.c || a.p - b.p);

  const usedCurrent = new Set<number>();
  const usedPrior = new Set<number>();
  const matched: SectionPair[] = [];
  for (const cand of candidates) {
    if (usedCurrent.has(cand.c) || usedPrior.has(cand.p)) continue;
    usedCurrent.add(cand.c);
    usedPrior.add(cand.p);
    matched.push({ current: current[cand.c], prior: prior[cand.p], score: cand.score });
  }

  const out: SectionPair[] = [];
  // Matched pairs first, ordered by the current section's ordinal.
  matched.sort((a, b) => (a.current?.ordinal ?? 0) - (b.current?.ordinal ?? 0));
  out.push(...matched);

  // Unmatched current = INSERTed sections.
  for (let c = 0; c < current.length; c++) {
    if (!usedCurrent.has(c)) {
      out.push({ current: current[c], prior: null, score: 0 });
    }
  }
  // Unmatched prior = DELETEd sections.
  for (let p = 0; p < prior.length; p++) {
    if (!usedPrior.has(p)) {
      out.push({ current: null, prior: prior[p], score: 0 });
    }
  }
  return out;
}
