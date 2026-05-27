/**
 * Normalization pipeline (Phase 2.9).
 *
 * Composes anchor detection over a structured document's blocks. The PDF
 * and DOCX extractors produce sections and lines; this step layers anchor
 * detection in and computes overall confidence.
 *
 * The public API is `enrichStructuredDocument` — it accepts a doc whose
 * blocks lack anchors and returns one with anchors attached. This way the
 * test corpus can also be enriched after-the-fact for diff-engine work.
 */
import type { Anchor, Block, Section, StructuredDocument } from "../model/types.js";
import { buildBlock, buildSection } from "../model/build.js";
import { detectAllAnchors } from "./anchors/index.js";

/** True for sections where CLIN matching is meaningful. */
function clinAllowed(s: Section): boolean {
  return s.sectionType === "PRICING";
}

/** Recompute anchors for every block in every section. */
export function enrichStructuredDocument(doc: StructuredDocument): StructuredDocument {
  const sections = doc.sections.map((s) => enrichSection(s));
  return { metadata: doc.metadata, sections };
}

export function enrichSection(s: Section): Section {
  const allowClin = clinAllowed(s);
  const blocks = s.blocks.map((b) => enrichBlock(b, { allowClin }));
  return buildSection({
    heading: s.heading,
    headingLevel: s.headingLevel,
    ucfLetter: s.ucfLetter,
    sectionType: s.sectionType,
    blocks,
    ordinal: s.ordinal,
  });
}

export function enrichBlock(b: Block, opts: { allowClin: boolean }): Block {
  const anchors = detectBlockAnchors(b, opts);
  // Preserve existing block (text, type) but rebuild via `buildBlock` to keep ID logic central.
  return buildBlock({
    sectionPath: b.id, // any deterministic salt; the buildBlock recomputes from this
    ordinal: b.ordinal,
    blockType: b.blockType,
    rawText: b.text,
    anchors,
    extractionConfidence: b.extractionConfidence,
  });
}

export function detectBlockAnchors(b: Block, opts: { allowClin: boolean }): Anchor[] {
  return detectAllAnchors(b.text, { allowClin: opts.allowClin });
}

/**
 * Compute an extraction-confidence summary across blocks.
 */
export function computeOverallConfidence(
  blocks: ReadonlyArray<Block>,
): number {
  if (blocks.length === 0) return 1;
  const total = blocks.reduce((n, b) => n + b.extractionConfidence, 0);
  return total / blocks.length;
}

/**
 * Reorder section blocks by ordinal (paranoia: PDF extraction may emit
 * blocks out of order if streamed concurrently). Pure.
 */
export function withSortedBlocks(s: Section): Section {
  const blocks = [...s.blocks].sort((a, b) => a.ordinal - b.ordinal);
  return buildSection({
    heading: s.heading,
    headingLevel: s.headingLevel,
    ucfLetter: s.ucfLetter,
    sectionType: s.sectionType,
    blocks,
    ordinal: s.ordinal,
  });
}
