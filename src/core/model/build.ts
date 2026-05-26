/**
 * Pure constructors for the structured-document model.
 *
 * Every block, section, and document goes through these so IDs are
 * stable content hashes — not random — and tokens always match `text`.
 */
import { contentHash, shortHash } from "../../shared/hash.js";
import { normalizeText, tokenize } from "../../shared/text.js";
import type {
  Anchor,
  Block,
  BlockType,
  DocMetadata,
  Section,
  SectionType,
  StructuredDocument,
} from "./types.js";

export interface BuildBlockInput {
  sectionPath: string;
  ordinal: number;
  blockType: BlockType;
  rawText: string;
  anchors?: Anchor[];
  extractionConfidence?: number;
}

export function buildBlock(input: BuildBlockInput): Block {
  const text = normalizeText(input.rawText);
  const tokens = tokenize(text);
  const id = contentHash(`${input.sectionPath}#${input.ordinal}:${text}`);
  return {
    id,
    blockType: input.blockType,
    text,
    tokens,
    anchors: input.anchors ?? [],
    ordinal: input.ordinal,
    extractionConfidence: clamp01(input.extractionConfidence ?? 1),
  };
}

export interface BuildSectionInput {
  heading: string;
  headingLevel: number;
  ucfLetter: string | null;
  sectionType: SectionType;
  blocks: Block[];
  ordinal: number;
}

export function buildSection(input: BuildSectionInput): Section {
  const blockSig = input.blocks.map((b) => b.id).join("|");
  const id = contentHash(`sec:${input.ordinal}:${input.heading}:${blockSig}`);
  return {
    id,
    heading: normalizeText(input.heading),
    headingLevel: input.headingLevel,
    ucfLetter: input.ucfLetter,
    sectionType: input.sectionType,
    blocks: input.blocks,
    ordinal: input.ordinal,
  };
}

export interface BuildDocumentInput {
  metadata: DocMetadata;
  sections: Section[];
}

export function buildDocument(input: BuildDocumentInput): StructuredDocument {
  return { metadata: input.metadata, sections: input.sections };
}

export function emptyMetadata(sourceFileName: string, sourceBytes: ArrayBuffer): DocMetadata {
  const hash = shortHash(`${sourceFileName}:${sourceBytes.byteLength}`);
  return {
    sourceFileName,
    sourceFileHash: hash,
    solicitationId: null,
    amendmentNumber: null,
    extractedAt: new Date(0).toISOString(),
    overallExtractionConfidence: 1,
    extractionWarnings: [],
    pageCount: 0,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
