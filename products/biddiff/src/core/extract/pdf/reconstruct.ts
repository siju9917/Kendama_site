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

/**
 * Detect and remove repeated page-header / page-footer text.
 *
 * A line is a header/footer if its text appears at approximately the same
 * y-coordinate on at least 50% of pages (with at least 3 pages total).
 * Page-numbers ("Page N of M") also count as a header/footer.
 *
 * Returns the items list with header/footer items removed.
 */
export function stripHeadersFooters(items: ReadonlyArray<PageTextItem>): PageTextItem[] {
  const pages = new Map<number, PageTextItem[]>();
  for (const it of items) {
    const arr = pages.get(it.page) ?? [];
    arr.push(it);
    pages.set(it.page, arr);
  }
  if (pages.size < 3) return [...items];

  // Bucket items by (textBucket, y-rounded). textBucket normalizes
  // recognized page-number patterns only — never numbers inside content
  // — so "Page 1 of 5" and "Page 2 of 5" coalesce, but "Hello page 0"
  // and "Hello page 1" remain distinct.
  const yTol = 6; // points
  const PAGE_NUMBER_PATTERNS: ReadonlyArray<[RegExp, string]> = [
    [/^\s*page\s+\d{1,4}\s+of\s+\d{1,4}\s*$/i, "page # of #"],
    [/^\s*page\s+\d{1,4}\s*$/i, "page #"],
    [/^\s*-\s*\d{1,4}\s*-\s*$/, "- # -"],
    [/^\s*\d{1,4}\s*$/, "#"], // bare page number
  ];
  const textOf = (t: PageTextItem): string => {
    const raw = t.text.replace(/\s+/g, " ").trim();
    for (const [re, replacement] of PAGE_NUMBER_PATTERNS) {
      if (re.test(raw)) return replacement;
    }
    return raw.toLowerCase();
  };

  type Bucket = { textBucket: string; yRounded: number; pages: Set<number> };
  const buckets = new Map<string, Bucket>();
  for (const it of items) {
    const tb = textOf(it);
    if (tb.length === 0) continue;
    const yr = Math.round(it.y / yTol) * yTol;
    const key = `${tb}@${yr}`;
    const b = buckets.get(key) ?? { textBucket: tb, yRounded: yr, pages: new Set<number>() };
    b.pages.add(it.page);
    buckets.set(key, b);
  }

  const threshold = Math.max(2, Math.ceil(pages.size * 0.5));
  const headerFooterKeys = new Set<string>();
  for (const [key, b] of buckets) {
    if (b.pages.size >= threshold) headerFooterKeys.add(key);
  }

  return items.filter((it) => {
    const yr = Math.round(it.y / yTol) * yTol;
    const key = `${textOf(it)}@${yr}`;
    return !headerFooterKeys.has(key);
  });
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
  // Use median item height (not sorted[0]). sorted[0] is the topmost item on
  // the page — often a large heading. A 24pt heading gives tolerance=12, which
  // exactly equals the ~12pt line spacing of tight 10pt body text, collapsing
  // two adjacent body lines into one cluster. The median is stable against
  // heading/table outliers and gives a tolerance representative of body text.
  const sortedHeights = sorted.map((i) => i.height || 10).sort((a, b) => a - b);
  const medHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];
  const tolerance = medHeight * 0.5;
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
  const cleaned = stripHeadersFooters(items);
  const pages = groupByPage(cleaned);
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
  return mergeCrossPageContinuations(out);
}

/**
 * Merge lines split across a page boundary that are clearly continuations
 * of a single paragraph.
 *
 * Heuristic: when the LAST line on page N ends without sentence-final
 * punctuation (.!?:) and the FIRST line on page N+1 begins with a
 * lowercase letter (indicating mid-sentence continuation), merge them.
 *
 * This is conservative: it never merges across what looks like a heading
 * (uppercase start, font size jump) and never merges if either line is
 * empty.
 */
export function mergeCrossPageContinuations(lines: ReadonlyArray<RawLine>): RawLine[] {
  if (lines.length < 2) return [...lines];
  const out: RawLine[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.page !== undefined &&
      line.page !== undefined &&
      line.page === prev.page + 1 &&
      shouldMergeContinuation(prev, line)
    ) {
      out[out.length - 1] = {
        text: prev.text.replace(/-$/, "") + (prev.text.endsWith("-") ? "" : " ") + line.text,
        // Track the LATEST page of the merged run so a paragraph that
        // continues across 3+ pages chains correctly (next-line check
        // is `line.page === prev.page + 1`).
        page: line.page,
        fontSize: prev.fontSize,
        bold: prev.bold,
      };
    } else {
      out.push(line);
    }
  }
  return out;
}

function shouldMergeContinuation(prev: RawLine, next: RawLine): boolean {
  const prevText = prev.text.trim();
  const nextText = next.text.trim();
  if (prevText.length === 0 || nextText.length === 0) return false;
  // Sentence ends with .?!: or trailing ) ] " — don't merge.
  if (/[.!?:)\]"']\s*$/.test(prevText)) return false;
  // If prev ends with a hyphen, it's a soft hyphen line wrap — merge.
  if (/-$/.test(prevText)) return true;
  // If next starts with an UPPER-case word or a numbered/lettered heading,
  // don't merge — it's likely a new sentence or heading.
  if (/^[A-Z]/.test(nextText) && !/^[A-Z]+\b/.test(nextText)) {
    // First char uppercase but the WHOLE leading word isn't all caps:
    // this is likely a new sentence start, not a heading.
    return false;
  }
  if (/^[A-Z]+\b/.test(nextText)) return false; // heading-like
  if (/^\d+\./.test(nextText)) return false; // numbered start
  // Otherwise merge.
  return true;
}
