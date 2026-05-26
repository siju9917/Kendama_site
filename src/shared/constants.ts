/**
 * Stable constants used across the codebase.
 */

/** Bytes. 50 MB upper bound on a single document we attempt to extract. */
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

/** Pages. Documents larger than this run with progress streaming. */
export const LARGE_DOCUMENT_PAGE_THRESHOLD = 200;

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
