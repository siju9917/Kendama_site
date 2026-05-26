/**
 * Offscreen document — heavy CPU host.
 *
 * The side panel sends a JOB message; the offscreen document runs the
 * extract→diff pipeline and posts incremental progress + the final result
 * back. The offscreen document has full DOM APIs, so PDF.js (worker URL,
 * canvas-style ops) and Tesseract.js (when wired) live here.
 *
 * Message protocol on chrome.runtime:
 *   request:  { kind: "biddiff/diff", jobId, currentBytes, currentName, priorBytes, priorName }
 *   progress: { kind: "biddiff/progress", jobId, note, percent }
 *   result:   { kind: "biddiff/result", jobId, result }     // DiffResult
 *   error:    { kind: "biddiff/error",  jobId, code, message }
 */
import { DiffEngine } from "../core/diff/engine.js";
import { LocalClauseClient } from "../core/clauses/client.js";
import { validateInput } from "../core/extract/validate.js";
import type { PdfJsLike } from "../core/extract/pdf/extract.js";
import type { IExtractor } from "../core/interfaces.js";

let pdfjsCache: PdfJsLike | null = null;
async function loadPdfJs(): Promise<PdfJsLike> {
  if (pdfjsCache) return pdfjsCache;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    const workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
    mod.GlobalWorkerOptions.workerSrc = workerUrl.href;
  } catch {
    /* ignore */
  }
  pdfjsCache = mod as PdfJsLike;
  return pdfjsCache;
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

interface DiffJobMessage {
  kind: "biddiff/diff";
  jobId: string;
  currentBytes: ArrayBuffer;
  currentName: string;
  priorBytes: ArrayBuffer;
  priorName: string;
}

function isDiffJob(m: unknown): m is DiffJobMessage {
  return (
    !!m &&
    typeof m === "object" &&
    (m as { kind?: unknown }).kind === "biddiff/diff" &&
    typeof (m as { jobId?: unknown }).jobId === "string"
  );
}

function progress(jobId: string, note: string, percent: number): void {
  chrome.runtime.sendMessage({ kind: "biddiff/progress", jobId, note, percent });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!isDiffJob(msg)) return false;
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
      chrome.runtime.sendMessage({ kind: "biddiff/result", jobId: job.jobId, result });
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "UNKNOWN";
      const message = (e as { userMessage?: string })?.userMessage ?? (e instanceof Error ? e.message : String(e));
      chrome.runtime.sendMessage({ kind: "biddiff/error", jobId: job.jobId, code, message });
    }
  })();
  sendResponse({ accepted: true });
  return false;
});
