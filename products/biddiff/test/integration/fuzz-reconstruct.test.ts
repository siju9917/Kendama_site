/**
 * Property-based fuzz of the PDF line/block reconstruction (5.7.2
 * second-pass). itemsToRawLines turns positioned PDF.js text items into
 * an ordered RawLine stream; it runs header/footer stripping, column
 * detection, line clustering, and cross-page merge — all coordinate math
 * over semi-trusted input. Adversarial coordinates (NaN, Infinity,
 * negative, gigantic, zero-size, overlapping) must never throw or hang
 * and must yield well-formed lines.
 */
import { describe, it, expect } from "vitest";
import { itemsToRawLines } from "../../src/core/extract/pdf/reconstruct.js";
import type { PageTextItem } from "../../src/core/extract/pdf/extract.js";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Adversarial numeric pool: ordinary, boundary, and hostile values.
const NUMS = [
  0, 1, -1, 0.5, 50, 100, 612, 792, 1e6, -1e6,
  NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, 1e-9,
];
const TEXTS = ["", " ", "x", "Page 3 of 9", "FAR 52.204-21", "café", "a".repeat(120), "- item"];
const FONTS = [null, "Helvetica", "Times-Bold", "ArialMT"];

function num(rng: () => number): number {
  return NUMS[Math.floor(rng() * NUMS.length)];
}

function randomItems(rng: () => number): PageTextItem[] {
  const nPages = Math.floor(rng() * 5); // 0..4
  const items: PageTextItem[] = [];
  for (let p = 0; p < nPages; p++) {
    const nItems = Math.floor(rng() * 60); // exercise the >=30 column path
    for (let i = 0; i < nItems; i++) {
      items.push({
        page: rng() < 0.1 ? num(rng) : p, // mostly valid page, sometimes hostile
        x: num(rng),
        y: num(rng),
        width: num(rng),
        height: num(rng),
        text: TEXTS[Math.floor(rng() * TEXTS.length)],
        fontName: FONTS[Math.floor(rng() * FONTS.length)],
        fontSize: rng() < 0.5 ? num(rng) : null,
      });
    }
  }
  return items;
}

describe("PDF reconstruction property fuzz (5.7.2)", () => {
  it("itemsToRawLines never throws / hangs on adversarial coordinates (300 inputs)", () => {
    const rng = makeRng(0x9df1);
    for (let i = 0; i < 300; i++) {
      const items = randomItems(rng);
      let lines;
      const t0 = Date.now();
      expect(() => {
        lines = itemsToRawLines(items);
      }, `threw on iter ${i}`).not.toThrow();
      expect(Date.now() - t0, `slow on iter ${i}`).toBeLessThan(1000);
      expect(Array.isArray(lines)).toBe(true);
      for (const l of lines!) {
        expect(typeof l.text).toBe("string");
        // page, when present, is carried through as a number.
        if (l.page !== undefined) expect(typeof l.page).toBe("number");
      }
    }
  });
});
