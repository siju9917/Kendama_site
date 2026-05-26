/**
 * Edit operations: deterministic transforms applied to a baseline document
 * to produce an amended document. Each edit emits its own ground-truth label.
 *
 * The generator chains a sequence of edits onto a baseline template and ends
 * up with: (prior, current, labels[]).
 */
import type { Block, Section, StructuredDocument } from "../../src/core/model/types.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type { ExpectedChange } from "./schema.js";

export interface ApplyResult {
  doc: StructuredDocument;
  labels: ExpectedChange[];
}

function rebuildSection(s: Section, blocks: Block[], ordinal: number = s.ordinal): Section {
  return buildSection({
    heading: s.heading,
    headingLevel: s.headingLevel,
    ucfLetter: s.ucfLetter,
    sectionType: s.sectionType,
    blocks,
    ordinal,
  });
}

function replaceSection(doc: StructuredDocument, ucfLetter: string, mut: (s: Section) => Section): StructuredDocument {
  return {
    metadata: doc.metadata,
    sections: doc.sections.map((s) => (s.ucfLetter === ucfLetter ? mut(s) : s)),
  };
}

// ============================================================
// Edits
// ============================================================

/** Change the Section L proposal due date. CRITICAL. */
export function changeProposalDueDate(doc: StructuredDocument, newDate: string): ApplyResult {
  const oldL = doc.sections.find((s) => s.ucfLetter === "L");
  if (!oldL) throw new Error("Section L missing — cannot change due date");
  const oldFirst = oldL.blocks[0];
  const oldDate = oldFirst.text.match(/on\s+([0-9-]+)/)?.[1] ?? "";

  const newDoc = replaceSection(doc, "L", (s) => {
    const newBlocks = [...s.blocks];
    newBlocks[0] = buildBlock({
      sectionPath: "L",
      ordinal: 0,
      blockType: "PARAGRAPH",
      rawText: `Offers are due no later than 2:00 PM Eastern Time on ${newDate}.`,
    });
    return rebuildSection(s, newBlocks);
  });

  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "DATES_DEADLINES",
        severity: "CRITICAL",
        locationDescription: "Section L — Instructions to Offerors, proposal due date paragraph",
        summary: `Proposal due date changed from ${oldDate} to ${newDate}`,
        mustDetect: true,
        expectedTextFragments: [newDate],
      },
    ],
  };
}

/** Change the Section L page limit. CRITICAL. */
export function changePageLimit(doc: StructuredDocument, newLimit: number): ApplyResult {
  const oldL = doc.sections.find((s) => s.ucfLetter === "L");
  if (!oldL) throw new Error("Section L missing");
  const oldLine = oldL.blocks[1].text;
  const oldLimit = oldLine.match(/exceed\s+(\d+)\s+pages/)?.[1] ?? "?";

  const newDoc = replaceSection(doc, "L", (s) => {
    const newBlocks = [...s.blocks];
    newBlocks[1] = buildBlock({
      sectionPath: "L",
      ordinal: 1,
      blockType: "PARAGRAPH",
      rawText: `The proposal shall not exceed ${newLimit} pages, single-sided, 12-point Times New Roman font, with one-inch margins.`,
    });
    return rebuildSection(s, newBlocks);
  });

  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "SUBMISSION_INSTRUCTIONS",
        severity: "CRITICAL",
        locationDescription: "Section L — page limit",
        summary: `Page limit changed from ${oldLimit} to ${newLimit} pages`,
        mustDetect: true,
        expectedTextFragments: [`${newLimit} pages`],
      },
    ],
  };
}

/** Add a FAR/DFARS clause to Section I. CRITICAL. */
export function addClause(doc: StructuredDocument, clauseNumber: string): ApplyResult {
  const newDoc = replaceSection(doc, "I", (s) => {
    const clauseBlocks = s.blocks.filter((b) => b.blockType === "CLAUSE_REFERENCE");
    const otherBlocks = s.blocks.filter((b) => b.blockType !== "CLAUSE_REFERENCE");
    const inserted = buildBlock({
      sectionPath: "I.clauses",
      ordinal: clauseBlocks.length,
      blockType: "CLAUSE_REFERENCE",
      rawText: clauseNumber,
    });
    return rebuildSection(s, [...otherBlocks, ...clauseBlocks, inserted]);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "INSERT",
        category: "CLAUSES",
        severity: "CRITICAL",
        locationDescription: "Section I — Contract Clauses",
        summary: `Clause ${clauseNumber} added`,
        mustDetect: true,
        expectedTextFragments: [clauseNumber],
      },
    ],
  };
}

/** Remove a FAR/DFARS clause from Section I. CRITICAL. */
export function removeClause(doc: StructuredDocument, clauseNumber: string): ApplyResult {
  const newDoc = replaceSection(doc, "I", (s) => {
    const filtered = s.blocks.filter(
      (b) => !(b.blockType === "CLAUSE_REFERENCE" && b.text === clauseNumber),
    );
    return rebuildSection(s, filtered);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "DELETE",
        category: "CLAUSES",
        severity: "CRITICAL",
        locationDescription: "Section I — Contract Clauses",
        summary: `Clause ${clauseNumber} removed`,
        mustDetect: true,
        expectedTextFragments: [clauseNumber],
      },
    ],
  };
}

/** Change a Section M evaluation factor (reorder, replace, or add). CRITICAL. */
export function replaceEvaluationFactor(
  doc: StructuredDocument,
  index: number,
  newFactor: string,
): ApplyResult {
  const oldM = doc.sections.find((s) => s.ucfLetter === "M");
  if (!oldM) throw new Error("Section M missing");
  const factorBlocks = oldM.blocks.filter((b) => b.blockType === "LIST_ITEM");
  const oldFactor = factorBlocks[index]?.text ?? "?";

  const newDoc = replaceSection(doc, "M", (s) => {
    const newBlocks = s.blocks.map((b) => {
      if (b.blockType === "LIST_ITEM") {
        // Find the right index
        let listIdx = 0;
        for (const candidate of s.blocks) {
          if (candidate === b) break;
          if (candidate.blockType === "LIST_ITEM") listIdx++;
        }
        if (listIdx === index) {
          return buildBlock({
            sectionPath: "M.factors",
            ordinal: index,
            blockType: "LIST_ITEM",
            rawText: `Factor ${index + 1}: ${newFactor}`,
          });
        }
      }
      return b;
    });
    return rebuildSection(s, newBlocks);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "EVALUATION_CRITERIA",
        severity: "CRITICAL",
        locationDescription: `Section M — Factor ${index + 1}`,
        summary: `Evaluation factor changed: was "${oldFactor}", now "Factor ${index + 1}: ${newFactor}"`,
        mustDetect: true,
        expectedTextFragments: [newFactor],
      },
    ],
  };
}

/** Add an attachment to Section J. CRITICAL. */
export function addAttachment(doc: StructuredDocument, attId: string, title: string): ApplyResult {
  const newDoc = replaceSection(doc, "J", (s) => {
    const newBlock = buildBlock({
      sectionPath: "J",
      ordinal: s.blocks.length,
      blockType: "LIST_ITEM",
      rawText: `Attachment ${attId}: ${title}`,
    });
    return rebuildSection(s, [...s.blocks, newBlock]);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "INSERT",
        category: "ATTACHMENTS",
        severity: "CRITICAL",
        locationDescription: "Section J — List of Attachments",
        summary: `Attachment ${attId} (${title}) added`,
        mustDetect: true,
        expectedTextFragments: [attId, title],
      },
    ],
  };
}

/** Remove an attachment from Section J. CRITICAL. */
export function removeAttachment(doc: StructuredDocument, attId: string): ApplyResult {
  // Exact prefix match — "Attachment 1: …" must not match "Attachment 10: …".
  const prefix = `Attachment ${attId}:`;
  const isExactMatch = (b: Block): boolean => b.text.startsWith(prefix);
  const oldJ = doc.sections.find((s) => s.ucfLetter === "J");
  const removedBlock = oldJ?.blocks.find(isExactMatch);
  const newDoc = replaceSection(doc, "J", (s) => {
    return rebuildSection(s, s.blocks.filter((b) => !isExactMatch(b)));
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "DELETE",
        category: "ATTACHMENTS",
        severity: "CRITICAL",
        locationDescription: "Section J — List of Attachments",
        summary: `Attachment ${attId} removed (was: ${removedBlock?.text ?? ""})`,
        mustDetect: true,
        expectedTextFragments: [attId],
      },
    ],
  };
}

/** Add a CLIN. CRITICAL. */
export function addClin(
  doc: StructuredDocument,
  clin: { number: string; description: string; qty: number; unit: string },
): ApplyResult {
  const newDoc = replaceSection(doc, "B", (s) => {
    const newBlock = buildBlock({
      sectionPath: "B",
      ordinal: s.blocks.length,
      blockType: "TABLE_ROW",
      rawText: `CLIN ${clin.number} | ${clin.description} | ${clin.qty} | ${clin.unit}`,
    });
    return rebuildSection(s, [...s.blocks, newBlock]);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "INSERT",
        category: "PRICING_CLINS",
        severity: "CRITICAL",
        locationDescription: "Section B — CLIN structure",
        summary: `CLIN ${clin.number} added (${clin.description})`,
        mustDetect: true,
        expectedTextFragments: [`CLIN ${clin.number}`, clin.description],
      },
    ],
  };
}

/** Change a CLIN quantity. CRITICAL. */
export function changeClinQty(
  doc: StructuredDocument,
  clinNumber: string,
  newQty: number,
): ApplyResult {
  const newDoc = replaceSection(doc, "B", (s) => {
    const newBlocks = s.blocks.map((b) => {
      if (b.blockType === "TABLE_ROW" && b.text.includes(`CLIN ${clinNumber} `)) {
        const parts = b.text.split(" | ");
        if (parts.length === 4) {
          parts[2] = String(newQty);
          return buildBlock({
            sectionPath: "B",
            ordinal: b.ordinal,
            blockType: "TABLE_ROW",
            rawText: parts.join(" | "),
          });
        }
      }
      return b;
    });
    return rebuildSection(s, newBlocks);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "PRICING_CLINS",
        severity: "CRITICAL",
        locationDescription: `Section B — CLIN ${clinNumber}`,
        summary: `CLIN ${clinNumber} quantity changed to ${newQty}`,
        mustDetect: true,
        expectedTextFragments: [`CLIN ${clinNumber}`],
      },
    ],
  };
}

/** Edit SOW prose. NORMAL severity (scope change). */
export function modifySowParagraph(
  doc: StructuredDocument,
  index: number,
  newText: string,
): ApplyResult {
  const oldC = doc.sections.find((s) => s.ucfLetter === "C");
  if (!oldC) throw new Error("Section C missing");
  const oldText = oldC.blocks[index]?.text ?? "";
  const newDoc = replaceSection(doc, "C", (s) => {
    const newBlocks = s.blocks.map((b, i) =>
      i === index
        ? buildBlock({
            sectionPath: "C",
            ordinal: i,
            blockType: "PARAGRAPH",
            rawText: newText,
          })
        : b,
    );
    return rebuildSection(s, newBlocks);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "SCOPE_SOW",
        severity: "NORMAL",
        locationDescription: `Section C — paragraph ${index + 1}`,
        summary: `SOW paragraph revised. Was: "${oldText.slice(0, 80)}…"`,
        mustDetect: true,
      },
    ],
  };
}

/** Insert a new SOW paragraph. NORMAL. */
export function insertSowParagraph(doc: StructuredDocument, text: string): ApplyResult {
  const newDoc = replaceSection(doc, "C", (s) => {
    const newBlock = buildBlock({
      sectionPath: "C",
      ordinal: s.blocks.length,
      blockType: "PARAGRAPH",
      rawText: text,
    });
    return rebuildSection(s, [...s.blocks, newBlock]);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "INSERT",
        category: "SCOPE_SOW",
        severity: "NORMAL",
        locationDescription: "Section C — new paragraph",
        summary: `SOW paragraph added: "${text.slice(0, 80)}…"`,
        mustDetect: true,
      },
    ],
  };
}

/** Change the period of performance text in Section F — date anchor present. CRITICAL. */
export function changePeriodOfPerformance(doc: StructuredDocument, newMonths: number): ApplyResult {
  const newDoc = replaceSection(doc, "F", (s) => {
    const newBlocks = [...s.blocks];
    newBlocks[0] = buildBlock({
      sectionPath: "F",
      ordinal: 0,
      blockType: "PARAGRAPH",
      rawText: `The period of performance shall be ${newMonths} months from the date of award.`,
    });
    return rebuildSection(s, newBlocks);
  });
  return {
    doc: newDoc,
    labels: [
      {
        changeType: "MODIFY",
        category: "DATES_DEADLINES",
        severity: "CRITICAL",
        locationDescription: "Section F — Period of Performance",
        summary: `Period of performance changed to ${newMonths} months`,
        mustDetect: true,
        expectedTextFragments: [`${newMonths} months`],
      },
    ],
  };
}
