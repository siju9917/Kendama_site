/**
 * Move-detection capability test (5.7.5 continuous bug-hunt). Reviewed the
 * cross-section move detector (`core/diff/align/moves.ts`) but it had no
 * focused test: a block that relocates between sections (identical text,
 * different home) must be ONE change of type MOVE — not an INSERT + a
 * DELETE (which would double-count and mislead the reviewer). Also asserts
 * a genuinely-removed block stays a DELETE (no spurious move).
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type { Section, StructuredDocument } from "../../src/core/model/types.js";

const engine = new DiffEngine(new LocalClauseClient());

const MOVABLE =
  "The contractor shall submit a detailed transition plan within thirty days of award, addressing staffing, knowledge transfer, and risk mitigation.";

function section(heading: string, ucf: string, blocks: string[], ordinal: number): Section {
  return buildSection({
    heading,
    headingLevel: 1,
    ucfLetter: ucf,
    sectionType: "OTHER",
    ordinal,
    blocks: blocks.map((t, i) => buildBlock({ sectionPath: ucf, ordinal: i, blockType: "PARAGRAPH", rawText: t })),
  });
}

function doc(name: string, sections: Section[]): StructuredDocument {
  return {
    metadata: {
      sourceFileName: name, sourceFileHash: name, solicitationId: null,
      amendmentNumber: null, extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1, extractionWarnings: [], pageCount: 1,
    },
    sections,
  };
}

describe("Cross-section move detection", () => {
  it("a block relocated to another section is ONE MOVE, not INSERT+DELETE", () => {
    // Prior: the movable block lives in Section C. Current: it lives in
    // Section H instead (identical text). Everything else is unchanged.
    const prior = enrichStructuredDocument(
      doc("prior", [
        section("SECTION C — STATEMENT OF WORK", "C", ["The scope covers operations and maintenance.", MOVABLE], 0),
        section("SECTION H — SPECIAL REQUIREMENTS", "H", ["Special requirements apply as follows."], 1),
      ]),
    );
    const current = enrichStructuredDocument(
      doc("current", [
        section("SECTION C — STATEMENT OF WORK", "C", ["The scope covers operations and maintenance."], 0),
        section("SECTION H — SPECIAL REQUIREMENTS", "H", ["Special requirements apply as follows.", MOVABLE], 1),
      ]),
    );

    const r = engine.diff(current, prior);
    const moves = r.changes.filter((c) => c.changeType === "MOVE");
    expect(moves.length, "the relocated block is detected as a MOVE").toBe(1);
    // And NOT double-counted as a separate insert + delete.
    expect(r.changes.filter((c) => c.changeType === "INSERT").length).toBe(0);
    expect(r.changes.filter((c) => c.changeType === "DELETE").length).toBe(0);
    expect(r.changes.length).toBe(1);
  });

  it("a genuinely removed block stays a DELETE (no spurious move)", () => {
    const prior = enrichStructuredDocument(
      doc("prior", [section("SECTION C — STATEMENT OF WORK", "C", ["Para one.", MOVABLE], 0)]),
    );
    const current = enrichStructuredDocument(
      doc("current", [section("SECTION C — STATEMENT OF WORK", "C", ["Para one."], 0)]),
    );
    const r = engine.diff(current, prior);
    expect(r.changes.length).toBe(1);
    expect(r.changes[0].changeType).toBe("DELETE");
  });
});
