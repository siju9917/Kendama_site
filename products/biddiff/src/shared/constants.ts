/**
 * Stable constants used across the codebase.
 */

/** Bytes. 50 MB upper bound on a single document we attempt to extract. */
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

/**
 * Diff thresholds. Tuned during Phase 3 against the labeled corpus and
 * frozen once the miss-rate audit passes.
 */
export const DIFF_THRESHOLDS = {
  /** Token Jaccard above this -> blocks are candidates for MODIFY. */
  modifyCandidateMinJaccard: 0.6,
  /** Cross-section move-detection threshold. */
  moveSimilarityMin: 0.9,
  /** Section-alignment heading-text similarity weight. */
  weightHeadingSim: 0.5,
  weightUcfMatch: 0.4,
  weightSectionTypeMatch: 0.1,
} as const;

/** Minimum extraction confidence below which we surface a warning. */
export const EXTRACTION_LOW_CONFIDENCE_THRESHOLD = 0.7;

/** Storage cap (bytes) before LRU pruning kicks in. */
export const STORAGE_HARD_CAP_BYTES = 50 * 1024 * 1024;

/**
 * Duration (ms) for "copied" / "exported" feedback flash on buttons.
 * Uniform across ChangeCard, Summary, and any future copy actions.
 */
export const COPY_FEEDBACK_FLASH_MS = 2000;

/**
 * Display labels for ChangeCategory. Single source of truth — the
 * in-app summary chips and the exported PDF/Markdown/text reports all
 * read from here so a user can't see "Evaluation" in the panel and
 * "Evaluation Criteria" in the exported PDF for the same change.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  SCOPE_SOW: "Scope (SOW)",
  EVALUATION_CRITERIA: "Evaluation Criteria",
  DATES_DEADLINES: "Dates & Deadlines",
  CLAUSES: "Clauses",
  SUBMISSION_INSTRUCTIONS: "Submission Instructions",
  PRICING_CLINS: "Pricing / CLINs",
  ATTACHMENTS: "Attachments",
  OTHER: "Other",
};
