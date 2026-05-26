/**
 * Base solicitation templates. A "template" is the prior (baseline) document.
 * Edit operations applied to it produce the amended (current) document.
 *
 * Templates are intentionally varied: service contracts, supply contracts,
 * commercial-item buys, defense-related buys. They exercise every UCF
 * section and a range of typical clause inventories.
 */
import type { Block, Section, StructuredDocument } from "../../src/core/model/types.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";

export interface TemplateOptions {
  /** Stable seed for IDs. */
  id: string;
  agencyName: string;
  solicitationId: string;
  /** True for DoD / defense procurement (drops DFARS clauses in). */
  isDefense: boolean;
  /** Proposal due date (ISO-8601 day). */
  proposalDueDate: string;
  /** Section L page limit. */
  pageLimit: number;
  /** Section M evaluation factors, in declared order. */
  evaluationFactors: ReadonlyArray<string>;
  /** Section B CLIN structure. */
  clins: ReadonlyArray<{ number: string; description: string; qty: number; unit: string }>;
  /** Section I clauses by number. */
  clauses: ReadonlyArray<string>;
  /** Section J attachments. */
  attachments: ReadonlyArray<{ id: string; title: string }>;
  /** Section C statement-of-work content (paragraphs). */
  sowParagraphs: ReadonlyArray<string>;
}

function blocksFor(
  sectionPath: string,
  startOrdinal: number,
  paragraphs: ReadonlyArray<string>,
): Block[] {
  return paragraphs.map((text, i) =>
    buildBlock({
      sectionPath,
      ordinal: startOrdinal + i,
      blockType: "PARAGRAPH",
      rawText: text,
    }),
  );
}

function listItemsFor(
  sectionPath: string,
  startOrdinal: number,
  items: ReadonlyArray<string>,
): Block[] {
  return items.map((text, i) =>
    buildBlock({
      sectionPath,
      ordinal: startOrdinal + i,
      blockType: "LIST_ITEM",
      rawText: text,
    }),
  );
}

function tableRowsFor(
  sectionPath: string,
  startOrdinal: number,
  rows: ReadonlyArray<string>,
): Block[] {
  return rows.map((text, i) =>
    buildBlock({
      sectionPath,
      ordinal: startOrdinal + i,
      blockType: "TABLE_ROW",
      rawText: text,
    }),
  );
}


export function buildTemplateDocument(opts: TemplateOptions): StructuredDocument {
  const sections: Section[] = [];
  let secOrd = 0;

  // ----- Section A: Solicitation form / cover -----
  sections.push(
    buildSection({
      heading: "Section A — Solicitation/Contract Form",
      headingLevel: 1,
      ucfLetter: "A",
      sectionType: "ADMIN",
      ordinal: secOrd++,
      blocks: blocksFor("A", 0, [
        `Solicitation Number: ${opts.solicitationId}`,
        `Issuing Agency: ${opts.agencyName}`,
        `This solicitation is issued for the procurement described in Section C.`,
      ]),
    }),
  );

  // ----- Section B: Supplies/Services and Prices (CLINs) -----
  const clinHeader = "CLIN | Description | Quantity | Unit";
  sections.push(
    buildSection({
      heading: "Section B — Supplies or Services and Prices/Costs",
      headingLevel: 1,
      ucfLetter: "B",
      sectionType: "PRICING",
      ordinal: secOrd++,
      blocks: [
        ...blocksFor("B", 0, [
          "The Contractor shall furnish the supplies or services in accordance with the following Contract Line Item Numbers (CLINs).",
        ]),
        ...tableRowsFor("B", 1, [
          clinHeader,
          ...opts.clins.map(
            (c) => `CLIN ${c.number} | ${c.description} | ${c.qty} | ${c.unit}`,
          ),
        ]),
      ],
    }),
  );

  // ----- Section C: Statement of Work -----
  sections.push(
    buildSection({
      heading: "Section C — Description / Specifications / Statement of Work",
      headingLevel: 1,
      ucfLetter: "C",
      sectionType: "SOW",
      ordinal: secOrd++,
      blocks: blocksFor("C", 0, opts.sowParagraphs),
    }),
  );

  // ----- Section D: Packaging and Marking -----
  sections.push(
    buildSection({
      heading: "Section D — Packaging and Marking",
      headingLevel: 1,
      ucfLetter: "D",
      sectionType: "OTHER",
      ordinal: secOrd++,
      blocks: blocksFor("D", 0, [
        "Standard commercial packaging is acceptable. All shipments shall be marked with the contract number and CLIN.",
      ]),
    }),
  );

  // ----- Section E: Inspection and Acceptance -----
  sections.push(
    buildSection({
      heading: "Section E — Inspection and Acceptance",
      headingLevel: 1,
      ucfLetter: "E",
      sectionType: "OTHER",
      ordinal: secOrd++,
      blocks: blocksFor("E", 0, [
        "Inspection and acceptance of supplies and services shall be performed at destination by the Government.",
      ]),
    }),
  );

  // ----- Section F: Deliveries / Period of Performance -----
  sections.push(
    buildSection({
      heading: "Section F — Deliveries or Performance",
      headingLevel: 1,
      ucfLetter: "F",
      sectionType: "DELIVERIES",
      ordinal: secOrd++,
      blocks: blocksFor("F", 0, [
        `The period of performance shall be twelve (12) months from the date of award.`,
        `Deliveries shall be made F.o.b. destination per FAR 52.247-34.`,
      ]),
    }),
  );

  // ----- Section G: Contract Administration Data -----
  sections.push(
    buildSection({
      heading: "Section G — Contract Administration Data",
      headingLevel: 1,
      ucfLetter: "G",
      sectionType: "ADMIN",
      ordinal: secOrd++,
      blocks: blocksFor("G", 0, [
        "Invoicing shall be submitted monthly through the Government invoicing system. The Contracting Officer's Representative (COR) will be designated post-award.",
      ]),
    }),
  );

  // ----- Section H: Special Contract Requirements -----
  sections.push(
    buildSection({
      heading: "Section H — Special Contract Requirements",
      headingLevel: 1,
      ucfLetter: "H",
      sectionType: "OTHER",
      ordinal: secOrd++,
      blocks: blocksFor("H", 0, [
        "Key personnel substitutions require prior written approval of the Contracting Officer.",
      ]),
    }),
  );

  // ----- Section I: Contract Clauses -----
  // Lead paragraph at ordinal 0; clause references follow.
  const sectionIBlocks: Block[] = [
    ...blocksFor("I", 0, [
      "The following clauses are incorporated by reference, with the same force and effect as if given in full text.",
    ]),
    ...opts.clauses.map((num, i) =>
      buildBlock({
        sectionPath: "I.clauses",
        ordinal: i,
        blockType: "CLAUSE_REFERENCE",
        rawText: num,
      }),
    ),
  ];
  sections.push(
    buildSection({
      heading: "Section I — Contract Clauses",
      headingLevel: 1,
      ucfLetter: "I",
      sectionType: "CLAUSES",
      ordinal: secOrd++,
      blocks: sectionIBlocks,
    }),
  );

  // ----- Section J: List of Attachments -----
  sections.push(
    buildSection({
      heading: "Section J — List of Attachments",
      headingLevel: 1,
      ucfLetter: "J",
      sectionType: "ATTACHMENT_LIST",
      ordinal: secOrd++,
      blocks: listItemsFor(
        "J",
        0,
        opts.attachments.map((a) => `Attachment ${a.id}: ${a.title}`),
      ),
    }),
  );

  // ----- Section K: Reps & Certs -----
  sections.push(
    buildSection({
      heading: "Section K — Representations, Certifications, and Other Statements of Offerors",
      headingLevel: 1,
      ucfLetter: "K",
      sectionType: "REPS_CERTS",
      ordinal: secOrd++,
      blocks: blocksFor("K", 0, [
        "Offerors shall complete the representations and certifications at FAR 52.212-3, available in SAM.",
      ]),
    }),
  );

  // ----- Section L: Instructions to Offerors -----
  sections.push(
    buildSection({
      heading: "Section L — Instructions, Conditions, and Notices to Offerors",
      headingLevel: 1,
      ucfLetter: "L",
      sectionType: "INSTRUCTIONS",
      ordinal: secOrd++,
      blocks: blocksFor("L", 0, [
        `Offers are due no later than 2:00 PM Eastern Time on ${opts.proposalDueDate}.`,
        `The proposal shall not exceed ${opts.pageLimit} pages, single-sided, 12-point Times New Roman font, with one-inch margins.`,
        `The proposal shall be submitted in two volumes: Volume I — Technical; Volume II — Price.`,
        `Questions shall be submitted in writing to the Contracting Officer not later than ten (10) days before the proposal due date.`,
      ]),
    }),
  );

  // ----- Section M: Evaluation Factors for Award -----
  sections.push(
    buildSection({
      heading: "Section M — Evaluation Factors for Award",
      headingLevel: 1,
      ucfLetter: "M",
      sectionType: "EVALUATION_CRITERIA",
      ordinal: secOrd++,
      blocks: [
        ...blocksFor("M", 0, [
          "Award will be made on the basis of best value to the Government, considering the following factors in descending order of importance:",
        ]),
        ...listItemsFor("M.factors", 0, opts.evaluationFactors.map((f, i) => `Factor ${i + 1}: ${f}`)),
        ...blocksFor("M", opts.evaluationFactors.length + 1, [
          "Technical factors, when combined, are significantly more important than Price.",
        ]),
      ],
    }),
  );

  // Use a stable extractedAt placeholder; real extraction sets a real timestamp.
  return {
    metadata: {
      sourceFileName: `${opts.id}-prior.synthetic`,
      sourceFileHash: opts.id,
      solicitationId: opts.solicitationId,
      amendmentNumber: null,
      extractedAt: new Date(0).toISOString(),
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 24 + Math.floor(opts.sowParagraphs.length / 2),
    },
    sections,
  };
}
