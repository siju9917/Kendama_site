/**
 * Critical-change detection (Phase 3.7).
 *
 * Applies the spec Part 1.5 ruleset; produces `(severity, criticalReasons)`.
 * A change is CRITICAL if ANY rule in `CRITICAL_RULES` matches.
 *
 * The ruleset is **data, not control flow** (a list of `CriticalRule`s
 * evaluated in order). This is deliberate:
 *   - Extending the federal ruleset (e.g. the human-validated categories
 *     in `human/NEED_FROM_HUMAN.md` #4 / BD2 — source-selection timeline,
 *     key personnel, compliance certs, set-asides) becomes appending a
 *     rule, not editing branching logic.
 *   - It is the seed of the rule-pack-loader abstraction
 *     (`brain/IDEA_BACKLOG.md` rank-5 / D-family): a different vertical
 *     swaps `CRITICAL_RULES` for its own pack on the same engine
 *     (validated horizontal — `test/integration/engine-domain-agnostic.test.ts`).
 *
 * The order of rules is preserved verbatim from the original branching
 * implementation so reasons emit in the same order (corpus tests lock this).
 *
 * The CRITICAL severity threshold: any matching rule. Rules 1–6:
 *   1. date/deadline · 2. page-limit/format · 3. FAR/DFARS clause
 *   add/remove/modify · 4. evaluation criteria · 5. CLIN structure/values ·
 *   6. attachment add/remove.
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

/** A single critical-change rule: when it matches, it contributes a reason. */
export interface CriticalRule {
  /** True when this rule deems the change critical. */
  matches: (input: CriticalInput) => boolean;
  /** Human-readable, REPORTING (never advising) reason; may depend on input. */
  reason: (input: CriticalInput) => string;
}

function hasAnchor(anchors: ReadonlyArray<Anchor>, t: Anchor["type"]): boolean {
  return anchors.some((a) => a.type === t);
}

const isAddRemoveModify = (t: ChangeType): boolean =>
  t === "INSERT" || t === "DELETE" || t === "MODIFY";

/**
 * The federal-solicitation critical-change rule pack. Append-only when the
 * BD2 domain-expert validation lands; swap wholesale for another vertical.
 */
export const CRITICAL_RULES: ReadonlyArray<CriticalRule> = [
  // 1. Date / deadline
  {
    matches: (i) => i.category === "DATES_DEADLINES" || hasAnchor(i.anchors, "DATE"),
    reason: () => "A date or deadline changed.",
  },
  // 2. Page limit / format
  {
    matches: (i) => i.category === "SUBMISSION_INSTRUCTIONS",
    reason: (i) =>
      hasAnchor(i.anchors, "PAGE_LIMIT") ? "A page limit changed." : "Submission instructions changed.",
  },
  // 3. Clause add/remove/modify
  {
    matches: (i) => i.category === "CLAUSES" && isAddRemoveModify(i.changeType),
    reason: (i) =>
      i.changeType === "INSERT"
        ? "A FAR/DFARS clause was added."
        : i.changeType === "DELETE"
          ? "A FAR/DFARS clause was removed."
          : "A FAR/DFARS clause changed.",
  },
  // 4. Evaluation criteria
  {
    matches: (i) => i.category === "EVALUATION_CRITERIA",
    reason: () => "Evaluation criteria changed.",
  },
  // 5. CLIN structure / values
  {
    matches: (i) => i.category === "PRICING_CLINS" && isAddRemoveModify(i.changeType),
    reason: () => "Contract-line-item (CLIN) structure changed.",
  },
  // 6. Attachment add/remove
  {
    matches: (i) => i.category === "ATTACHMENTS" && (i.changeType === "INSERT" || i.changeType === "DELETE"),
    reason: (i) => (i.changeType === "INSERT" ? "An attachment was added." : "An attachment was removed."),
  },
];

export function evaluateCriticality(input: CriticalInput): CriticalResult {
  const reasons: string[] = [];
  for (const rule of CRITICAL_RULES) {
    if (rule.matches(input)) reasons.push(rule.reason(input));
  }
  const severity: Severity = reasons.length > 0 ? "CRITICAL" : "NORMAL";
  return { severity, reasons };
}
