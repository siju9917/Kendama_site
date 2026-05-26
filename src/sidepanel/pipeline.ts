/**
 * Side-panel pipeline: file -> extract -> diff -> result.
 *
 * Runs entirely on the user's device. The extractors are loaded lazily
 * so initial side-panel load stays fast.
 */
import type { DiffResult } from "../core/diff/types.js";
import type { IExtractor } from "../core/interfaces.js";
import { DiffEngine } from "../core/diff/engine.js";
import { LocalClauseClient } from "../core/clauses/client.js";
import { validateInput } from "../core/extract/validate.js";

async function loadPdfJs(): Promise<unknown> {
  // Lazy-load PDF.js. In the extension we configure the worker via the
  // extension's bundled worker URL; in a browser dev environment, vite
  // bundles it. The legacy build runs in both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined" && "chrome" in window) {
    // Inside an extension: point at the bundled worker.
    try {
      // The worker file is included by Vite/CRXJS via the legacy build.
      const workerUrl = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      );
      mod.GlobalWorkerOptions.workerSrc = workerUrl.href;
    } catch {
      /* ignore */
    }
  }
  return mod;
}

async function makeExtractorFor(file: File): Promise<IExtractor> {
  const buf = await file.arrayBuffer();
  const kind = validateInput(buf, file.name);
  if (kind === "PDF") {
    const pdfjs = (await loadPdfJs()) as import("../core/extract/pdf/extract.js").PdfJsLike;
    const { PdfExtractor } = await import("../core/extract/pdf/pdfExtractor.js");
    return new PdfExtractor(pdfjs);
  }
  if (kind === "DOCX") {
    const { DocxExtractor } = await import("../core/extract/docx/docxExtractor.js");
    return new DocxExtractor();
  }
  throw new Error(`Unsupported kind ${kind}`);
}

export type ProgressCb = (note: string) => void;

export async function runDiffPipeline(
  currentFile: File,
  priorFile: File,
  onProgress: ProgressCb = () => {},
): Promise<DiffResult> {
  onProgress("Reading the new version…");
  const currentExtractor = await makeExtractorFor(currentFile);
  const currentBuf = await currentFile.arrayBuffer();
  const currentDoc = await currentExtractor.extract(currentBuf, currentFile.name);

  onProgress("Reading the prior version…");
  const priorExtractor = await makeExtractorFor(priorFile);
  const priorBuf = await priorFile.arrayBuffer();
  const priorDoc = await priorExtractor.extract(priorBuf, priorFile.name);

  onProgress("Diffing…");
  const engine = new DiffEngine(new LocalClauseClient());
  const result = engine.diff(currentDoc, priorDoc);
  // generatedAt set here (the only non-deterministic field).
  result.generatedAt = new Date().toISOString();
  onProgress("Done.");
  return result;
}
