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

  // Precedence guard (bug-hunt pass 16, 2026-05-30): the SECTION_LM rule is
  // intentionally checked BEFORE letter-dot so an "L.1"/"M.2" item is an
  // SECTION_LM_ITEM, not a letter-dot "L"/"M". Pin it so a future reorder
  // can't silently regress section L/M sub-item handling.
  it("treats L.1 / M.2 as section items, not letter-dot headings", () => {
    expect(classifyHeading({ text: "L.1 Proposal Submission" }).kind.kind).toBe("SECTION_LM_ITEM");
    expect(classifyHeading({ text: "M.2: Technical Approach" }).kind.kind).toBe("SECTION_LM_ITEM");
    // A bare "L." (letter-dot, no item number) stays LETTER_DOT.
    expect(classifyHeading({ text: "L. Instructions" }).kind.kind).toBe("LETTER_DOT");
  });

  it("requires a valid UCF letter A–M (SECTION N is not a UCF header)", () => {
    expect(classifyHeading({ text: "SECTION N — Beyond M" }).kind.kind).toBe("NONE");
    // And must not fire on a word that merely starts with 'SECTION'.
    expect(classifyHeading({ text: "SECTIONAL meeting notes" }).kind.kind).toBe("NONE");
  });

  // PROGRESS.md coverage obs #4 — FIXED: A–K letter-dot-number subsections now
  // detected as SECTION_LM_ITEM (the SECTION_LM_RE was extended from [LM] to [A-M]).
  it("recognizes A–K letter-dot-number subsections (obs #4 fix)", () => {
    const c = classifyHeading({ text: "C.3 Performance Work Statement" });
    expect(c.kind.kind).toBe("SECTION_LM_ITEM");
    if (c.kind.kind === "SECTION_LM_ITEM") {
      expect(c.kind.itemId).toBe("C.3");
    }
    // Multiple A-K sections and deep numbering.
    expect(classifyHeading({ text: "B.1 Supplies or Services" }).kind.kind).toBe("SECTION_LM_ITEM");
    expect(classifyHeading({ text: "H.2.1 Special Conditions" }).kind.kind).toBe("SECTION_LM_ITEM");
    expect(classifyHeading({ text: "I.4: Contract Clauses" }).kind.kind).toBe("SECTION_LM_ITEM");
    // L and M still work (no regression).
    expect(classifyHeading({ text: "L.3 Submission" }).kind.kind).toBe("SECTION_LM_ITEM");
    expect(classifyHeading({ text: "M.2.1 Technical Approach" }).kind.kind).toBe("SECTION_LM_ITEM");
    // A bare "C." (letter-dot, no item number) stays LETTER_DOT — not a sub-item.
    expect(classifyHeading({ text: "C. Statement of Work" }).kind.kind).toBe("LETTER_DOT");
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
