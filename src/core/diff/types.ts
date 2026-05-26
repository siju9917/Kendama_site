/**
 * The diff output model: what comes out of the diff engine.
 */
import type { Anchor } from "../model/types.js";

export type ChangeType = "INSERT" | "DELETE" | "MODIFY" | "MOVE";

export type ChangeCategory =
  | "SCOPE_SOW"
  | "EVALUATION_CRITERIA"
  | "DATES_DEADLINES"
  | "CLAUSES"
  | "SUBMISSION_INSTRUCTIONS"
  | "PRICING_CLINS"
  | "ATTACHMENTS"
  | "OTHER";

export type Severity = "CRITICAL" | "NORMAL";

/** Token-level span used to render word-precise MODIFY changes. */
export interface TokenSpan {
  op: "equal" | "insert" | "delete";
  text: string;
}

export type Regulation = "FAR" | "DFARS" | "OTHER";

export interface ClauseInfo {
  clauseNumber: string;
  title: string;
  /** Short neutral plain-language note. Reports, never advises. */
  plainLanguageNote: string;
  regulation: Regulation;
}

export interface Change {
  id: string;
  changeType: ChangeType;
  category: ChangeCategory;
  severity: Severity;
  sectionHeading: string;
  ucfLetter: string | null;
  /** null for INSERT */
  beforeText: string | null;
  /** null for DELETE */
  afterText: string | null;
  /** Populated for MODIFY. */
  tokenSpans: TokenSpan[] | null;
  anchorsInvolved: Anchor[];
  /** Human-readable reasons a change was flagged CRITICAL. */
  criticalReasons: string[];
  /** Populated when a CLAUSE_REF is involved. */
  clauseInfo: ClauseInfo | null;
  locationHint: string;
}

export interface DiffResult {
  id: string;
  /** ISO-8601. Set by the caller, NOT by the deterministic diff core. */
  generatedAt: string;
  currentDoc: import("../model/types.js").DocMetadata;
  priorDoc: import("../model/types.js").DocMetadata;
  changes: Change[];
  criticalCount: number;
  changeCountByCategory: Record<ChangeCategory, number>;
  diffConfidence: number;
  warnings: string[];
}

/** Empty category map: a callable factory keeps determinism (no key reordering). */
export function emptyCategoryCounts(): Record<ChangeCategory, number> {
  return {
    SCOPE_SOW: 0,
    EVALUATION_CRITERIA: 0,
    DATES_DEADLINES: 0,
    CLAUSES: 0,
    SUBMISSION_INSTRUCTIONS: 0,
    PRICING_CLINS: 0,
    ATTACHMENTS: 0,
    OTHER: 0,
  };
}
