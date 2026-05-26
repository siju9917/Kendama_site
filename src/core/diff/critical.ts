/**
 * Critical-change detection (Phase 3.7).
 *
 * Applies the spec Part 1.5 ruleset; produces `(severity, criticalReasons)`.
 * A change is CRITICAL if ANY of:
 *   1. It changes a date or deadline (DATE anchor / DATES_DEADLINES category).
 *   2. It changes a page-limit or mandatory format requirement
 *      (PAGE_LIMIT anchor / SUBMISSION_INSTRUCTIONS category).
 *   3. It adds or removes a FAR/DFARS clause (CLAUSES + INSERT/DELETE).
 *   4. It changes evaluation criteria (EVALUATION_CRITERIA category).
 *   5. It changes CLIN structure
 *      (PRICING_CLINS with CLIN anchor, or any INSERT/DELETE in PRICING).
 *   6. It adds or removes an attachment (ATTACHMENTS + INSERT/DELETE).
 */
import type { Anchor } from "../model/types.js";
import type { ChangeCategory, ChangeType, Severity } from "./types.js";

export interface CriticalInput {
  changeType: ChangeType;
  category: ChangeCategory;
  anchors: ReadonlyArray<Anchor>;
}

export interface CriticalResult {
  severity: Severity;
  reasons: string[];
}

function hasAnchor(anchors: ReadonlyArray<Anchor>, t: Anchor["type"]): boolean {
  return anchors.some((a) => a.type === t);
}

export function evaluateCriticality(input: CriticalInput): CriticalResult {
  const reasons: string[] = [];

  // 1. Date / deadline
  if (input.category === "DATES_DEADLINES" || hasAnchor(input.anchors, "DATE")) {
    reasons.push("A date or deadline changed.");
  }
  // 2. Page limit / format
  if (input.category === "SUBMISSION_INSTRUCTIONS") {
    if (hasAnchor(input.anchors, "PAGE_LIMIT")) {
      reasons.push("A page limit changed.");
    } else {
      reasons.push("Submission instructions changed.");
    }
  }
  // 3. Clause add/remove
  if (
    input.category === "CLAUSES" &&
    (input.changeType === "INSERT" ||
      input.changeType === "DELETE" ||
      input.changeType === "MODIFY")
  ) {
    reasons.push(
      input.changeType === "INSERT"
        ? "A FAR/DFARS clause was added."
        : input.changeType === "DELETE"
          ? "A FAR/DFARS clause was removed."
          : "A FAR/DFARS clause changed.",
    );
  }
  // 4. Evaluation criteria
  if (input.category === "EVALUATION_CRITERIA") {
    reasons.push("Evaluation criteria changed.");
  }
  // 5. CLIN structure
  if (
    input.category === "PRICING_CLINS" &&
    (input.changeType === "INSERT" || input.changeType === "DELETE" || input.changeType === "MODIFY")
  ) {
    reasons.push("Contract-line-item (CLIN) structure changed.");
  }
  // 6. Attachment add/remove
  if (input.category === "ATTACHMENTS" && (input.changeType === "INSERT" || input.changeType === "DELETE")) {
    reasons.push(input.changeType === "INSERT" ? "An attachment was added." : "An attachment was removed.");
  }

  const severity: Severity = reasons.length > 0 ? "CRITICAL" : "NORMAL";
  return { severity, reasons };
}
