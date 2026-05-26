import { describe, it, expect } from "vitest";
import {
  classifyHeading,
  classifyLines,
  computeModalFontSize,
  type RawLine,
} from "./headings.js";

describe("classifyHeading", () => {
  it("recognizes UCF section headers", () => {
    const c = classifyHeading({ text: "SECTION C — STATEMENT OF WORK" });
    expect(c.kind.kind).toBe("UCF");
    expect(c.kind.kind === "UCF" && c.kind.letter).toBe("C");
    expect(c.confidence).toBeGreaterThan(0.9);
  });

  it("recognizes letter-dot prefixes", () => {
    const c = classifyHeading({ text: "B. Supplies or Services and Prices" });
    expect(c.kind.kind).toBe("LETTER_DOT");
    expect(c.kind.kind === "LETTER_DOT" && c.kind.letter).toBe("B");
  });

  it("recognizes numbered headings with depth", () => {
    const c = classifyHeading({ text: "3.2.1 Personnel Requirements" });
    expect(c.kind.kind).toBe("NUMBERED");
    if (c.kind.kind === "NUMBERED") {
      expect(c.kind.numbering).toBe("3.2.1");
      expect(c.kind.level).toBe(4);
    }
  });

  it("recognizes Section L/M items", () => {
    const c = classifyHeading({ text: "L.3 Submission Requirements" });
    expect(c.kind.kind).toBe("SECTION_LM_ITEM");
    if (c.kind.kind === "SECTION_LM_ITEM") {
      expect(c.kind.itemId).toBe("L.3");
    }
  });

  it("uses font heuristic when text doesn't match", () => {
    const c = classifyHeading({ text: "Key Personnel", fontSize: 16, bold: true }, 11);
    expect(c.kind.kind).toBe("FONT_HEURISTIC");
    expect(c.confidence).toBeGreaterThan(0.6);
  });

  it("does not flag plain prose as a heading", () => {
    const c = classifyHeading({ text: "The Contractor shall provide all necessary services." });
    expect(c.kind.kind).toBe("NONE");
  });

  it("ignores empty lines", () => {
    const c = classifyHeading({ text: "" });
    expect(c.confidence).toBe(0);
  });
});

describe("computeModalFontSize", () => {
  it("returns the most common size", () => {
    const lines: RawLine[] = [
      { text: "a", fontSize: 11 },
      { text: "b", fontSize: 11 },
      { text: "c", fontSize: 14 },
      { text: "d", fontSize: 11 },
      { text: "e", fontSize: 16 },
    ];
    expect(computeModalFontSize(lines)).toBe(11);
  });
  it("returns undefined when no font info is present", () => {
    expect(computeModalFontSize([{ text: "x" }])).toBeUndefined();
  });
});

describe("classifyLines", () => {
  it("classifies a mix correctly", () => {
    const lines: RawLine[] = [
      { text: "SECTION L — INSTRUCTIONS TO OFFERORS" },
      { text: "L.1 General" },
      { text: "Proposals are due on August 15, 2026." },
    ];
    const c = classifyLines(lines);
    expect(c[0].kind.kind).toBe("UCF");
    expect(c[1].kind.kind).toBe("SECTION_LM_ITEM");
    expect(c[2].kind.kind).toBe("NONE");
  });
});
