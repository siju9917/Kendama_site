/**
 * Offscreen document — heavy CPU host.
 *
 * The side panel sends a DiffJobMsg; this document runs the extract→diff
 * pipeline and posts progress + the final result back via the typed
 * BidDiffMessage protocol in src/shared/messages.ts.
 */
import { DiffEngine } from "../core/diff/engine.js";
import { LocalClauseClient } from "../core/clauses/client.js";
import { validateInput } from "../core/extract/validate.js";
import type { PdfJsLike } from "../core/extract/pdf/extract.js";
import type { IExtractor } from "../core/interfaces.js";
import {
  isBidDiffMessage,
  type DiffErrorMsg,
  type DiffProgressMsg,
  type DiffResultMsg,
} from "../shared/messages.js";
import { postRuntime } from "../shared/chrome-rt.js";

// Cache the promise (not the resolved value) so concurrent first
// invocations share a single load, avoiding redundant worker setup.
// If the load fails, drop the cached rejected promise so future calls
// can retry instead of inheriting a permanent failure.
let pdfjsPromise: Promise<PdfJsLike> | null = null;
function loadPdfJs(): Promise<PdfJsLike> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
      try {
        const workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
        mod.GlobalWorkerOptions.workerSrc = workerUrl.href;
      } catch {
        /* ignore */
      }
      return mod as unknown as PdfJsLike;
    })().catch((e) => {
      pdfjsPromise = null;
      throw e;
    });
  }
  return pdfjsPromise;
}

async function makeExtractor(bytes: ArrayBuffer, fileName: string): Promise<IExtractor> {
  const kind = validateInput(bytes, fileName);
  if (kind === "PDF") {
    const pdfjs = await loadPdfJs();
    const { PdfExtractor } = await import("../core/extract/pdf/pdfExtractor.js");
    return new PdfExtractor(pdfjs);
  }
  const { DocxExtractor } = await import("../core/extract/docx/docxExtractor.js");
  return new DocxExtractor();
}

function progress(jobId: string, note: string, percent: number): void {
  const m: DiffProgressMsg = { kind: "biddiff/progress", jobId, note, percent };
  postRuntime(m);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!isBidDiffMessage(msg) || msg.kind !== "biddiff/diff") return false;
  const job = msg;
  void (async () => {
    try {
      progress(job.jobId, "Reading the new version…", 10);
      const currentExt = await makeExtractor(job.currentBytes, job.currentName);
      const currentDoc = await currentExt.extract(job.currentBytes, job.currentName);
      progress(job.jobId, "Reading the prior version…", 45);
      const priorExt = await makeExtractor(job.priorBytes, job.priorName);
      const priorDoc = await priorExt.extract(job.priorBytes, job.priorName);
      progress(job.jobId, "Diffing…", 75);
      const engine = new DiffEngine(new LocalClauseClient());
      const result = engine.diff(currentDoc, priorDoc);
      result.generatedAt = new Date().toISOString();
      progress(job.jobId, "Done", 100);
      const done: DiffResultMsg = { kind: "biddiff/result", jobId: job.jobId, result };
      postRuntime(done);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "UNKNOWN";
      const message =
        (e as { userMessage?: string })?.userMessage ??
        (e instanceof Error ? e.message : String(e));
      const err: DiffErrorMsg = { kind: "biddiff/error", jobId: job.jobId, code, message };
      postRuntime(err);
    }
  })();
  sendResponse({ accepted: true });
  return false;
});
