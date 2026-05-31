import { describe, it, expect } from "vitest";
import {
  clusterIntoLines,
  detectColumnSplit,
  itemsToRawLines,
} from "./reconstruct.js";
import type { PageTextItem } from "./extract.js";

const baseItem = (over: Partial<PageTextItem>): PageTextItem => ({
  page: 0,
  x: 0,
  y: 0,
  width: 10,
  height: 12,
  text: "",
  fontName: null,
  fontSize: 11,
  ...over,
});

describe("clusterIntoLines", () => {
  it("groups items by y within tolerance", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "Hello", x: 50, y: 720 }),
      baseItem({ text: "world.", x: 90, y: 720 }),
      baseItem({ text: "Next", x: 50, y: 700 }),
      baseItem({ text: "line.", x: 80, y: 700 }),
    ];
    const lines = clusterIntoLines(items);
    expect(lines.length).toBe(2);
    expect(lines[0].map((i) => i.text).join(" ")).toBe("Hello world.");
    expect(lines[1].map((i) => i.text).join(" ")).toBe("Next line.");
  });
});

describe("detectColumnSplit", () => {
  it("returns null when items span a narrow x range", () => {
    const items: PageTextItem[] = Array.from({ length: 30 }, (_, i) =>
      baseItem({ text: "x", x: 100 + (i % 5), y: 700 - i }),
    );
    expect(detectColumnSplit(items)).toBeNull();
  });

  it("returns split for clearly two-column layout", () => {
    const items: PageTextItem[] = [];
    // Left column items
    for (let i = 0; i < 25; i++) items.push(baseItem({ text: `L${i}`, x: 50, y: 700 - i * 15 }));
    // Right column items
    for (let i = 0; i < 25; i++) items.push(baseItem({ text: `R${i}`, x: 350, y: 700 - i * 15 }));
    const split = detectColumnSplit(items);
    expect(split).not.toBeNull();
    expect(split!).toBeGreaterThan(100);
    expect(split!).toBeLessThan(400);
  });
});

describe("itemsToRawLines (two-column)", () => {
  it("reads left column fully before right column", () => {
    const items: PageTextItem[] = [];
    for (let i = 0; i < 25; i++) items.push(baseItem({ text: `L${i}`, x: 50, y: 700 - i * 15 }));
    for (let i = 0; i < 25; i++) items.push(baseItem({ text: `R${i}`, x: 350, y: 700 - i * 15 }));
    const lines = itemsToRawLines(items);
    // Find indices of L0..L24 and R0..R24 in the line stream.
    const firstR = lines.findIndex((l) => l.text.startsWith("R"));
    const lastL = lines.map((l) => l.text).lastIndexOf("L24");
    expect(lastL).toBeLessThan(firstR);
  });

  // Bug-hunt pass 19 (2026-05-30): the realistic PDF case is items emitted in
  // INTERLEAVED source order (L0, R0, L1, R1, ...) — extraction must read by
  // COORDINATE, not source order, so the left column still comes out fully
  // before the right. The existing test pre-groups L then R, which can't
  // catch a source-order dependency; this interleaves and stays above the
  // 30-item column-detection threshold.
  it("reads left column before right even when source order interleaves them", () => {
    const items: PageTextItem[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(baseItem({ text: `L${i}`, x: 50, y: 700 - i * 15 }));
      items.push(baseItem({ text: `R${i}`, x: 350, y: 700 - i * 15 }));
    }
    const lines = itemsToRawLines(items);
    const firstR = lines.findIndex((l) => l.text.startsWith("R"));
    const lastL = lines.map((l) => l.text).lastIndexOf("L19");
    expect(firstR).toBeGreaterThan(-1);
    expect(lastL).toBeLessThan(firstR);
  });
});

describe("stripHeadersFooters", () => {
  it("removes repeating header text across pages", () => {
    const items: PageTextItem[] = [];
    // Header on every page
    for (let p = 0; p < 5; p++) {
      items.push(baseItem({ text: "Solicitation FA8771-26-R-1500", x: 50, y: 760, page: p }));
    }
    // Page-specific content on each page
    items.push(baseItem({ text: "Hello from page 0", x: 50, y: 700, page: 0 }));
    items.push(baseItem({ text: "Hello from page 1", x: 50, y: 700, page: 1 }));
    items.push(baseItem({ text: "Hello from page 2", x: 50, y: 700, page: 2 }));
    items.push(baseItem({ text: "Hello from page 3", x: 50, y: 700, page: 3 }));
    items.push(baseItem({ text: "Hello from page 4", x: 50, y: 700, page: 4 }));

    const lines = itemsToRawLines(items);
    const texts = lines.map((l) => l.text);
    expect(texts.some((t) => t.includes("Solicitation"))).toBe(false);
    expect(texts.filter((t) => t.startsWith("Hello")).length).toBe(5);
  });

  it("collapses page-number patterns (Page 1 of 5 → Page 2 of 5 …)", () => {
    const items: PageTextItem[] = [];
    for (let p = 0; p < 4; p++) {
      items.push(baseItem({ text: `Page ${p + 1} of 4`, x: 280, y: 30, page: p }));
      items.push(baseItem({ text: `Body content ${p}`, x: 50, y: 700, page: p }));
    }
    const lines = itemsToRawLines(items);
    expect(lines.map((l) => l.text).some((t) => /^Page\s+\d+\s+of/.test(t))).toBe(false);
  });

  it("does not over-strip when there are only 2 pages", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "Header text", x: 50, y: 760, page: 0 }),
      baseItem({ text: "Header text", x: 50, y: 760, page: 1 }),
      baseItem({ text: "Body 0", x: 50, y: 700, page: 0 }),
      baseItem({ text: "Body 1", x: 50, y: 700, page: 1 }),
    ];
    const lines = itemsToRawLines(items);
    // 2 pages is below the strip threshold; the header survives.
    expect(lines.map((l) => l.text).filter((t) => t === "Header text").length).toBe(2);
  });
});

describe("mergeCrossPageContinuations", () => {
  it("merges a mid-sentence line break across pages", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "The contractor shall provide", x: 50, y: 200, page: 0 }),
      baseItem({ text: "supplies in accordance with", x: 50, y: 720, page: 1 }),
    ];
    const lines = itemsToRawLines(items);
    expect(lines.length).toBe(1);
    expect(lines[0].text).toContain("provide supplies in accordance with");
  });

  it("does NOT merge across a heading-like boundary", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "End of section.", x: 50, y: 200, page: 0 }),
      baseItem({ text: "SECTION D — PACKAGING", x: 50, y: 720, page: 1 }),
    ];
    const lines = itemsToRawLines(items);
    expect(lines.length).toBe(2);
  });

  it("does NOT merge after sentence-ending punctuation", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "Section ends here.", x: 50, y: 200, page: 0 }),
      baseItem({ text: "next sentence continues", x: 50, y: 720, page: 1 }),
    ];
    const lines = itemsToRawLines(items);
    expect(lines.length).toBe(2);
  });

  it("rejoins hyphen-broken words across pages", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "perfor-", x: 50, y: 200, page: 0 }),
      baseItem({ text: "mance shall be", x: 50, y: 720, page: 1 }),
    ];
    const lines = itemsToRawLines(items);
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe("performance shall be");
  });
});

describe("itemsToRawLines (single-column)", () => {
  it("preserves reading order top to bottom", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "Top", x: 50, y: 720 }),
      baseItem({ text: "Bottom", x: 50, y: 600 }),
      baseItem({ text: "Middle", x: 50, y: 660 }),
    ];
    const lines = itemsToRawLines(items);
    expect(lines.map((l) => l.text)).toEqual(["Top", "Middle", "Bottom"]);
  });

  it("preserves font hints into RawLine", () => {
    const items: PageTextItem[] = [
      baseItem({ text: "Big", x: 50, y: 720, fontSize: 18, fontName: "Times-Bold" }),
    ];
    const [line] = itemsToRawLines(items);
    expect(line.fontSize).toBe(18);
    expect(line.bold).toBe(true);
  });
});
