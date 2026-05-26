/**
 * Canonical structured-document model.
 *
 * Every downstream stage (diff, classification, export) operates on these
 * types. They are the contract between extraction and the rest of the system.
 */

/** Domain entities detected inside a block of text. */
export type AnchorType =
  | "CLAUSE_REF"
  | "DATE"
  | "MONEY"
  | "PAGE_LIMIT"
  | "CLIN"
  | "SECTION_REF";

export interface Anchor {
  type: AnchorType;
  /** Exact text matched in the source. */
  raw: string;
  /** Canonical form (clause "52.204-21"; date ISO-8601; money in cents). */
  normalized: string;
  /** Character offset within the containing block's text. */
  charStart: number;
  charEnd: number;
}

export type BlockType =
  | "HEADING"
  | "PARAGRAPH"
  | "LIST_ITEM"
  | "TABLE_ROW"
  | "CLAUSE_REFERENCE"
  | "DATE_STATEMENT";

export interface Block {
  /** Stable content hash: sectionPath + ordinal + textHash. */
  id: string;
  blockType: BlockType;
  /** Normalized text (whitespace collapsed). */
  text: string;
  /** Tokenized text for fine-grained diff. Joining reconstructs `text`. */
  tokens: string[];
  anchors: Anchor[];
  ordinal: number;
  /** 0..1 confidence that extraction was clean. */
  extractionConfidence: number;
}

export type SectionType =
  | "SOW"
  | "EVALUATION_CRITERIA"
  | "INSTRUCTIONS"
  | "CLAUSES"
  | "PRICING"
  | "ATTACHMENT_LIST"
  | "DELIVERIES"
  | "REPS_CERTS"
  | "ADMIN"
  | "OTHER";

export interface Section {
  id: string;
  heading: string;
  /** 1 = top-level UCF section, 2+ = subsections. */
  headingLevel: number;
  /** "A".."M" if a UCF letter was detected, else null. */
  ucfLetter: string | null;
  sectionType: SectionType;
  blocks: Block[];
  ordinal: number;
}

export interface DocMetadata {
  sourceFileName: string;
  sourceFileHash: string;
  solicitationId: string | null;
  amendmentNumber: string | null;
  /** ISO-8601 timestamp. */
  extractedAt: string;
  overallExtractionConfidence: number;
  extractionWarnings: string[];
  pageCount: number;
}

export interface StructuredDocument {
  metadata: DocMetadata;
  sections: Section[];
}

/** Letters A..M used by UCF section headers. */
export const UCF_LETTERS: ReadonlyArray<string> = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
];

/** Mapping of UCF letter to the canonical SectionType. */
export const UCF_LETTER_TO_TYPE: Readonly<Record<string, SectionType>> = {
  A: "ADMIN",
  B: "PRICING",
  C: "SOW",
  D: "OTHER",
  E: "OTHER",
  F: "DELIVERIES",
  G: "ADMIN",
  H: "OTHER",
  I: "CLAUSES",
  J: "ATTACHMENT_LIST",
  K: "REPS_CERTS",
  L: "INSTRUCTIONS",
  M: "EVALUATION_CRITERIA",
};
