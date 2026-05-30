/**
 * Change classification (Phase 3.6).
 *
 * Maps every Change to a ChangeCategory using anchors + section type.
 * Order is precise (FIRST match wins) per spec Part 7.1 step 3.6.
 *
 * Like `critical.ts`, the mapping is **data, not branching**
 * (`CLASSIFY_RULES`, evaluated in order) so a new vertical swaps the
 * pack and a new category is an appended/inserted rule — the rule-pack
 * abstraction for the `regdiff`/D-family. Order is preserved verbatim
 * from the original branching implementation.
 */
import type { Anchor, Section, SectionType } from "../model/types.js";
import type { ChangeCategory } from "./types.js";

export interface ClassifyInput {
  /** Section the change happens in. */
  section: Section | null;
  /** Anchors collected from the affected block(s). */
  anchors: ReadonlyArray<Anchor>;
}

function hasAnchorOfType(anchors: ReadonlyArray<Anchor>, type: Anchor["type"]): boolean {
  for (const a of anchors) if (a.type === type) return true;
  return false;
}

interface ClassifyRule {
  matches: (sectionType: SectionType | null, anchors: ReadonlyArray<Anchor>) => boolean;
  category: ChangeCategory;
}

/** First-match-wins category rules (order is significant). */
const CLASSIFY_RULES: ReadonlyArray<ClassifyRule> = [
  { matches: (st, a) => hasAnchorOfType(a, "CLAUSE_REF") || st === "CLAUSES", category: "CLAUSES" },
  { matches: (st) => st === "EVALUATION_CRITERIA", category: "EVALUATION_CRITERIA" },
  { matches: (st, a) => hasAnchorOfType(a, "DATE") || st === "DELIVERIES", category: "DATES_DEADLINES" },
  { matches: (st, a) => hasAnchorOfType(a, "PAGE_LIMIT") || st === "INSTRUCTIONS", category: "SUBMISSION_INSTRUCTIONS" },
  {
    matches: (st, a) => hasAnchorOfType(a, "CLIN") || hasAnchorOfType(a, "MONEY") || st === "PRICING",
    category: "PRICING_CLINS",
  },
  { matches: (st) => st === "ATTACHMENT_LIST", category: "ATTACHMENTS" },
  { matches: (st) => st === "SOW", category: "SCOPE_SOW" },
];

export function classifyChange({ section, anchors }: ClassifyInput): ChangeCategory {
  const sectionType: SectionType | null = section?.sectionType ?? null;
  for (const rule of CLASSIFY_RULES) {
    if (rule.matches(sectionType, anchors)) return rule.category;
  }
  return "OTHER";
}
