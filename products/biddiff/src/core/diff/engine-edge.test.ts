/**
 * Edge cases the diff engine must handle without crashing or producing nonsense:
 *   - Empty current, non-empty prior (whole-doc DELETE)
 *   - Empty prior, non-empty current (whole-doc INSERT)
 *   - Both empty
 *   - Doc with only a Preamble section (no UCF headers)
 *   - Doc with a section containing zero blocks
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "./engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { buildBlock, buildSection } from "../model/build.js";
import type { Section, StructuredDocument } from "../model/types.js";

function meta(name: string): StructuredDocument["metadata"] {
  return {
    sourceFileName: name,
    sourceFileHash: name,
    solicitationId: null,
    amendmentNumber: null,
    extractedAt: "2026-05-26T00:00:00.000Z",
    overallExtractionConfidence: 1,
    extractionWarnings: [],
    pageCount: 1,
  };
}

const emptyDoc: StructuredDocument = { metadata: meta("empty"), sections: [] };

function singleSection(text: string): StructuredDocument {
  const block = buildBlock({
    sectionPath: "X",
    ordinal: 0,
    blockType: "PARAGRAPH",
    rawText: text,
  });
  const section: Section = buildSection({
    heading: "Section X",
    headingLevel: 1,
    ucfLetter: null,
    sectionType: "OTHER",
    blocks: [block],
    ordinal: 0,
  });
  return { metadata: meta("single"), sections: [section] };
}

describe("DiffEngine edge cases", () => {
  const engine = new DiffEngine(new LocalClauseClient());

  it("two empty docs produce zero changes", () => {
    const r = engine.diff(emptyDoc, emptyDoc);
    expect(r.changes.length).toBe(0);
    expect(r.criticalCount).toBe(0);
  });

  it("empty prior + non-empty current is INSERTs only", () => {
    const r = engine.diff(singleSection("Hello world."), emptyDoc);
    // A new section appears: should yield an INSERT for the block.
    expect(r.changes.every((c) => c.changeType === "INSERT")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("empty current + non-empty prior is DELETEs only", () => {
    const r = engine.diff(emptyDoc, singleSection("Hello world."));
    expect(r.changes.every((c) => c.changeType === "DELETE")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("a section with zero blocks does not crash the engine", () => {
    const emptySection = buildSection({
      heading: "Section Y",
      headingLevel: 1,
      ucfLetter: null,
      sectionType: "OTHER",
      blocks: [],
      ordinal: 0,
    });
    const doc: StructuredDocument = { metadata: meta("z"), sections: [emptySection] };
    const r = engine.diff(doc, doc);
    expect(r.changes.length).toBe(0);
  });
});
