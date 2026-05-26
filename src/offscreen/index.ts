/**
 * Offscreen document — heavy CPU work (extraction + diff) runs here so the
 * side panel stays responsive.
 *
 * Currently the side panel runs the pipeline directly because v1 is fast
 * enough; this offscreen host exists as a hook for the >200-page-document
 * path (Phase 4.13 hardening).
 */
export {};
