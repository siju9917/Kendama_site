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
