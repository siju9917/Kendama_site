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

export async function copySummaryToClipboard(result: DiffResult): Promise<void> {
  const text = buildSummaryText(result);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-browser test envs.
  throw new Error("Clipboard not available in this environment.");
}

/**
 * Build the PDF report using pdf-lib (dynamically imported so the side-panel
 * bundle stays small until export is used).
 */
export async function exportPdfReport(result: DiffResult, fileName?: string): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 14;
  const usableWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawWrapped = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}): void => {
    const size = opts.size ?? 11;
    const f = opts.bold ? fontBold : font;
    const color = opts.color ?? [0.08, 0.10, 0.12];
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
    for (const w of words) {
      const candidate = line ? line + " " + w : w;
      const width = f.widthOfTextAtSize(candidate, size);
      if (width > usableWidth && line) {
        flushLine();
        line = w;
      } else {
        line = candidate;
      }
    }
    flushLine();
  };

  const space = (n = 6): void => {
    y -= n;
  };

  // Header
  drawWrapped("BidDiff — Solicitation Amendment Comparison", { bold: true, size: 16 });
  space(4);
  if (result.currentDoc.solicitationId) {
    drawWrapped(`Solicitation: ${result.currentDoc.solicitationId}`, { size: 11 });
  }
  drawWrapped(`Compared: ${result.currentDoc.sourceFileName} vs. ${result.priorDoc.sourceFileName}`);
  if (result.generatedAt) drawWrapped(`Generated: ${result.generatedAt}`);
  space(10);

  drawWrapped("Summary", { bold: true, size: 13 });
  drawWrapped(`Total changes: ${result.changes.length}`);
  drawWrapped(
    `Critical: ${result.criticalCount}`,
    result.criticalCount > 0 ? { color: [0.69, 0, 0.12], bold: true } : {},
  );
  drawWrapped(`Confidence: ${(result.diffConfidence * 100).toFixed(0)}%`);
  if (result.warnings.length) {
    space(4);
    drawWrapped("Warnings:", { bold: true });
    for (const w of result.warnings) drawWrapped(`- ${w}`);
  }
  space(10);

  // Critical changes
  const critical = result.changes.filter((c) => c.severity === "CRITICAL");
  if (critical.length) {
    drawWrapped("Critical changes", { bold: true, size: 13, color: [0.69, 0, 0.12] });
    space(4);
    for (const c of critical) {
      drawWrapped(`• [${c.ucfLetter ?? "?"}] ${CATEGORY_LABELS[c.category] ?? c.category}`, { bold: true });
      for (const r of c.criticalReasons) drawWrapped(`   ${r}`);
      if (c.beforeText) drawWrapped(`   was: ${c.beforeText}`);
      if (c.afterText) drawWrapped(`   now: ${c.afterText}`);
      space(4);
    }
  }

  // Other changes
  const other = result.changes.filter((c) => c.severity !== "CRITICAL");
  if (other.length) {
    drawWrapped("Other changes", { bold: true, size: 13 });
    space(4);
    for (const c of other) {
      drawWrapped(`• [${c.ucfLetter ?? "?"}] ${CATEGORY_LABELS[c.category] ?? c.category} (${c.changeType})`, { bold: true });
      if (c.beforeText) drawWrapped(`   was: ${c.beforeText}`);
      if (c.afterText) drawWrapped(`   now: ${c.afterText}`);
      space(4);
    }
  }

  // Footer disclaimer on the last page.
  space(16);
  drawWrapped(DISCLAIMER_TEXT, { size: 10, color: [0.36, 0.4, 0.45] });

  // ignore unused fileName param; reserved for future "suggested name" plumbing
  void fileName;
  const bytes = await doc.save();
  // Copy to a fresh ArrayBuffer to narrow the type away from SharedArrayBuffer.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "application/pdf" });
}
