import { describe, it, expect } from "vitest";
import {
  jaccardSimilarity,
  joinTokens,
  levenshteinRatio,
  normalizeText,
  tokenize,
} from "./text.js";

describe("normalizeText", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeText("  hello\n\n world\t\t!  ")).toBe("hello world !");
  });

  it("rewrites ligatures", () => {
    expect(normalizeText("ofﬁce ﬂag")).toBe("office flag");
  });

  it("converts curly quotes and en/em dashes", () => {
    expect(normalizeText("“hi” — there–ok")).toBe('"hi" - there-ok');
  });

  it("removes soft hyphens", () => {
    expect(normalizeText("dis­tributed")).toBe("distributed");
  });

  it("rejoins hyphen-broken line wraps", () => {
    expect(normalizeText("exam-\nple")).toBe("example");
  });

  it("rejoins clause numbers broken across whitespace", () => {
    expect(normalizeText("See 52. 204-21 and 252. 204-7012.")).toBe(
      "See 52.204-21 and 252.204-7012.",
    );
  });

  it("does not collapse sentence-ending periods", () => {
    expect(normalizeText("Item 2. The proposal must include details.")).toBe(
      "Item 2. The proposal must include details.",
    );
  });

  it("is idempotent", () => {
    const once = normalizeText("ﬁle  with\n“quotes”");
    expect(normalizeText(once)).toBe(once);
  });

  it("strips zero-width characters PDFs slip into text", () => {
    // ZWSP, ZWNJ, ZWJ, word joiner, BOM. JavaScript's \s does not match
    // these, so without explicit stripping they survive normalization
    // and create false diffs.
    expect(normalizeText("sec​tion‌ 1﻿")).toBe("section 1");
    expect(normalizeText("a‍b⁠c")).toBe("abc");
  });
});

describe("tokenize", () => {
  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("splits words and keeps punctuation as separate tokens", () => {
    expect(tokenize("Hello, world!")).toEqual(["Hello", ",", "world", "!"]);
  });

  it("keeps clause numbers as single tokens", () => {
    expect(tokenize("See FAR 52.204-21 in this case.")).toEqual([
      "See",
      "FAR",
      "52.204-21",
      "in",
      "this",
      "case",
      ".",
    ]);
  });

  it("round-trips via joinTokens (up to normalization)", () => {
    const input = "  ofﬁce  hours  9:00 AM ";
    const tokens = tokenize(input);
    expect(joinTokens(tokens)).toBe("office hours 9 : 00 AM");
  });
});

describe("similarity", () => {
  it("jaccard returns 1 for identical and 0 for disjoint", () => {
    expect(jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
    expect(jaccardSimilarity(["a", "b"], ["x", "y"])).toBe(0);
    expect(jaccardSimilarity([], [])).toBe(1);
    expect(jaccardSimilarity(["a"], [])).toBe(0);
  });

  it("jaccard is symmetric and bounded", () => {
    const a = ["foo", "bar", "baz"];
    const b = ["bar", "qux"];
    const s1 = jaccardSimilarity(a, b);
    const s2 = jaccardSimilarity(b, a);
    expect(s1).toBe(s2);
    expect(s1).toBeGreaterThan(0);
    expect(s1).toBeLessThan(1);
  });

  it("levenshtein ratio identifies near-duplicates", () => {
    expect(levenshteinRatio("statement of work", "statement of work")).toBe(1);
    expect(levenshteinRatio("", "anything")).toBe(0);
    expect(levenshteinRatio("statement of work", "statement of works")).toBeGreaterThan(0.9);
  });
});
