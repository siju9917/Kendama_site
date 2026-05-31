import { describe, it, expect } from "vitest";
import { classifyHeadingSectionType, sectionsFromRawLines } from "./assemble.js";

describe("classifyHeadingSectionType", () => {
  it("uses UCF letter when present", () => {
    expect(classifyHeadingSectionType("Anything", "C")).toBe("SOW");
    expect(classifyHeadingSectionType("Anything", "M")).toBe("EVALUATION_CRITERIA");
    expect(classifyHeadingSectionType("Anything", "L")).toBe("INSTRUCTIONS");
    expect(classifyHeadingSectionType("Anything", "I")).toBe("CLAUSES");
    expect(classifyHeadingSectionType("Anything", "B")).toBe("PRICING");
    expect(classifyHeadingSectionType("Anything", "J")).toBe("ATTACHMENT_LIST");
  });

  it("falls back to heading keywords when no UCF letter", () => {
    expect(classifyHeadingSectionType("Statement of Work", null)).toBe("SOW");
    expect(classifyHeadingSectionType("Evaluation Factors for Award", null)).toBe(
      "EVALUATION_CRITERIA",
    );
    expect(classifyHeadingSectionType("Instructions to Offerors", null)).toBe("INSTRUCTIONS");
    expect(classifyHeadingSectionType("Contract Clauses (Incorporated by Reference)", null)).toBe(
      "CLAUSES",
    );
    expect(classifyHeadingSectionType("Price Schedule", null)).toBe("PRICING");
  });

  it("returns OTHER when nothing matches", () => {
    expect(classifyHeadingSectionType("Background Information", null)).toBe("OTHER");
  });

  // Precedence guard (bug-hunt pass 18, 2026-05-30): the UCF letter is the
  // STRONGEST signal and must win even when the heading text contains a
  // keyword for a DIFFERENT type. The UCF letter is structural (the
  // solicitation's own section labelling); a stray keyword in the title must
  // not override it.
  it("UCF letter wins over a conflicting heading keyword", () => {
    // Section C is the SOW; "source selection" is an EVALUATION keyword.
    expect(classifyHeadingSectionType("Source Selection Notes", "C")).toBe("SOW");
    // Section M is EVALUATION; "statement of work" is a SOW keyword.
    expect(classifyHeadingSectionType("Statement of Work References", "M")).toBe(
      "EVALUATION_CRITERIA",
    );
  });

  it("an out-of-range UCF letter falls through to keywords / OTHER", () => {
    // 'Z' is not a UCF letter, so the keyword path decides.
    expect(classifyHeadingSectionType("Price Schedule", "Z")).toBe("PRICING");
    expect(classifyHeadingSectionType("Nothing relevant", "Z")).toBe("OTHER");
  });
});

describe("sectionsFromRawLines", () => {
  it("assembles a minimal solicitation skeleton", () => {
    const lines = [
      { text: "SECTION A — SOLICITATION/CONTRACT FORM" },
      { text: "This solicitation is issued pursuant to FAR Part 12." },
      { text: "SECTION C — STATEMENT OF WORK" },
      { text: "The Contractor shall provide help-desk services for 5,000 users." },
      { text: "Tier 2 and Tier 3 support are required." },
      { text: "SECTION L — INSTRUCTIONS TO OFFERORS" },
      { text: "The proposal shall not exceed 30 pages." },
      { text: "Offers are due 2026-08-15." },
      { text: "SECTION M — EVALUATION FACTORS FOR AWARD" },
      { text: "Technical approach is the most important factor." },
    ];
    const secs = sectionsFromRawLines(lines);
    const letters = secs.map((s) => s.ucfLetter);
    expect(letters).toEqual(["A", "C", "L", "M"]);
    expect(secs[1].sectionType).toBe("SOW");
    expect(secs[1].blocks.length).toBe(2);
    expect(secs[2].sectionType).toBe("INSTRUCTIONS");
    expect(secs[3].sectionType).toBe("EVALUATION_CRITERIA");
  });

  it("collects pre-heading lines into a Preamble section", () => {
    const lines = [
      { text: "Cover Sheet — Solicitation Notice" },
      { text: "Agency: GSA" },
      { text: "SECTION A — SOLICITATION/CONTRACT FORM" },
      { text: "Body of Section A." },
    ];
    const secs = sectionsFromRawLines(lines);
    expect(secs[0].heading).toBe("Preamble");
    expect(secs[0].ucfLetter).toBeNull();
    expect(secs[1].ucfLetter).toBe("A");
  });

  it("handles numbered subheadings without UCF letters", () => {
    const lines = [
      { text: "1. Introduction" },
      { text: "This is the introduction body." },
      { text: "2. Statement of Work" },
      { text: "The Contractor shall provide the following services:" },
    ];
    const secs = sectionsFromRawLines(lines);
    expect(secs.length).toBe(2);
    expect(secs[1].heading).toContain("Statement of Work");
    expect(secs[1].sectionType).toBe("SOW");
  });
});
