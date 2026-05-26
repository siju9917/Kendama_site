/**
 * PDF line + block reconstruction (Phase 2.3).
 *
 * Input: positioned text items from PDF.js.
 * Output: an ordered stream of RawLine objects ready for heading detection
 *         and section assembly.
 *
 * Handles:
 *   - Single-column: items sorted by (page, y descending, x ascending).
 *   - Two-column:    detected by x-coordinate clustering on a page; reads
 *                    left column top-to-bottom, then right column.
 *   - Hyphen-broken line wraps: handled by normalizeText downstream.
 */
import type { PageTextItem } from "./extract.js";
import type { RawLine } from "../sections/headings.js";

interface PageGroup {
  page: number;
  items: PageTextItem[];
}

function groupByPage(items: ReadonlyArray<PageTextItem>): PageGroup[] {
  const m = new Map<number, PageTextItem[]>();
  for (const it of items) {
    const arr = m.get(it.page) ?? [];
    arr.push(it);
    m.set(it.page, arr);
  }
  return [...m.keys()]
    .sort((a, b) => a - b)
    .map((p) => ({ page: p, items: m.get(p)! }));
}

/**
 * Detect two-column layout for a single page.
 * Returns the x-coordinate split, or null if the page is single-column.
 */
export function detectColumnSplit(items: ReadonlyArray<PageTextItem>): number | null {
  if (items.length < 30) return null;
  // Look at x-coordinates of line starts (use minimum x per discrete y row).
  const xs = items.map((i) => i.x).sort((a, b) => a - b);
  const min = xs[0];
  const max = xs[xs.length - 1];
  const span = max - min;
  if (span < 200) return null;
  // Histogram with 10 bins; find two dominant peaks.
  const bins = new Array<number>(10).fill(0);
  for (const x of xs) {
    const idx = Math.min(9, Math.max(0, Math.floor(((x - min) / span) * 10)));
    bins[idx]++;
  }
  // Two-column heuristic: bin 0-2 and bin 5-9 each have at least 20% of items,
  // and the middle bins (3,4) have < 5% combined.
  const left = bins[0] + bins[1] + bins[2];
  const middle = bins[3] + bins[4];
  const right = bins[5] + bins[6] + bins[7] + bins[8] + bins[9];
  const total = items.length;
  if (left / total >= 0.2 && right / total >= 0.2 && middle / total < 0.05) {
    return min + span * 0.5;
  }
  return null;
}

/**
 * Bucket items into lines by y coordinate within a tolerance.
 * Returns lines sorted top-to-bottom (high y first because PDF y grows up).
 */
export function clusterIntoLines(items: ReadonlyArray<PageTextItem>): PageTextItem[][] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PageTextItem[][] = [];
  const tolerance = (sorted[0].height || 10) * 0.5;
  let current: PageTextItem[] = [sorted[0]];
  let currentY = sorted[0].y;
  for (let i = 1; i < sorted.length; i++) {
    const it = sorted[i];
    if (Math.abs(it.y - currentY) <= tolerance) {
      current.push(it);
    } else {
      lines.push(current);
      current = [it];
      currentY = it.y;
    }
  }
  lines.push(current);
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  return lines;
}

function lineToRaw(line: PageTextItem[], page: number): RawLine {
  // Join with spaces if items are visually separated; otherwise concatenate.
  const parts: string[] = [];
  for (let i = 0; i < line.length; i++) {
    const it = line[i];
    if (i > 0) {
      const prev = line[i - 1];
      const gap = it.x - (prev.x + prev.width);
      // Insert a space if items are visually apart and the previous didn't end in whitespace.
      const prevEndsSpace = /\s$/.test(prev.text);
      const currStartsSpace = /^\s/.test(it.text);
      if (gap > (it.height || 10) * 0.25 && !prevEndsSpace && !currStartsSpace) {
        parts.push(" ");
      }
    }
    parts.push(it.text);
  }
  const text = parts.join("");
  const fontSize = line[0]?.fontSize ?? undefined;
  const bold = (line[0]?.fontName ?? "").toLowerCase().includes("bold");
  return { text, fontSize, bold, page };
}

export function itemsToRawLines(items: ReadonlyArray<PageTextItem>): RawLine[] {
  const pages = groupByPage(items);
  const out: RawLine[] = [];
  for (const pg of pages) {
    const split = detectColumnSplit(pg.items);
    if (split === null) {
      const lines = clusterIntoLines(pg.items);
      for (const line of lines) out.push(lineToRaw(line, pg.page));
    } else {
      const left = pg.items.filter((i) => i.x < split);
      const right = pg.items.filter((i) => i.x >= split);
      const leftLines = clusterIntoLines(left);
      const rightLines = clusterIntoLines(right);
      for (const line of leftLines) out.push(lineToRaw(line, pg.page));
      for (const line of rightLines) out.push(lineToRaw(line, pg.page));
    }
  }
  return out;
}
