/**
 * Section assembly (Phase 2.5) + section-type classification (Phase 2.6).
 *
 * Given a list of classified lines and the body-line text in between, group
 * them into Sections with detected UCF letters and inferred SectionTypes.
 */
import type { Block, Section, SectionType } from "../../model/types.js";
import { UCF_LETTER_TO_TYPE } from "../../model/types.js";
import { buildBlock, buildSection } from "../../model/build.js";
import {
  classifyHeading,
  type HeadingClassification,
  type HeadingKind,
  type RawLine,
} from "./headings.js";

const KEYWORD_RULES: ReadonlyArray<[RegExp, SectionType]> = [
  [/\b(statement of work|performance work statement|description.*specifications)\b/i, "SOW"],
  [/\b(evaluation factors|basis for award|source selection)\b/i, "EVALUATION_CRITERIA"],
  [/\b(instructions.*offerors|notice to offerors|submission instructions)\b/i, "INSTRUCTIONS"],
  [/\b(contract clauses|incorporated by reference)\b/i, "CLAUSES"],
  [/\b(supplies or services and prices|price schedule|clin)\b/i, "PRICING"],
  [/\b(list of attachments|attachment list|exhibits)\b/i, "ATTACHMENT_LIST"],
  [/\b(deliveries or performance|period of performance)\b/i, "DELIVERIES"],
  [/\b(representations.*certifications|reps and certs)\b/i, "REPS_CERTS"],
  [/\b(packaging and marking|inspection and acceptance|contract administration)\b/i, "ADMIN"],
];

export function classifyHeadingSectionType(heading: string, ucfLetter: string | null): SectionType {
  // UCF letter is the strongest signal.
  if (ucfLetter && UCF_LETTER_TO_TYPE[ucfLetter]) {
    return UCF_LETTER_TO_TYPE[ucfLetter];
  }
  // Heading keywords next.
  for (const [re, type] of KEYWORD_RULES) {
    if (re.test(heading)) return type;
  }
  return "OTHER";
}

/** A heading-classified line + the body lines that fall under it. */
export interface SectionBundle {
  heading: string;
  headingLevel: number;
  ucfLetter: string | null;
  /** SectionType derived from heading + UCF. */
  sectionType: SectionType;
  /** Raw body lines belonging to this section. */
  bodyLines: RawLine[];
  /** 1-based ordinal among top-level sections. */
  ordinal: number;
}

function extractUcfLetter(kind: HeadingKind): string | null {
  if (kind.kind === "UCF" || kind.kind === "LETTER_DOT") return kind.letter;
  if (kind.kind === "SECTION_LM_ITEM") return kind.itemId.charAt(0);
  return null;
}

/**
 * Walk a flat line stream. Whenever a heading is found with sufficient
 * confidence, start a new section. Lines preceding the first heading are
 * collected into an implicit "Preamble" section.
 */
export function assembleSections(
  classifications: ReadonlyArray<HeadingClassification>,
  opts: { headingConfidenceThreshold?: number } = {},
): SectionBundle[] {
  const cutoff = opts.headingConfidenceThreshold ?? 0.6;
  const sections: SectionBundle[] = [];
  let ordinal = 0;

  // Implicit preamble.
  let current: SectionBundle | null = null;

  const start = (heading: string, level: number, ucfLetter: string | null): SectionBundle => {
    return {
      heading,
      headingLevel: level,
      ucfLetter,
      sectionType: classifyHeadingSectionType(heading, ucfLetter),
      bodyLines: [],
      ordinal: ordinal++,
    };
  };

  for (const c of classifications) {
    const isHeading = c.confidence >= cutoff && c.kind.kind !== "NONE";
    if (isHeading) {
      if (current) sections.push(current);
      const ucfLetter = extractUcfLetter(c.kind);
      const level =
        c.kind.kind === "UCF" || c.kind.kind === "LETTER_DOT"
          ? 1
          : "level" in c.kind
            ? c.kind.level
            : 2;
      current = start(c.line.text.trim(), level, ucfLetter);
    } else {
      if (!current) {
        current = start("Preamble", 1, null);
      }
      // Preserve only non-empty body lines; collapsing happens at block-build.
      if (c.line.text.trim().length > 0) {
        current.bodyLines.push(c.line);
      }
    }
  }

  if (current) sections.push(current);
  return sections;
}

/**
 * Turn body lines into Blocks. Adjacent non-empty lines collapse into one
 * paragraph unless an explicit blank line was between them (we encode that
 * by inserting a `{text: ""}` marker line before calling).
 *
 * For simplicity here we treat each body line as one block. Phase 2.3
 * (PDF line/block reconstruction) is what decides when to merge.
 */
export function sectionBundleToBlocks(
  bundle: SectionBundle,
  sectionPath: string,
): Block[] {
  return bundle.bodyLines.map((line, i) =>
    buildBlock({
      sectionPath,
      ordinal: i,
      blockType: line.text.trim().startsWith("- ") ? "LIST_ITEM" : "PARAGRAPH",
      rawText: line.text,
    }),
  );
}

/** Convenience: assemble straight from raw lines. */
export function sectionsFromRawLines(
  lines: ReadonlyArray<RawLine>,
  opts: { modalBodyFontSize?: number; headingConfidenceThreshold?: number } = {},
): Section[] {
  const classifications = lines.map((l) => classifyHeading(l, opts.modalBodyFontSize));
  const bundles = assembleSections(classifications, {
    headingConfidenceThreshold: opts.headingConfidenceThreshold,
  });
  return bundles.map((b) =>
    buildSection({
      heading: b.heading,
      headingLevel: b.headingLevel,
      ucfLetter: b.ucfLetter,
      sectionType: b.sectionType,
      ordinal: b.ordinal,
      blocks: sectionBundleToBlocks(b, b.ucfLetter ?? `S${b.ordinal}`),
    }),
  );
}
