/**
 * PdfExtractor — IExtractor implementation for PDFs.
 *
 * The constructor takes a PdfJsLike module so the extension's offscreen
 * document and Node tests can inject their own configured PDF.js instance.
 */
import { ExtractionError, type IExtractor } from "../../interfaces.js";
import type { StructuredDocument } from "../../model/types.js";
import { buildDocument, emptyMetadata } from "../../model/build.js";
import { shortHash } from "../../../shared/hash.js";
import { isPdfEncrypted, validateInput } from "../validate.js";
import { extractPdfTextItems, type ExtractOptions, type PdfJsLike } from "./extract.js";
import { itemsToRawLines } from "./reconstruct.js";
import { sectionsFromRawLines } from "../sections/assemble.js";
import { enrichStructuredDocument, computeOverallConfidence } from "../normalize.js";
import { computeModalFontSize } from "../sections/headings.js";

export class PdfExtractor implements IExtractor {
  constructor(
    private readonly pdfjs: PdfJsLike,
    private readonly opts: ExtractOptions = {},
  ) {}

  async canHandle(file: ArrayBuffer): Promise<boolean> {
    try {
      const kind = validateInput(file);
      return kind === "PDF";
    } catch {
      return false;
    }
  }

  async extract(file: ArrayBuffer, fileName: string): Promise<StructuredDocument> {
    validateInput(file, fileName); // throws typed ExtractionError
    const bytes = new Uint8Array(file);
    if (isPdfEncrypted(bytes)) {
      throw new ExtractionError(
        "ENCRYPTED",
        "This PDF is password-protected. Save an unprotected copy and try again.",
      );
    }

    let result;
    try {
      result = await extractPdfTextItems(this.pdfjs, file, this.opts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Common PDF.js failures: corrupt, missing xref, invalid trailer.
      if (/password|encrypted/i.test(msg)) {
        throw new ExtractionError(
          "ENCRYPTED",
          "This PDF is password-protected. Save an unprotected copy and try again.",
          msg,
        );
      }
      throw new ExtractionError("CORRUPT", "This PDF could not be read — it may be damaged.", msg);
    }

    const rawLines = itemsToRawLines(result.items);
    const modalBodyFontSize = computeModalFontSize(rawLines);
    const sections = sectionsFromRawLines(rawLines, { modalBodyFontSize });
    const allBlocks = sections.flatMap((s) => s.blocks);
    const overallExtractionConfidence = result.appearsScanned ? 0.4 : computeOverallConfidence(allBlocks);

    const meta = emptyMetadata(fileName, file);
    const baseDoc: StructuredDocument = buildDocument({
      metadata: {
        ...meta,
        sourceFileHash: shortHash(`${fileName}:${file.byteLength}:pdf`),
        pageCount: result.pageCount,
        overallExtractionConfidence,
        extractionWarnings: [...result.warnings],
      },
      sections,
    });

    return enrichStructuredDocument(baseDoc);
  }
}
