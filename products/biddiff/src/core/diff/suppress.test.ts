/**
 * Tests for false-positive suppression (Phase 3.8).
 *
 * The load-bearing invariant: reformatting suppression must NEVER hide a
 * change that alters a numeric value. These tests pin both directions —
 * genuine reformatting is suppressed, value changes are not.
 */
import { describe, expect, it } from "vitest";
import type { Block } from "../model/types.js";
import { isReformattingOnly, aggressiveNormalize } from "./suppress.js";
import { tokenize } from "../../shared/text.js";

function block(text: string): Block {
  return {
    id: "test",
    blockType: "PARAGRAPH",
    text,
    tokens: tokenize(text),
    anchors: [],
    ordinal: 0,
    extractionConfidence: 1,
  };
}

const reformat = (a: string, b: string) => isReformattingOnly(block(a), block(b));

describe("isReformattingOnly — genuine reformatting IS suppressed", () => {
  it("whitespace-only differences", () => {
    expect(reformat("The  proposal   is due.", "The proposal is due.")).toBe(true);
  });
  it("case-only differences", () => {
    expect(reformat("Section L Instructions", "section l instructions")).toBe(true);
  });
  it("trailing/stray punctuation", () => {
    expect(reformat("Page limit 10", "Page limit 10.")).toBe(true);
  });
  it("en-US thousands separators are value-preserving grouping", () => {
    expect(reformat("Quantity 1,500 units", "Quantity 1500 units")).toBe(true);
    expect(reformat("Total 1,500,000", "Total 1500000")).toBe(true);
  });
  it("identical text", () => {
    expect(reformat("FAR 52.204-21 applies", "FAR 52.204-21 applies")).toBe(true);
  });
});

describe("isReformattingOnly — numeric value changes are NOT suppressed", () => {
  it("decimal-point shift in money (the headline regression)", () => {
    // $1.5M vs $15M — a 10x contract value change must surface.
    expect(reformat("Total estimated value: $1.5M", "Total estimated value: $15M")).toBe(false);
  });
  it("decimal vs whole unit price", () => {
    expect(reformat("Unit price 3.50", "Unit price 350")).toBe(false);
  });
  it("decimal duration change", () => {
    expect(reformat("Complete in 2.5 days", "Complete in 25 days")).toBe(false);
  });
  it("a comma that is NOT a thousands separator is preserved", () => {
    // "1,5" (only two digits after comma) is not en-US grouping; treat the
    // mark as potentially value-bearing rather than silently equal to "15".
    expect(reformat("ratio 1,5", "ratio 15")).toBe(false);
  });
  it("page-limit number change", () => {
    expect(reformat("Page limit 10", "Page limit 15")).toBe(false);
  });
});

describe("aggressiveNormalize — unit behavior", () => {
  it("preserves a digit-flanked decimal point", () => {
    expect(aggressiveNormalize("1.5")).toBe("1.5");
    expect(aggressiveNormalize("15")).toBe("15");
  });
  it("drops non-numeric punctuation and whitespace", () => {
    expect(aggressiveNormalize("Hello, world!")).toBe("helloworld");
  });
  it("drops en-US thousands commas", () => {
    expect(aggressiveNormalize("1,500")).toBe("1500");
  });
});
