/**
 * Export: PDF report + clipboard summary (Phase 4.11).
 *
 * Both outputs include the neutral disclaimer.
 */
import type { Change, DiffResult } from "../diff/types.js";
import { DISCLAIMER_TEXT } from "../../shared/disclaimer.js";

const CATEGORY_LABELS: Record<string, string> = {
  SCOPE_SOW: "Scope (SOW)",
  EVALUATION_CRITERIA: "Evaluation Criteria",
  DATES_DEADLINES: "Dates & Deadlines",
  CLAUSES: "Clauses",
  SUBMISSION_INSTRUCTIONS: "Submission Instructions",
  PRICING_CLINS: "Pricing / CLINs",
  ATTACHMENTS: "Attachments",
  OTHER: "Other",
};

export function buildSummaryText(result: DiffResult): string {
  const lines: string[] = [];
  lines.push("BidDiff — Solicitation Amendment Comparison");
  if (result.currentDoc.solicitationId) {
    lines.push(`Solicitation: ${result.currentDoc.solicitationId}`);
  }
  lines.push(`Compared: ${result.currentDoc.sourceFileName} vs. ${result.priorDoc.sourceFileName}`);
  if (result.generatedAt) lines.push(`Generated: ${result.generatedAt}`);
  lines.push("");
  lines.push(`Total changes: ${result.changes.length}`);
  lines.push(`Critical:      ${result.criticalCount}`);
  lines.push(`Confidence:    ${(result.diffConfidence * 100).toFixed(0)}%`);
  if (result.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of result.warnings) lines.push(`  - ${w}`);
  }
  lines.push("");
  // Critical changes first
  const critical = result.changes.filter((c) => c.severity === "CRITICAL");
  if (critical.length) {
    lines.push("Critical changes:");
    for (const c of critical) lines.push(formatChangeOneLine(c));
    lines.push("");
  }
  const normal = result.changes.filter((c) => c.severity !== "CRITICAL");
  if (normal.length) {
    lines.push("Other changes:");
    for (const c of normal) lines.push(formatChangeOneLine(c));
    lines.push("");
  }
  lines.push("---");
  lines.push(DISCLAIMER_TEXT);
  return lines.join("\n");
}

function formatChangeOneLine(c: Change): string {
  const cat = CATEGORY_LABELS[c.category] ?? c.category;
  const reason = c.criticalReasons[0] ?? "";
  const what =
    c.changeType === "INSERT"
      ? `Added: ${truncate(c.afterText ?? "", 100)}`
      : c.changeType === "DELETE"
        ? `Removed: ${truncate(c.beforeText ?? "", 100)}`
        : c.changeType === "MOVE"
          ? `Moved: ${truncate(c.afterText ?? "", 80)}`
          : `Modified: was "${truncate(c.beforeText ?? "", 60)}" now "${truncate(c.afterText ?? "", 60)}"`;
  const sectionLabel = c.ucfLetter ? `[Section ${c.ucfLetter}] ` : "";
  return `  - ${sectionLabel}${cat}: ${reason ? reason + " " : ""}${what}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * Replace characters that pdf-lib's StandardFonts.Helvetica (WinAnsi
 * encoding) cannot render. If the source solicitation contains a math
 * symbol or non-Latin character that survived normalization, the PDF
 * export would otherwise throw mid-render. Anything outside WinAnsi
 * gets replaced with "?" so the export always succeeds.
 */
const WINANSI_ALLOWED = new Set<number>([
  // ASCII printable
  ...range(0x20, 0x7e),
  // Latin-1 (most of it)
  ...range(0xa0, 0xff),
  // The handful of special chars WinAnsi places at 0x80-0x9f via mapping:
  // em-dash (—) U+2014, en-dash (–) U+2013, curly quotes, bullet (•) U+2022,
  // ellipsis (…) U+2026, trademark (™) U+2122, single low-9 quote, etc.
  0x2014, 0x2013, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021,
  0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122, 0x0152, 0x0153,
  0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc,
  // Tab and newline are stripped by our text normalizer but include for safety.
  0x09, 0x0a,
]);

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let c = lo; c <= hi; c++) out.push(c);
  return out;
}

function toWinAnsiSafe(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0x3f;
    out += WINANSI_ALLOWED.has(code) ? ch : "?";
  }
  return out;
}

export async function copySummaryToClipboard(result: DiffResult): Promise<void> {
  const text = buildSummaryText(result);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard not available in this environment.");
}

/**
 * Build a Markdown version of the summary — for pasting into Slack,
 * Notion, GitHub issues, etc., where rich formatting is preserved.
 */
export function buildSummaryMarkdown(result: DiffResult): string {
  const lines: string[] = [];
  lines.push("# BidDiff — Solicitation Amendment Comparison");
  if (result.currentDoc.solicitationId) {
    lines.push(`**Solicitation:** \`${result.currentDoc.solicitationId}\``);
  }
  lines.push(`**Compared:** \`${result.currentDoc.sourceFileName}\` vs. \`${result.priorDoc.sourceFileName}\``);
  if (result.generatedAt) lines.push(`**Generated:** ${result.generatedAt}`);
  lines.push("");
  lines.push(`- **Total changes:** ${result.changes.length}`);
  lines.push(`- **Critical:** ${result.criticalCount}`);
  lines.push(`- **Confidence:** ${(result.diffConfidence * 100).toFixed(0)}%`);
  if (result.warnings.length) {
    lines.push("");
    lines.push("**Warnings**");
    for (const w of result.warnings) lines.push(`- ${w}`);
  }
  lines.push("");

  const critical = result.changes.filter((c) => c.severity === "CRITICAL");
  if (critical.length) {
    lines.push("## Critical changes");
    for (const c of critical) lines.push(formatChangeMd(c));
    lines.push("");
  }
  const normal = result.changes.filter((c) => c.severity !== "CRITICAL");
  if (normal.length) {
    lines.push("## Other changes");
    for (const c of normal) lines.push(formatChangeMd(c));
    lines.push("");
  }
  lines.push("---");
  lines.push(`*${DISCLAIMER_TEXT}*`);
  return lines.join("\n");
}

function formatChangeMd(c: Change): string {
  const cat = CATEGORY_LABELS[c.category] ?? c.category;
  const section = c.ucfLetter ? `[Section ${c.ucfLetter}] ` : "";
  const lines: string[] = [];
  lines.push(`- **${section}${cat} — ${c.changeType}**`);
  for (const r of c.criticalReasons) lines.push(`  - _${r}_`);
  if (c.beforeText) lines.push(`  - was: ${mdInlineCode(truncate(c.beforeText, 100))}`);
  if (c.afterText) lines.push(`  - now: ${mdInlineCode(truncate(c.afterText, 100))}`);
  if (c.clauseInfo) {
    lines.push(
      `  - ${c.clauseInfo.regulation} ${c.clauseInfo.clauseNumber} — ${c.clauseInfo.title}`,
    );
  }
  return lines.join("\n");
}

/**
 * Inline code span that survives embedded backticks (CommonMark: use N+1
 * backticks to wrap content containing N consecutive backticks; pad with
 * a space when content begins or ends with a backtick).
 */
function mdInlineCode(s: string): string {
  if (!s.includes("`")) return `\`${s}\``;
  let longest = 0;
  let cur = 0;
  for (const ch of s) {
    if (ch === "`") {
      cur++;
      if (cur > longest) longest = cur;
    } else {
      cur = 0;
    }
  }
  const fence = "`".repeat(longest + 1);
  const pad = s.startsWith("`") || s.endsWith("`") ? " " : "";
  return `${fence}${pad}${s}${pad}${fence}`;
}

export async function copyMarkdownToClipboard(result: DiffResult): Promise<void> {
  const md = buildSummaryMarkdown(result);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(md);
    return;
  }
  throw new Error("Clipboard not available in this environment.");
}

/**
 * Build the PDF report using pdf-lib (dynamically imported so the side-panel
 * bundle stays small until export is used).
 */
export async function exportPdfReport(result: DiffResult, fileName?: string): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  // Pin the metadata dates to the DiffResult's generatedAt so the PDF
  // bytes are deterministic for a given DiffResult. Without this,
  // pdf-lib stamps the current wall-clock time into /CreationDate and
  // /ModDate, making two exports of the same diff produce different
  // bytes — bad for reproducibility, hashes, and committed samples.
  const metaDate = result.generatedAt ? new Date(result.generatedAt) : new Date(0);
  doc.setCreationDate(metaDate);
  doc.setModificationDate(metaDate);
  doc.setProducer("BidDiff");
  doc.setCreator("BidDiff");
  doc.setTitle(
    result.currentDoc.solicitationId
      ? `BidDiff — ${result.currentDoc.solicitationId}`
      : "BidDiff — Solicitation Amendment Comparison",
  );
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 14;
  const usableWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawWrapped = (rawText: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}): void => {
    const size = opts.size ?? 11;
    const f = opts.bold ? fontBold : font;
    const color = opts.color ?? [0.08, 0.10, 0.12];
    // Sanitize before measuring so width math and drawn glyphs agree.
    const text = toWinAnsiSafe(rawText);
    const words = text.split(/\s+/);
    let line = "";
    const flushLine = (): void => {
      if (line.length === 0) return;
      if (y < margin + lineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size, font: f, color: rgb(color[0], color[1], color[2]) });
      y -= lineHeight;
      line = "";
    };
    // Hard-break very long unbreakable runs that would overflow.
    const breakLongRun = (w: string): string[] => {
      const segs: string[] = [];
      let s = w;
      while (s.length > 0 && f.widthOfTextAtSize(s, size) > usableWidth) {
        let lo = 1;
        let hi = s.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi + 1) / 2);
          if (f.widthOfTextAtSize(s.slice(0, mid), size) <= usableWidth) lo = mid;
          else hi = mid - 1;
        }
        segs.push(s.slice(0, lo));
        s = s.slice(lo);
      }
      if (s.length > 0) segs.push(s);
      return segs;
    };
    for (const raw of words) {
      const subs = breakLongRun(raw);
      for (const w of subs) {
        const candidate = line ? line + " " + w : w;
        const width = f.widthOfTextAtSize(candidate, size);
        if (width > usableWidth && line) {
          flushLine();
          line = w;
        } else {
          line = candidate;
        }
      }
    }
    flushLine();
  };

  const space = (n = 6): void => {
    y -= n;
  };

  // Helper: draw a horizontal rule.
  const rule = (color: [number, number, number] = [0.85, 0.87, 0.9]): void => {
    if (y < margin + 4) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawRectangle({
      x: margin,
      y,
      width: usableWidth,
      height: 0.6,
      color: rgb(color[0], color[1], color[2]),
    });
    y -= 8;
  };

  // Helper: draw an accent bar (left-side color stripe) for a block.
  const drawAccentBar = (height: number, color: [number, number, number]): void => {
    page.drawRectangle({
      x: margin - 6,
      y: y - height,
      width: 3,
      height,
      color: rgb(color[0], color[1], color[2]),
    });
  };

  // ---- Branded header ----
  // Title row with an accent square.
  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: 14,
    height: 14,
    color: rgb(0.12, 0.36, 0.84),
  });
  page.drawText("BidDiff", {
    x: margin + 22,
    y: y - 1,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.12),
  });
  y -= 24;
  drawWrapped("Solicitation Amendment Comparison Report", { size: 12, color: [0.36, 0.4, 0.45] });
  space(4);
  rule();
  if (result.currentDoc.solicitationId) {
    drawWrapped(`Solicitation: ${result.currentDoc.solicitationId}`, { size: 11, bold: true });
  }
  drawWrapped(`Compared: ${result.currentDoc.sourceFileName} vs. ${result.priorDoc.sourceFileName}`);
  if (result.generatedAt) drawWrapped(`Generated: ${result.generatedAt}`, { color: [0.36, 0.4, 0.45] });
  space(12);

  // ---- Summary band ----
  drawWrapped("SUMMARY", { bold: true, size: 11, color: [0.36, 0.4, 0.45] });
  space(2);
  drawWrapped(`Total changes: ${result.changes.length}`, { size: 12 });
  drawWrapped(
    `Critical: ${result.criticalCount}`,
    result.criticalCount > 0 ? { color: [0.69, 0, 0.12], bold: true, size: 12 } : { size: 12 },
  );
  drawWrapped(`Confidence: ${(result.diffConfidence * 100).toFixed(0)}%`, { size: 12 });

  // Per-category counts
  const catCounts = Object.entries(result.changeCountByCategory).filter(([, n]) => n > 0);
  if (catCounts.length) {
    space(4);
    drawWrapped("By category:", { bold: true, size: 11, color: [0.36, 0.4, 0.45] });
    for (const [k, n] of catCounts) {
      drawWrapped(`  ${CATEGORY_LABELS[k] ?? k}: ${n}`, { size: 11 });
    }
  }

  if (result.warnings.length) {
    space(6);
    drawWrapped("Warnings", { bold: true, size: 11, color: [0.69, 0, 0.12] });
    for (const w of result.warnings) drawWrapped(`  • ${w}`, { color: [0.36, 0.4, 0.45] });
  }
  space(14);
  rule();
  space(6);

  // Table of contents for reports with many changes — gives the reader a
  // quick map of what's coming.
  if (result.changes.length >= 10) {
    drawWrapped("CONTENTS", { bold: true, size: 11, color: [0.36, 0.4, 0.45] });
    space(2);
    const groups = new Map<string, number>();
    for (const c of result.changes) {
      const sec = c.ucfLetter ? `Section ${c.ucfLetter}` : "Other";
      const k = `${sec} — ${CATEGORY_LABELS[c.category] ?? c.category}`;
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    for (const [k, n] of groups) {
      drawWrapped(`  ${k}: ${n}`, { size: 11 });
    }
    space(8);
    rule();
    space(6);
  }

  // ---- Critical changes ----
  const critical = result.changes.filter((c) => c.severity === "CRITICAL");
  if (critical.length) {
    drawWrapped("CRITICAL CHANGES", { bold: true, size: 13, color: [0.69, 0, 0.12] });
    drawWrapped(`${critical.length} change${critical.length === 1 ? "" : "s"} flagged as critical.`, {
      color: [0.36, 0.4, 0.45],
    });
    space(8);
    for (const c of critical) {
      // Capture the (page, y) BEFORE this block. If the block flows across a
      // page break, we'll draw the accent bar only on the starting page so it
      // doesn't appear on the wrong page.
      const startPage = page;
      const startY = y;
      drawWrapped(`${c.ucfLetter ? `[Section ${c.ucfLetter}] ` : ""}${CATEGORY_LABELS[c.category] ?? c.category} — ${c.changeType}`, {
        bold: true,
        size: 12,
      });
      for (const r of c.criticalReasons) drawWrapped(`   ${r}`, { color: [0.69, 0, 0.12] });
      if (c.beforeText) drawWrapped(`   was: ${c.beforeText}`, { color: [0.36, 0.4, 0.45] });
      if (c.afterText) drawWrapped(`   now: ${c.afterText}`);
      if (c.clauseInfo) {
        drawWrapped(
          `   ${c.clauseInfo.regulation} ${c.clauseInfo.clauseNumber} — ${c.clauseInfo.title}`,
          { color: [0.36, 0.4, 0.45], size: 10 },
        );
        if (c.clauseInfo.plainLanguageNote) {
          drawWrapped(`   ${c.clauseInfo.plainLanguageNote}`, { color: [0.36, 0.4, 0.45], size: 10 });
        }
      }
      // Draw the accent bar only when the block stayed on a single page.
      if (page === startPage) {
        const heightOfBlock = startY - y;
        const savedY = y;
        const savedPage = page;
        y = startY;
        page = startPage;
        drawAccentBar(heightOfBlock, [0.69, 0, 0.12]);
        y = savedY;
        page = savedPage;
      }
      space(8);
    }
  }

  // ---- Other changes ----
  const other = result.changes.filter((c) => c.severity !== "CRITICAL");
  if (other.length) {
    rule();
    space(6);
    drawWrapped("OTHER CHANGES", { bold: true, size: 13, color: [0.36, 0.4, 0.45] });
    drawWrapped(`${other.length} non-critical change${other.length === 1 ? "" : "s"}.`, {
      color: [0.36, 0.4, 0.45],
    });
    space(8);
    for (const c of other) {
      drawWrapped(`${c.ucfLetter ? `[Section ${c.ucfLetter}] ` : ""}${CATEGORY_LABELS[c.category] ?? c.category} — ${c.changeType}`, {
        bold: true,
        size: 12,
      });
      if (c.beforeText) drawWrapped(`   was: ${c.beforeText}`, { color: [0.36, 0.4, 0.45] });
      if (c.afterText) drawWrapped(`   now: ${c.afterText}`);
      space(4);
    }
  }

  // Footer disclaimer on the last page.
  space(16);
  drawWrapped(DISCLAIMER_TEXT, { size: 10, color: [0.36, 0.4, 0.45] });

  // Page numbers in the footer of every page ("Page i of N").
  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const p = pages[i];
    const text = `Page ${i + 1} of ${total}`;
    const w = font.widthOfTextAtSize(text, 9);
    p.drawText(text, {
      x: pageWidth - margin - w,
      y: 28,
      size: 9,
      font,
      color: rgb(0.55, 0.6, 0.66),
    });
    p.drawText("BidDiff", {
      x: margin,
      y: 28,
      size: 9,
      font,
      color: rgb(0.55, 0.6, 0.66),
    });
  }

  // ignore unused fileName param; reserved for future "suggested name" plumbing
  void fileName;
  const bytes = await doc.save();
  // Copy to a fresh ArrayBuffer to narrow the type away from SharedArrayBuffer.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "application/pdf" });
}
