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

  // Regression (bug-hunt, 2026-05-30): the value-bearing-punctuation guard
  // only kept marks flanked by digits on BOTH sides, so a trailing "%" and a
  // leading sign were stripped — collapsing genuinely different values and
  // silently suppressing a real change (a false negative, the worst class for
  // this tool). These must NOT normalize equal.
  it("does not collapse a percentage with a bare number (trailing %)", () => {
    expect(aggressiveNormalize("50%")).not.toBe(aggressiveNormalize("50"));
    expect(reformat("50%", "50")).toBe(false);
  });

  it("does not collapse a signed number with its unsigned form (leading sign)", () => {
    expect(aggressiveNormalize("-5")).not.toBe(aggressiveNormalize("5"));
    expect(aggressiveNormalize("+5")).not.toBe(aggressiveNormalize("5"));
    expect(reformat("-5", "5")).toBe(false);
  });

  it("still treats a hyphen INSIDE a word as reformatting (not a numeric sign)", () => {
    // "section-5" vs "section 5": the hyphen is preceded by a letter, so it is
    // not a numeric sign and this remains reformatting-only.
    expect(aggressiveNormalize("section-5")).toBe(aggressiveNormalize("section 5"));
  });

  it("still treats a digit-flanked hyphen (range) as value-bearing", () => {
    expect(aggressiveNormalize("3-5")).not.toBe(aggressiveNormalize("35"));
  });

  it("unifies unicode dash variants so a PDF dash swap is not a spurious change", () => {
    // PDFs render hyphens inconsistently (ASCII '-', U+2011 non-breaking
    // hyphen, U+2013 en-dash). The SAME clause/range with different dash chars
    // must normalize equal — otherwise every such clause shows as a phantom
    // change. (A real value change still differs, asserted last.)
    const ascii = aggressiveNormalize("FAR 52.204-21");
    expect(aggressiveNormalize("FAR 52.204‑21")).toBe(ascii); // non-breaking hyphen
    expect(aggressiveNormalize("FAR 52.204–21")).toBe(ascii); // en-dash
    expect(aggressiveNormalize("FAR 52.204—21")).toBe(ascii); // em-dash
    // A genuine clause-number change must NOT be unified away.
    expect(aggressiveNormalize("FAR 52.204-21")).not.toBe(aggressiveNormalize("FAR 52.204-25"));
  });
});
