/**
 * Engine clause-info enrichment (regression for a documented fix). When a
 * changed block references BOTH an unknown clause and a known one, the
 * surfaced clauseInfo must be the KNOWN clause — not the first anchor
 * regardless of whether it's in the dataset (the prior bug). Locks the
 * user-facing clause-detail behavior at the engine level.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

const engine = new DiffEngine(new LocalClauseClient());

function clauseDoc(name: string, text: string): StructuredDocument {
  return {
    metadata: {
      sourceFileName: name, sourceFileHash: name, solicitationId: null,
      amendmentNumber: null, extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1, extractionWarnings: [], pageCount: 1,
    },
    sections: [
      buildSection({
        heading: "SECTION I — CONTRACT CLAUSES",
        headingLevel: 1, ucfLetter: "I", sectionType: "CLAUSES", ordinal: 0,
        blocks: [buildBlock({ sectionPath: "I", ordinal: 0, blockType: "PARAGRAPH", rawText: text })],
      }),
    ],
  };
}

describe("Engine clause-info enrichment", () => {
  it("surfaces the KNOWN clause when a block cites an unknown one first", () => {
    // 252.999-9999 is not in the bundled dataset; 52.212-1 is. The unknown
    // one appears first in reading order.
    const prior = enrichStructuredDocument(
      clauseDoc("prior", "Incorporates 252.999-9999 and FAR 52.212-1 by reference."),
    );
    const current = enrichStructuredDocument(
      clauseDoc("current", "Incorporates 252.999-9999 and FAR 52.212-1 by reference, as amended herein."),
    );
    const r = engine.diff(current, prior);
    const change = r.changes.find((c) => c.clauseInfo);
    expect(change, "a change with clauseInfo should exist").toBeTruthy();
    // The enriched clause is the KNOWN one, not the unknown-first anchor.
    expect(change!.clauseInfo!.clauseNumber).toBe("52.212-1");
    expect(change!.clauseInfo!.title).toBeTruthy();
  });
});
