/**
 * DocxExtractor — IExtractor for .docx files.
 *
 * Unzips the .docx (JSZip) and walks `word/document.xml` directly with a
 * tag-aware regex. The structural detail we need — paragraph styles
 * (Heading1, Heading2…), list markers, and table rows — survives this
 * lightweight pass, and we avoid bundling a heavier DOCX library.
 */
import JSZip from "jszip";
import { ExtractionError, type IExtractor } from "../../interfaces.js";
import type { StructuredDocument } from "../../model/types.js";
import { buildDocument, emptyMetadata } from "../../model/build.js";
import { shortHash } from "../../../shared/hash.js";
import { validateInput } from "../validate.js";
import { sectionsFromRawLines } from "../sections/assemble.js";
import { enrichStructuredDocument, computeOverallConfidence } from "../normalize.js";
import { computeModalFontSize } from "../sections/headings.js";
import type { RawLine } from "../sections/headings.js";

interface DocxParagraph {
  text: string;
  styleName: string | null;
  isList: boolean;
}

// Compound File Binary header — used by legacy .doc and by encrypted
// .docx envelopes. If we see this, the file isn't a regular zip-based
// .docx and JSZip will fail to open it.
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWithCfbMagic(bytes: Uint8Array): boolean {
  if (bytes.length < CFB_MAGIC.length) return false;
  for (let i = 0; i < CFB_MAGIC.length; i++) {
    if (bytes[i] !== CFB_MAGIC[i]) return false;
  }
  return true;
}

async function unzipDocxToParagraphs(file: ArrayBuffer): Promise<DocxParagraph[]> {
  // Detect encrypted .docx (delivered as a CFB envelope) before letting
  // JSZip throw a generic 'could not be opened' error.
  if (startsWithCfbMagic(new Uint8Array(file))) {
    throw new ExtractionError(
      "ENCRYPTED",
      "This Word document is password-protected. Save an unprotected copy and try again.",
    );
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e) {
    throw new ExtractionError(
      "CORRUPT",
      "This Word document could not be opened — it may be damaged.",
      e instanceof Error ? e.message : String(e),
    );
  }
  // Encrypted .docx (password-protected) is delivered as a Compound File
  // Binary containing an `EncryptedPackage` stream. If JSZip parses that
  // (rare — usually it fails), the entry signature will be there
  // instead of `word/document.xml`. Surface it as ENCRYPTED rather than
  // CORRUPT so the user gets the right next step.
  if (zip.file(/EncryptedPackage/i).length > 0) {
    throw new ExtractionError(
      "ENCRYPTED",
      "This Word document is password-protected. Save an unprotected copy and try again.",
    );
  }
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    throw new ExtractionError(
      "CORRUPT",
      "This file does not look like a valid Word document.",
    );
  }
  const xml = await docXml.async("string");
  return parseDocumentXml(xml);
}

/**
 * Tiny tag-aware XML walker — does not require a full XML parser.
 *
 * Strategy:
 *   - Walk the body in document order.
 *   - For each `<w:p>` that is NOT inside a `<w:tbl>`, emit a paragraph.
 *   - For each `<w:tbl>`, emit one synthesized paragraph PER ROW with
 *     the cell texts joined by " | " (matches the canonical TABLE_ROW
 *     format the synthetic corpus uses). The paragraph's styleName is
 *     "TableRow" so downstream code can route it to BlockType=TABLE_ROW.
 *
 * Known limitation: nested tables (a `<w:tbl>` inside a `<w:tc>` cell)
 * parse approximately — the outer-row regex grabs through the FIRST
 * closing `</w:tbl>` and may miss outer-table content past the nested
 * table. Real federal solicitations virtually never use nested tables;
 * the rare case where they do, the inner content still surfaces (as
 * paragraphs) so anchors and changes are still detected — but the
 * outer/inner row association may be lost. If real-world cases require
 * tighter handling, swap to a stack-based parser or DOMParser.
 */
export function parseDocumentXml(xml: string): DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];
  // Match either a <w:tbl>...</w:tbl> OR a <w:p>...</w:p> as the outermost
  // top-level element. We iterate by scanning forward.
  const re = /<w:(tbl|p)\b[^>]*>([\s\S]*?)<\/w:\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] === "p") {
      const body = m[2];
      const styleMatch = body.match(/<w:pStyle\s+w:val="([^"]+)"/);
      const isList = /<w:numPr\b/.test(body);
      const text = extractRunText(body);
      paragraphs.push({
        text,
        styleName: styleMatch ? styleMatch[1] : null,
        isList,
      });
    } else {
      // Table: emit one paragraph per row.
      const rowRe = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowRe.exec(m[2])) !== null) {
        const cells: string[] = [];
        const cellRe = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
          cells.push(extractRunText(cellMatch[1]));
        }
        // If no cells, fall back to any text inside the row.
        const text = cells.length > 0 ? cells.join(" | ") : extractRunText(rowMatch[1]);
        if (text.trim().length > 0) {
          paragraphs.push({ text, styleName: "TableRow", isList: false });
        }
      }
    }
  }
  return paragraphs;
}

function extractRunText(body: string): string {
  const parts: string[] = [];
  const textRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let t: RegExpExecArray | null;
  while ((t = textRe.exec(body)) !== null) {
    parts.push(decodeXmlEntities(t[1]));
  }
  return parts.join("").trim();
}

function decodeXmlEntities(s: string): string {
  return s
    // Numeric entities — produced by some non-Word DOCX writers
    // (Pandoc, etc.). Decode before the named-entity pass so a
    // payload like "&amp;#39;" doesn't double-decode.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16) || 0x20),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10) || 0x20))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // &amp; last so we don't double-decode the entities above.
    .replace(/&amp;/g, "&");
}

function paragraphsToRawLines(paragraphs: ReadonlyArray<DocxParagraph>): RawLine[] {
  return paragraphs
    .filter((p) => p.text.length > 0)
    .map((p) => {
      const isHeading = /^heading/i.test(p.styleName ?? "");
      const headingLevel = isHeading ? parseInt((p.styleName ?? "").replace(/heading/i, ""), 10) : 0;
      // Synthesize a font size: H1 = 18, H2 = 16, H3 = 14, body = 11.
      const fontSize = headingLevel === 1 ? 18 : headingLevel === 2 ? 16 : headingLevel === 3 ? 14 : 11;
      const bold = isHeading;
      let lineText = p.text;
      if (p.isList) lineText = `- ${lineText}`;
      // Table rows are already pipe-joined; we don't prefix them.
      return { text: lineText, fontSize, bold };
    });
}

export class DocxExtractor implements IExtractor {
  async canHandle(file: ArrayBuffer): Promise<boolean> {
    try {
      return validateInput(file, "x.docx") === "DOCX";
    } catch {
      return false;
    }
  }

  async extract(file: ArrayBuffer, fileName: string): Promise<StructuredDocument> {
    validateInput(file, fileName);
    const paragraphs = await unzipDocxToParagraphs(file);
    if (paragraphs.length === 0 || paragraphs.every((p) => p.text.length === 0)) {
      throw new ExtractionError(
        "EMPTY",
        "This Word document contains no readable text.",
      );
    }
    const rawLines = paragraphsToRawLines(paragraphs);
    const modalBodyFontSize = computeModalFontSize(rawLines);
    const sections = sectionsFromRawLines(rawLines, { modalBodyFontSize });
    const allBlocks = sections.flatMap((s) => s.blocks);
    const overallExtractionConfidence = computeOverallConfidence(allBlocks);

    const meta = emptyMetadata(fileName, file);
    const baseDoc: StructuredDocument = buildDocument({
      metadata: {
        ...meta,
        sourceFileHash: shortHash(`${fileName}:${file.byteLength}:docx`),
        pageCount: Math.max(1, Math.ceil(paragraphs.length / 25)),
        overallExtractionConfidence,
        extractionWarnings: [],
      },
      sections,
    });
    return enrichStructuredDocument(baseDoc);
  }
}
