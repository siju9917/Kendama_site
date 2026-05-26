/**
 * Side-panel pipeline.
 *
 * In an extension context, jobs are routed to the offscreen document
 * (chrome.offscreen) so heavy PDF/DOCX work doesn't block the panel UI.
 * In a non-extension context (Node tests, dev preview), the pipeline runs
 * locally as a fallback.
 *
 * Either way, the surface is the same: runDiffPipeline(current, prior, onProgress).
 *
 * The returned promise carries `signal` semantics: pass an AbortSignal and
 * the in-flight job is cancelled (the offscreen worker continues but its
 * result is dropped on return).
 */
import type { DiffResult } from "../core/diff/types.js";
import { isBidDiffMessage, type DiffJobMsg } from "../shared/messages.js";
import { postRuntime } from "../shared/chrome-rt.js";

export type ProgressCb = (note: string, percent?: number) => void;

const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/index.html";

async function ensureOffscreenDocument(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.offscreen?.hasDocument) return;
  const has = await chrome.offscreen.hasDocument();
  if (has) return;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Run PDF/DOCX extraction and diff off the UI thread.",
    });
  } catch (e) {
    // Race: another side-panel window may have created the doc between
    // our hasDocument check and the createDocument call. Chrome rejects
    // a second creation with "Only one offscreen document can be created
    // at a time." Treat that as success.
    const msg = e instanceof Error ? e.message : String(e);
    if (/only one offscreen document/i.test(msg)) return;
    throw e;
  }
}

class OffscreenJobError extends Error {
  readonly code: string;
  readonly userMessage: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.userMessage = message;
  }
}

/** Hard upper bound on a single diff. 5 minutes is generous even for 1000-page docs. */
const OFFSCREEN_TIMEOUT_MS = 5 * 60 * 1000;

async function runViaOffscreen(
  current: File,
  prior: File,
  onProgress: ProgressCb,
  signal?: AbortSignal,
): Promise<DiffResult> {
  await ensureOffscreenDocument();
  const jobId = crypto.randomUUID();
  const currentBytes = await current.arrayBuffer();
  const priorBytes = await prior.arrayBuffer();

  return new Promise<DiffResult>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      chrome.runtime.onMessage.removeListener(handler);
      if (signal) signal.removeEventListener("abort", abortHandler);
      fn();
    };
    // Safety net: if the offscreen document errors silently and never
    // posts a result, the user must not be stuck on a spinner forever.
    const timeoutHandle = setTimeout(() => {
      settle(() =>
        reject(
          new OffscreenJobError(
            "TIMEOUT",
            "Processing took longer than expected. Try smaller files or reopen the side panel.",
          ),
        ),
      );
    }, OFFSCREEN_TIMEOUT_MS);
    const handler = (m: unknown): void => {
      if (!isBidDiffMessage(m)) return;
      if (!("jobId" in m) || m.jobId !== jobId) return;
      if (m.kind === "biddiff/progress") {
        onProgress(m.note, m.percent);
      } else if (m.kind === "biddiff/result") {
        settle(() => resolve(m.result));
      } else if (m.kind === "biddiff/error") {
        settle(() => reject(new OffscreenJobError(m.code, m.message)));
      }
    };
    const abortHandler = (): void => settle(() => reject(new DOMException("Aborted", "AbortError")));
    if (signal) {
      if (signal.aborted) return abortHandler();
      signal.addEventListener("abort", abortHandler);
    }
    chrome.runtime.onMessage.addListener(handler);
    const job: DiffJobMsg = {
      kind: "biddiff/diff",
      jobId,
      currentBytes,
      currentName: current.name,
      priorBytes,
      priorName: prior.name,
    };
    postRuntime(job);
  });
}

async function runLocalFallback(
  currentFile: File,
  priorFile: File,
  onProgress: ProgressCb,
  signal?: AbortSignal,
): Promise<DiffResult> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const { validateInput } = await import("../core/extract/validate.js");
  const { DiffEngine } = await import("../core/diff/engine.js");
  const { LocalClauseClient } = await import("../core/clauses/client.js");

  // Returns the extractor AND the buffer it read for kind detection,
  // so the caller doesn't pay arrayBuffer() twice on the same File.
  async function makeExtractorFor(
    file: File,
    onPageProgress?: (done: number, total: number) => void,
  ): Promise<{ ext: import("../core/interfaces.js").IExtractor; buf: ArrayBuffer }> {
    const buf = await file.arrayBuffer();
    const kind = validateInput(buf, file.name);
    if (kind === "PDF") {
      const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
      try {
        const workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
        mod.GlobalWorkerOptions.workerSrc = workerUrl.href;
      } catch {
        /* ignore */
      }
      const { PdfExtractor } = await import("../core/extract/pdf/pdfExtractor.js");
      const pdfjs = mod as unknown as import("../core/extract/pdf/extract.js").PdfJsLike;
      return { ext: new PdfExtractor(pdfjs, { onPageProgress }), buf };
    }
    const { DocxExtractor } = await import("../core/extract/docx/docxExtractor.js");
    return { ext: new DocxExtractor(), buf };
  }

  onProgress("Reading the new version…", 10);
  const cur = await makeExtractorFor(currentFile, (done, total) => {
    onProgress(`Reading the new version… (page ${done}/${total})`, 10 + Math.round((done / total) * 35));
  });
  const currentDoc = await cur.ext.extract(cur.buf, currentFile.name);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Reading the prior version…", 45);
  const pri = await makeExtractorFor(priorFile, (done, total) => {
    onProgress(`Reading the prior version… (page ${done}/${total})`, 45 + Math.round((done / total) * 30));
  });
  const priorDoc = await pri.ext.extract(pri.buf, priorFile.name);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Diffing…", 75);
  const engine = new DiffEngine(new LocalClauseClient());
  const result = engine.diff(currentDoc, priorDoc);
  result.generatedAt = new Date().toISOString();
  onProgress("Done", 100);
  return result;
}

function hasOffscreenSupport(): boolean {
  return (
    typeof chrome !== "undefined" &&
    !!chrome.offscreen?.createDocument &&
    !!chrome.runtime?.sendMessage
  );
}

export async function runDiffPipeline(
  currentFile: File,
  priorFile: File,
  onProgress: ProgressCb = () => {},
  signal?: AbortSignal,
): Promise<DiffResult> {
  if (hasOffscreenSupport()) {
    return runViaOffscreen(currentFile, priorFile, onProgress, signal);
  }
  return runLocalFallback(currentFile, priorFile, onProgress, signal);
}

/**
 * Optionally pre-warm the heavy code paths. Call this when the side
 * panel opens (or after first render) so the first user-initiated diff
 * doesn't pay the lazy-import latency for PDF.js / DOCX / engine.
 *
 * Safe to call multiple times; subsequent calls are cheap.
 */
let prewarmed = false;
export function prewarmPipeline(): void {
  if (prewarmed) return;
  prewarmed = true;
  // Fire-and-forget; we don't await these.
  void (async () => {
    try {
      await Promise.all([
        import("../core/diff/engine.js"),
        import("../core/clauses/client.js"),
        import("pdfjs-dist/legacy/build/pdf.mjs"),
        import("../core/extract/pdf/pdfExtractor.js"),
      ]);
    } catch {
      /* prewarm is best-effort */
    }
  })();
}
