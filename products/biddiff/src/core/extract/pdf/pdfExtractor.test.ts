/**
 * End-to-end test: render a synthetic PDF via pdf-lib, then extract it back.
 * This validates the whole PDF pipeline runs in a Node environment.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PdfExtractor } from "./pdfExtractor.js";
import type { PdfJsLike } from "./extract.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function renderSimplePdf(lines: ReadonlyArray<string>): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([612, 792]);
  let y = 760;
  for (const line of lines) {
    if (y < 50) {
      page = doc.addPage([612, 792]);
      y = 760;
    }
    page.drawText(line, { x: 72, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 16;
  }
  const u8 = await doc.save();
  // pdf-lib returns a Uint8Array whose backing buffer may be a SharedArrayBuffer
  // — copy into a fresh ArrayBuffer so the type narrows cleanly.
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

let pdfjs: PdfJsLike;
beforeAll(async () => {
  // PDF.js's published types don't expose GlobalWorkerOptions on the
  // module namespace, so narrow to the subset we use. The cast is local
  // to test setup, not production code.
  const mod = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
    GlobalWorkerOptions: { workerSrc: string };
  } & PdfJsLike;
  // PDF.js requires GlobalWorkerOptions.workerSrc even when running the fake
  // worker. Resolve the worker file's path inside node_modules and feed it
  // to PDF.js as a file:// URL.
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

describe("PdfExtractor", () => {
  it("extracts a minimal text PDF back into a StructuredDocument", async () => {
    const buf = await renderSimplePdf([
      "SECTION L — INSTRUCTIONS TO OFFERORS",
      "Offers are due 2026-08-15.",
      "The proposal shall not exceed 30 pages.",
      "SECTION M — EVALUATION FACTORS FOR AWARD",
      "Technical approach is the most important factor.",
    ]);
    const extractor = new PdfExtractor(pdfjs);
    const doc = await extractor.extract(buf, "sample.pdf");
    expect(doc.sections.length).toBeGreaterThanOrEqual(2);
    const letters = doc.sections.map((s) => s.ucfLetter);
    expect(letters).toContain("L");
    expect(letters).toContain("M");
    const allText = doc.sections.flatMap((s) => s.blocks.map((b) => b.text)).join(" ");
    expect(allText).toContain("2026-08-15");
    expect(allText).toContain("30 pages");
  }, 30_000);

  it("rejects empty files with EMPTY", async () => {
    const extractor = new PdfExtractor(pdfjs);
    await expect(extractor.extract(new ArrayBuffer(0), "empty.pdf")).rejects.toMatchObject({
      code: "EMPTY",
    });
  });

  it("rejects non-PDF inputs with UNSUPPORTED_FORMAT", async () => {
    const extractor = new PdfExtractor(pdfjs);
    const junk = new TextEncoder().encode("not a pdf").buffer as ArrayBuffer;
    await expect(extractor.extract(junk, "junk.pdf")).rejects.toMatchObject({
      code: "UNSUPPORTED_FORMAT",
    });
  });
});
