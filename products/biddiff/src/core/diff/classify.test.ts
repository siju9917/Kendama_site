/**
 * Direct unit tests for change classification. First-match-wins precedence
 * matters (a CLAUSE_REF anchor should win over a PRICING section, etc.);
 * these pin it. Guards the data-driven CLASSIFY_RULES refactor.
 */
import { describe, it, expect } from "vitest";
import { classifyChange } from "./classify.js";
import { buildSection } from "../model/build.js";
import type { Anchor, SectionType } from "../model/types.js";

function anchor(type: Anchor["type"]): Anchor {
  return { type, raw: "x", normalized: "x", charStart: 0, charEnd: 1 };
}
function section(sectionType: SectionType) {
  return buildSection({ heading: "H", headingLevel: 1, ucfLetter: null, sectionType, blocks: [], ordinal: 0 });
}

describe("classifyChange", () => {
  it("maps each section type to its category", () => {
    expect(classifyChange({ section: section("CLAUSES"), anchors: [] })).toBe("CLAUSES");
    expect(classifyChange({ section: section("EVALUATION_CRITERIA"), anchors: [] })).toBe("EVALUATION_CRITERIA");
    expect(classifyChange({ section: section("DELIVERIES"), anchors: [] })).toBe("DATES_DEADLINES");
    expect(classifyChange({ section: section("INSTRUCTIONS"), anchors: [] })).toBe("SUBMISSION_INSTRUCTIONS");
    expect(classifyChange({ section: section("PRICING"), anchors: [] })).toBe("PRICING_CLINS");
    expect(classifyChange({ section: section("ATTACHMENT_LIST"), anchors: [] })).toBe("ATTACHMENTS");
    expect(classifyChange({ section: section("SOW"), anchors: [] })).toBe("SCOPE_SOW");
  });

  it("anchors classify even with no/OTHER section", () => {
    expect(classifyChange({ section: null, anchors: [anchor("DATE")] })).toBe("DATES_DEADLINES");
    expect(classifyChange({ section: null, anchors: [anchor("CLAUSE_REF")] })).toBe("CLAUSES");
    expect(classifyChange({ section: null, anchors: [anchor("PAGE_LIMIT")] })).toBe("SUBMISSION_INSTRUCTIONS");
    expect(classifyChange({ section: null, anchors: [anchor("MONEY")] })).toBe("PRICING_CLINS");
    expect(classifyChange({ section: null, anchors: [anchor("CLIN")] })).toBe("PRICING_CLINS");
  });

  it("FIRST-match precedence: a clause anchor wins over a pricing section", () => {
    // Rule 1 (CLAUSES) precedes rule 5 (PRICING_CLINS).
    expect(
      classifyChange({ section: section("PRICING"), anchors: [anchor("CLAUSE_REF"), anchor("MONEY")] }),
    ).toBe("CLAUSES");
  });

  it("falls back to OTHER", () => {
    expect(classifyChange({ section: section("OTHER"), anchors: [] })).toBe("OTHER");
    expect(classifyChange({ section: null, anchors: [] })).toBe("OTHER");
  });
});
