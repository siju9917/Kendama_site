/**
 * Performance smoke test (Phase 6.7).
 *
 * Generate a >200-page synthetic PDF; extract it; diff against a slightly
 * different copy; assert the whole pipeline completes within an
 * honest-progress budget.
 *
 * Budget: 30 seconds total (extraction + diff) for ~250 pages on a
 * typical developer laptop. Adjust upward if the test environment is
 * slower than expected, but never silently.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PdfExtractor } from "../../src/core/extract/pdf/pdfExtractor.js";
import type { PdfJsLike } from "../../src/core/extract/pdf/extract.js";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";

const BUDGET_MS = 30_000;

async function buildLargePdf(opts: { pages: number; tweakPage?: number; tweakText?: string }): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 13;
  const linesPerPage = 50;

  for (let p = 0; p < opts.pages; p++) {
    const page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    if (p === 0) {
      page.drawText("SECTION A — SOLICITATION/CONTRACT FORM", { x: margin, y, size: 14, font: fontBold });
      y -= lineHeight + 6;
    }
    if (p === 5) {
      page.drawText("SECTION C — STATEMENT OF WORK", { x: margin, y, size: 14, font: fontBold });
      y -= lineHeight + 6;
    }
    if (p === Math.floor(opts.pages * 0.8)) {
      page.drawText("SECTION L — INSTRUCTIONS TO OFFERORS", { x: margin, y, size: 14, font: fontBold });
      y -= lineHeight + 6;
      page.drawText("Offers are due no later than 2:00 PM Eastern Time on 2026-08-15.", {
        x: margin,
        y,
        size: 11,
        font,
      });
      y -= lineHeight;
      page.drawText("The proposal shall not exceed 30 pages.", { x: margin, y, size: 11, font });
      y -= lineHeight;
    }
    for (let line = 0; line < linesPerPage && y >= margin + lineHeight; line++) {
      let text = `Page ${p + 1} line ${line + 1}: standard SOW prose with FAR 52.204-21 referenced inline. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
      if (opts.tweakPage === p && opts.tweakText && line === 5) text = opts.tweakText;
      page.drawText(text, { x: margin, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  const bytes = await doc.save();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

let pdfjs: PdfJsLike;

beforeAll(async () => {

  const mod = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
    GlobalWorkerOptions: { workerSrc: string };
  } & PdfJsLike;
  const path = await import("node:path");
  const { createRequire } = await import("node:module");
  const req = createRequire(import.meta.url);
  const workerPath = path.join(
    path.dirname(req.resolve("pdfjs-dist/legacy/build/pdf.mjs")),
    "pdf.worker.mjs",
  );
  try {
    mod.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
  } catch {
    /* ignore */
  }
  pdfjs = mod;
});

describe("Performance on a large document (Phase 6.7)", () => {
  it("250-page document extracts and diffs within the budget", async () => {
    const pageCount = 250;
    const t0 = Date.now();
    const priorPdf = await buildLargePdf({ pages: pageCount });
    const currentPdf = await buildLargePdf({
      pages: pageCount,
      tweakPage: Math.floor(pageCount * 0.8),
      tweakText: "Offers are due no later than 2:00 PM Eastern Time on 2026-09-12.",
    });
    const t1 = Date.now();

    const extractor = new PdfExtractor(pdfjs);
    const priorDoc = await extractor.extract(priorPdf, "prior.pdf");
    const currentDoc = await extractor.extract(currentPdf, "current.pdf");
    const t2 = Date.now();

    const engine = new DiffEngine(new LocalClauseClient());
    const result = engine.diff(currentDoc, priorDoc);
    const t3 = Date.now();

    const totalExtractDiff = t3 - t1;
    console.log(
      `[perf] render=${t1 - t0}ms extract=${t2 - t1}ms diff=${t3 - t2}ms total-extract-diff=${totalExtractDiff}ms changes=${result.changes.length} pages=${priorDoc.metadata.pageCount}`,
    );
    expect(priorDoc.metadata.pageCount).toBe(pageCount);
    expect(totalExtractDiff).toBeLessThan(BUDGET_MS);
  }, 120_000);
});
