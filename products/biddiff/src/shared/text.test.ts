import { describe, it, expect } from "vitest";
import {
  containmentSimilarity,
  jaccardSimilarity,
  joinTokens,
  levenshteinRatio,
  modifySimilarity,
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

  it("strips C0/C1 control characters that PDFs sometimes leak", () => {
    // NUL, SOH, STX, BS, DEL — would otherwise survive whitespace
    // normalization and end up as invisible glyphs in the diff.
    expect(normalizeText("a\x00b")).toBe("ab");
    expect(normalizeText("hello\x01\x02world")).toBe("helloworld");
    expect(normalizeText("\x7Ftrim")).toBe("trim");
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

  it("truncates pathological inputs so it cannot freeze on a huge string", () => {
    // The MAX_LEN=1024 guard means a 50k-char input doesn't run a 2.5B-cell dp.
    const big = "a".repeat(50000);
    const start = Date.now();
    const r = levenshteinRatio(big, big.slice(0, 40000) + "b".repeat(10000));
    expect(Date.now() - start).toBeLessThan(500);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

describe("containmentSimilarity (previously untested)", () => {
  it("is 1 when one token set is contained in the other", () => {
    expect(containmentSimilarity(["a", "b"], ["a", "b", "c", "d"])).toBe(1);
    expect(containmentSimilarity(["a", "b", "c", "d"], ["a", "b"])).toBe(1);
  });
  it("is 0 for disjoint or empty inputs", () => {
    expect(containmentSimilarity(["a"], ["x"])).toBe(0);
    expect(containmentSimilarity([], ["a"])).toBe(0);
    expect(containmentSimilarity(["a"], [])).toBe(0);
  });
});

describe("modifySimilarity (previously untested)", () => {
  it("equals max(jaccard, containment) and so is >= both, across random pairs", () => {
    const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];
    let s = 12345;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const pick = () => {
      const n = 1 + Math.floor(rnd() * words.length);
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push(words[Math.floor(rnd() * words.length)]);
      return out;
    };
    for (let i = 0; i < 200; i++) {
      const a = pick();
      const b = pick();
      const j = jaccardSimilarity(a, b);
      const c = containmentSimilarity(a, b);
      const m = modifySimilarity(a, b);
      expect(m).toBeCloseTo(Math.max(j, c), 10);
      expect(m).toBeGreaterThanOrEqual(j - 1e-9);
      expect(m).toBeGreaterThanOrEqual(c - 1e-9);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});
