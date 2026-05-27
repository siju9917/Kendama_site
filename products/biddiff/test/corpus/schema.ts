/**
 * Corpus ground-truth schema (Phase 1.3).
 *
 * Each amendment pair has a label file `labels/<pairId>.json` matching
 * `PairLabel`. The diff engine's output is compared against this.
 */
import type { ChangeCategory, ChangeType, Severity } from "../../src/core/diff/types.js";

export interface ExpectedChange {
  /** What must be detected. */
  changeType: ChangeType;
  category: ChangeCategory;
  severity: Severity;
  /** Human description of WHERE in the document. */
  locationDescription: string;
  /** Human description of WHAT changed. */
  summary: string;
  /**
   * When true (CRITICAL or explicitly required), the diff engine MUST find
   * something matching this change. The miss-rate audit measures this.
   */
  mustDetect: boolean;
  /**
   * Optional: textual fragments that should appear in the produced Change's
   * before/after text. Used for stricter matching when convenient.
   */
  expectedTextFragments?: string[];
}

export interface PairLabel {
  pairId: string;
  description: string;
  currentFile: string;
  priorFile: string;
  /** Authoring note: "generated" | "hand-labeled" | "mixed". */
  origin: "generated" | "hand-labeled" | "mixed";
  expectedChanges: ExpectedChange[];
}

export interface CorpusManifestEntry {
  pairId: string;
  description: string;
  tags: ReadonlyArray<string>;
  currentFile: string;
  priorFile: string;
  labelFile: string;
}

export interface CorpusManifest {
  generatedAt: string;
  pairs: CorpusManifestEntry[];
}
