/**
 * Built-in sample diff (first-run "See an example" affordance).
 *
 * Lets a brand-new user reach value with zero setup — no need to find and
 * upload two solicitation versions first. Builds a small, realistic
 * before/after Section L through the real model + engine (not the file
 * extractors) so it exercises the genuine classification + criticality
 * path. Pure and deterministic; safe to call anywhere.
 */
import type { DiffResult } from "../diff/types.js";
import type { Section, StructuredDocument } from "../model/types.js";
import { buildBlock, buildSection } from "../model/build.js";
import { enrichStructuredDocument } from "../extract/normalize.js";
import { DiffEngine } from "../diff/engine.js";
import { LocalClauseClient } from "../clauses/client.js";

function instructionsSection(lines: string[]): Section {
  return buildSection({
    heading: "SECTION L — INSTRUCTIONS TO OFFERORS",
    headingLevel: 1,
    ucfLetter: "L",
    sectionType: "INSTRUCTIONS",
    ordinal: 0,
    blocks: lines.map((text, i) =>
      buildBlock({ sectionPath: "L", ordinal: i, blockType: "PARAGRAPH", rawText: text }),
    ),
  });
}

function doc(name: string, amendment: string, lines: string[]): StructuredDocument {
  return {
    metadata: {
      sourceFileName: name,
      sourceFileHash: name,
      solicitationId: "SAMPLE-RFP-0042",
      amendmentNumber: amendment,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    sections: [instructionsSection(lines)],
  };
}

/**
 * Build the sample DiffResult. The "amendment" introduces three critical
 * changes a real reviewer would care about: a moved due date, a tightened
 * page limit, and an added DFARS clause.
 */
export function buildSampleResult(): DiffResult {
  const prior = enrichStructuredDocument(
    doc("Sample solicitation — Amendment 0001.pdf", "0001", [
      "Proposals are due no later than 2026-08-15 at 2:00 PM Eastern Time.",
      "The technical proposal shall not exceed 30 pages.",
      "FAR 52.204-21 applies to this acquisition.",
      "Questions are due five business days before the deadline.",
    ]),
  );
  const current = enrichStructuredDocument(
    doc("Sample solicitation — Amendment 0002.pdf", "0002", [
      "Proposals are due no later than 2026-09-12 at 2:00 PM Eastern Time.",
      "The technical proposal shall not exceed 25 pages.",
      "FAR 52.204-21 applies to this acquisition.",
      "Questions are due five business days before the deadline.",
      "DFARS 252.204-7012 applies to this acquisition.",
    ]),
  );
  const result = new DiffEngine(new LocalClauseClient()).diff(current, prior);
  // Deterministic, fixed stamp — this is a canned sample, not a live diff.
  result.generatedAt = "2026-05-30T12:00:00.000Z";
  return result;
}
