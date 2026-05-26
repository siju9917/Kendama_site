import { describe, it, expect } from "vitest";
import { buildBlock, buildDocument, buildSection, emptyMetadata } from "./build.js";
import type { Block, Section } from "./types.js";

function block(ordinal: number, text: string): Block {
  return buildBlock({
    sectionPath: "C.1",
    ordinal,
    blockType: "PARAGRAPH",
    rawText: text,
  });
}

describe("buildBlock", () => {
  it("normalizes text and tokenizes", () => {
    const b = block(0, "  Hello   world.  ");
    expect(b.text).toBe("Hello world.");
    expect(b.tokens).toEqual(["Hello", "world", "."]);
  });

  it("produces a stable ID for identical input", () => {
    expect(block(0, "x").id).toBe(block(0, "x").id);
  });

  it("produces different IDs for different ordinals or text", () => {
    expect(block(0, "x").id).not.toBe(block(1, "x").id);
    expect(block(0, "x").id).not.toBe(block(0, "y").id);
  });

  it("clamps confidence into [0,1]", () => {
    expect(
      buildBlock({
        sectionPath: "X",
        ordinal: 0,
        blockType: "PARAGRAPH",
        rawText: "x",
        extractionConfidence: 1.5,
      }).extractionConfidence,
    ).toBe(1);
    expect(
      buildBlock({
        sectionPath: "X",
        ordinal: 0,
        blockType: "PARAGRAPH",
        rawText: "x",
        extractionConfidence: -2,
      }).extractionConfidence,
    ).toBe(0);
  });
});

describe("buildSection", () => {
  it("is order-sensitive and content-addressed", () => {
    const blocks: Section["blocks"] = [block(0, "a"), block(1, "b")];
    const s1 = buildSection({
      heading: "Section C - SOW",
      headingLevel: 1,
      ucfLetter: "C",
      sectionType: "SOW",
      blocks,
      ordinal: 0,
    });
    const s2 = buildSection({
      heading: "Section C - SOW",
      headingLevel: 1,
      ucfLetter: "C",
      sectionType: "SOW",
      blocks,
      ordinal: 0,
    });
    expect(s1.id).toBe(s2.id);

    const reordered = buildSection({
      heading: "Section C - SOW",
      headingLevel: 1,
      ucfLetter: "C",
      sectionType: "SOW",
      blocks: [block(1, "b"), block(0, "a")],
      ordinal: 0,
    });
    expect(reordered.id).not.toBe(s1.id);
  });
});

describe("emptyMetadata + buildDocument", () => {
  it("builds a document with a stable file hash for same bytes", () => {
    const bytes = new ArrayBuffer(128);
    const meta = emptyMetadata("file.pdf", bytes);
    expect(meta.sourceFileHash).toMatch(/^[0-9a-f]{8}$/);
    const doc = buildDocument({ metadata: meta, sections: [] });
    expect(doc.sections.length).toBe(0);
    expect(doc.metadata.sourceFileName).toBe("file.pdf");
  });
});
