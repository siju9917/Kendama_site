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

export type ProgressCb = (note: string, percent?: number) => void;

const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/index.html";

async function ensureOffscreenDocument(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (globalThis as any).chrome;
  if (!api?.offscreen?.hasDocument) return;
  const has = await api.offscreen.hasDocument();
  if (has) return;
  await api.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["WORKERS"],
    justification: "Run PDF/DOCX extraction and diff off the UI thread.",
  });
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
      chrome.runtime.onMessage.removeListener(handler);
      if (signal) signal.removeEventListener("abort", abortHandler);
      fn();
    };
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
    chrome.runtime.sendMessage(job);
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

  async function makeExtractorFor(file: File) {
    const buf = await file.arrayBuffer();
    const kind = validateInput(buf, file.name);
    if (kind === "PDF") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      try {
        const workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url);
        mod.GlobalWorkerOptions.workerSrc = workerUrl.href;
      } catch {
        /* ignore */
      }
      const { PdfExtractor } = await import("../core/extract/pdf/pdfExtractor.js");
      return new PdfExtractor(mod);
    }
    const { DocxExtractor } = await import("../core/extract/docx/docxExtractor.js");
    return new DocxExtractor();
  }

  onProgress("Reading the new version…", 10);
  const currentExt = await makeExtractorFor(currentFile);
  const currentBuf = await currentFile.arrayBuffer();
  const currentDoc = await currentExt.extract(currentBuf, currentFile.name);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Reading the prior version…", 45);
  const priorExt = await makeExtractorFor(priorFile);
  const priorBuf = await priorFile.arrayBuffer();
  const priorDoc = await priorExt.extract(priorBuf, priorFile.name);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Diffing…", 75);
  const engine = new DiffEngine(new LocalClauseClient());
  const result = engine.diff(currentDoc, priorDoc);
  result.generatedAt = new Date().toISOString();
  onProgress("Done", 100);
  return result;
}

function hasOffscreenSupport(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (globalThis as any).chrome;
  return !!api?.offscreen?.createDocument && !!api?.runtime?.sendMessage;
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
