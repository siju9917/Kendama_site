/**
 * End-to-end PDF round-trip: take a corpus pair (structured JSON), render
 * each side as a real PDF via pdf-lib, run them through the real
 * PdfExtractor, then diff. This is the strongest possible integration
 * test — it exercises the full extract→diff pipeline on real bytes.
 *
 * If recall on this is high, we know the engine survives real-world
 * extraction noise. If it's low, we know exactly where the cracks are.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PdfExtractor } from "../../src/core/extract/pdf/pdfExtractor.js";
import type { PdfJsLike } from "../../src/core/extract/pdf/extract.js";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { evaluatePair, loadPair } from "../corpus/harness.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

async function renderDoc(doc: StructuredDocument): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const lineHeight = 14;
  const fontSizeBody = 11;
  const fontSizeHeading = 14;
  const drawLine = (text: string, opts: { heading?: boolean } = {}): void => {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    const size = opts.heading ? fontSizeHeading : fontSizeBody;
    const f = opts.heading ? fontBold : font;
    // Soft-wrap long lines.
    const words = text.split(/\s+/);
    let line = "";
    for (const w of words) {
      const cand = line ? line + " " + w : w;
      if (f.widthOfTextAtSize(cand, size) > pageWidth - margin * 2 && line) {
        page.drawText(line, { x: margin, y, size, font: f, color: rgb(0, 0, 0) });
        y -= lineHeight;
        if (y < margin + lineHeight) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        line = w;
      } else {
        line = cand;
      }
    }
    if (line.length) {
      page.drawText(line, { x: margin, y, size, font: f, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  };

  for (const s of doc.sections) {
    drawLine(s.heading, { heading: true });
    for (const b of s.blocks) {
      drawLine(b.text);
    }
    y -= 8; // small gap between sections
  }
  const bytes = await pdf.save();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

let pdfjs: PdfJsLike;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
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
  pdfjs = mod as PdfJsLike;
});

describe("End-to-end PDF round-trip", () => {
  // Test a representative sample of pairs across categories. Running the
  // full 75-pair corpus through PDF rendering + extraction would be slow.
  const samplePairs = [
    "it-svc-001-due-date-shift",
    "it-svc-002-page-limit",
    "it-svc-003-clause-add",
    "navy-002-dfars-add",
    "nasa-001-due-date",
  ];

  it.each(samplePairs)(
    "extracts and diffs %s correctly through real PDF round-trip",
    async (pairId) => {
      const pair = loadPair(pairId);
      const currentPdf = await renderDoc(pair.current);
      const priorPdf = await renderDoc(pair.prior);
      const extractor = new PdfExtractor(pdfjs);
      const currentDoc = await extractor.extract(currentPdf, "current.pdf");
      const priorDoc = await extractor.extract(priorPdf, "prior.pdf");
      const engine = new DiffEngine(new LocalClauseClient());
      const result = engine.diff(currentDoc, priorDoc);
      const metrics = evaluatePair(pair, result);
      // We expect every CRITICAL `mustDetect` change to be found.
      // For non-critical, allow some recall loss because extraction inserts
      // some noise that synthetic JSON doesn't have.
      expect(
        metrics.missedCritical.length,
        `pair ${pairId}: critical misses=${metrics.missedCritical.map((m) => m.summary).join("; ")}`,
      ).toBe(0);
    },
    60_000,
  );
});
