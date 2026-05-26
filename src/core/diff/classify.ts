/**
 * Change classification (Phase 3.6).
 *
 * Maps every Change to a ChangeCategory using anchors + section type.
 * Order is precise (first match wins) per spec Part 7.1 step 3.6.
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

export function classifyChange({ section, anchors }: ClassifyInput): ChangeCategory {
  const sectionType: SectionType | null = section?.sectionType ?? null;

  // 1. Clauses
  if (hasAnchorOfType(anchors, "CLAUSE_REF") || sectionType === "CLAUSES") return "CLAUSES";
  // 2. Evaluation criteria
  if (sectionType === "EVALUATION_CRITERIA") return "EVALUATION_CRITERIA";
  // 3. Dates/deadlines
  if (hasAnchorOfType(anchors, "DATE") || sectionType === "DELIVERIES") return "DATES_DEADLINES";
  // 4. Submission instructions
  if (hasAnchorOfType(anchors, "PAGE_LIMIT") || sectionType === "INSTRUCTIONS")
    return "SUBMISSION_INSTRUCTIONS";
  // 5. Pricing / CLINs
  if (
    hasAnchorOfType(anchors, "CLIN") ||
    hasAnchorOfType(anchors, "MONEY") ||
    sectionType === "PRICING"
  )
    return "PRICING_CLINS";
  // 6. Attachments
  if (sectionType === "ATTACHMENT_LIST") return "ATTACHMENTS";
  // 7. Scope of work
  if (sectionType === "SOW") return "SCOPE_SOW";
  return "OTHER";
}
