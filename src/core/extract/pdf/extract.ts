/**
 * PDF text extraction (Phase 2.1).
 *
 * Uses PDF.js (legacy build) for cross-environment compatibility:
 *   - In the offscreen document we get a real Worker.
 *   - In Node tests we run the legacy build single-threaded.
 *
 * We extract positioned text items (x, y, width, height, fontName, fontSize)
 * and pass them to the line/block reconstruction step (Phase 2.3).
 */
import type { Anchor } from "../../model/types.js";

export interface PageTextItem {
  page: number; // 0-based
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontName: string | null;
  fontSize: number | null;
}

export interface PdfTextExtractResult {
  pageCount: number;
  items: PageTextItem[];
  /** Set when the PDF appears to be a scanned (image-only) document. */
  appearsScanned: boolean;
  /** When true the PDF.js layer raised low-level warnings. */
  warnings: string[];
}

/**
 * Indirection point for the PDF.js module. The offscreen-document caller
 * passes in a properly-initialized pdfjs object (with worker configured);
 * Node tests pass in the legacy build. Keeping this injected lets the
 * core stay environment-agnostic.
 */
export interface PdfJsLike {
  // getDocument returns a loading task whose `.promise` resolves to a doc.
  getDocument: (params: unknown) => { promise: Promise<PdfDocLike> };
}

export interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<PdfPageLike>;
  cleanup?: () => unknown;
  destroy?: () => Promise<void> | void;
}

export interface PdfPageLike {
  getTextContent(): Promise<{ items: PdfTextContentItem[] }>;
  getViewport(opts: { scale: number }): { width: number; height: number };
}

export interface PdfTextContentItem {
  /**
   * Present on TextItem. Absent on TextMarkedContent (structural markers
   * returned by getTextContent for marked content sections).
   */
  str?: string;
  /** [a b c d e f] — last two are x, y. May be absent on marked content. */
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

export async function extractPdfTextItems(
  pdfjs: PdfJsLike,
  buffer: ArrayBuffer,
): Promise<PdfTextExtractResult> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, disableFontFace: true, isEvalSupported: false });
  const doc = await loadingTask.promise;
  const items: PageTextItem[] = [];
  const warnings: string[] = [];
  let nonEmptyPages = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    if (content.items.length > 0) nonEmptyPages++;
    for (const it of content.items) {
      // PDF.js getTextContent can return TextMarkedContent items that
      // have no .str (they're structural markers). Skip them.
      if (typeof it.str !== "string") continue;
      // The transform array is usually [a b c d e f]; default missing
      // axes to 0 rather than throwing on malformed items.
      const t = it.transform ?? [];
      const x = t[4] ?? 0;
      const y = t[5] ?? 0;
      const fontSize = Math.abs(t[0] ?? 0);
      items.push({
        page: p - 1,
        x,
        y,
        width: it.width ?? 0,
        height: it.height ?? 0,
        text: it.str,
        fontName: it.fontName ?? null,
        fontSize: fontSize || null,
      });
    }
  }

  await doc.destroy?.();

  // Heuristic: if more than half the pages had no text content, treat as scanned.
  const appearsScanned = doc.numPages > 0 && nonEmptyPages / doc.numPages < 0.5;
  if (appearsScanned) {
    // Reports, does not advise. The user decides whether to use the
    // opt-in OCR path.
    warnings.push(
      "This PDF appears to be a scanned image. Text extraction may be incomplete; OCR is required to read it.",
    );
  }

  return { pageCount: doc.numPages, items, appearsScanned, warnings };
}

// -------- Anchors-over-items utility --------
// Detect anchors at the text-item level. Used when reconstructing lines so
// anchor positions can be propagated to the block layer.
export function attachItemAnchors(
  _items: ReadonlyArray<PageTextItem>,
  _detect: (text: string) => Anchor[],
): void {
  // Reserved for Phase 2.3 (line reconstruction). Currently unused; anchors
  // are computed in normalize.ts after blocks are assembled.
}
