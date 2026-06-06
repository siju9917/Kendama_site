/**
 * Tests for false-positive suppression (Phase 3.8).
 *
 * Two suppression paths are tested:
 *   1. isReformattingOnly — whitespace/punctuation/case normalization.
 *   2. isListOrdinalOnlyChange — ordinal-prefix shift from list renumbering.
 *
 * Load-bearing invariant for both: NEVER hide a change that alters the
 * actual content. Both are tested for the "suppress" and "don't suppress" directions.
 */
import { describe, expect, it } from "vitest";
import type { Block } from "../model/types.js";
import { isReformattingOnly, isListOrdinalOnlyChange, aggressiveNormalize } from "./suppress.js";
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

// ---------------------------------------------------------------------------
// isListOrdinalOnlyChange — list-renumbering noise suppression
// ---------------------------------------------------------------------------
//
// Scenario: a Section-L numbered list has one item inserted at position 2.
// Every item after it shifts ordinal by 1, producing spurious MODIFY changes
// for items whose content is completely unchanged.  The suppressor should
// fire for those, and NEVER fire when the non-ordinal content actually changed.

const ordinalOnly = (a: string, b: string) =>
  isListOrdinalOnlyChange(block(a), block(b));

describe("isListOrdinalOnlyChange — should suppress (ordinal shifted, content same)", () => {
  it("plain Arabic 'N. text' form (the most common case)", () => {
    expect(ordinalOnly("2. Use 12-point font.", "3. Use 12-point font.")).toBe(true);
    expect(ordinalOnly("3. Submit electronically.", "4. Submit electronically.")).toBe(true);
  });

  it("UCF sub-item 'L.N text' form (Section-L style, the headline PROGRESS case)", () => {
    expect(ordinalOnly("L.2 Use 12-point font.", "L.3 Use 12-point font.")).toBe(true);
    expect(ordinalOnly("L.12 Submit via SAM.", "L.13 Submit via SAM.")).toBe(true);
  });

  it("UCF sub-item with trailing dot 'L.N. text' form", () => {
    expect(ordinalOnly("L.2. Use 12-point font.", "L.3. Use 12-point font.")).toBe(true);
  });

  it("parenthesised ordinal '(N) text' form", () => {
    expect(ordinalOnly("(1) First requirement.", "(2) First requirement.")).toBe(true);
  });

  it("parenthesised alphabetic '(a) text' form", () => {
    expect(ordinalOnly("(a) Submit form X.", "(b) Submit form X.")).toBe(true);
  });

  it("Arabic with paren '1) text' form", () => {
    expect(ordinalOnly("1) First item.", "2) First item.")).toBe(true);
  });

  it("whitespace-only difference in content is still suppressed", () => {
    // content differs only in whitespace (aggressiveNormalize handles it)
    expect(ordinalOnly("2.  Use 12-point  font.", "3. Use 12-point font.")).toBe(true);
  });
});

describe("isListOrdinalOnlyChange — must NOT suppress (content changed)", () => {
  it("page-limit number changed alongside renumber", () => {
    // The ordinal shifted AND the page limit changed — must surface.
    expect(ordinalOnly("2. Page limit is 15 pages.", "3. Page limit is 20 pages.")).toBe(false);
  });

  it("money value changed alongside renumber", () => {
    expect(ordinalOnly("1. Contract value $1.5M.", "2. Contract value $15M.")).toBe(false);
  });

  it("content fully changed (same ordinal shift)", () => {
    expect(ordinalOnly("2. Submit form A.", "3. Submit form B.")).toBe(false);
  });

  it("no ordinal on either side — not our concern", () => {
    // Plain paragraph with no leading ordinal.
    expect(ordinalOnly("The contractor shall submit.", "The offeror shall submit.")).toBe(false);
  });

  it("no ordinal on PRIOR side", () => {
    expect(ordinalOnly("Use 12-point font.", "3. Use 12-point font.")).toBe(false);
  });

  it("no ordinal on CURRENT side", () => {
    expect(ordinalOnly("2. Use 12-point font.", "Use 12-point font.")).toBe(false);
  });

  it("same ordinals — this case would be EQUAL, not MODIFY", () => {
    // Same ordinal: not our concern; the aligner would produce EQUAL anyway.
    expect(ordinalOnly("2. Use 12-point font.", "2. Use 12-point font.")).toBe(false);
  });

  it("clause reference FAR XX.XXX-XXXX does NOT match as a list ordinal", () => {
    // "52.204-21 applies" starts with digits.period but is a clause ref,
    // not a list ordinal — the pattern requires a space after the ordinal so
    // "52.204-21" (no space before the content part) does not match.
    expect(ordinalOnly("52.204-21 applies.", "52.204-25 applies.")).toBe(false);
  });
});

describe("isListOrdinalOnlyChange — does NOT fire for FAR clause text changes", () => {
  it("a real FAR clause paragraph change is not suppressed", () => {
    // No leading list ordinal in typical clause text — must never suppress.
    expect(
      ordinalOnly(
        "The Contractor shall comply with FAR 52.204-21.",
        "The Contractor shall comply with FAR 52.204-25.",
      ),
    ).toBe(false);
  });
});
