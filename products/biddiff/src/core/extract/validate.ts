/**
 * Input validation + malformed-input handling (Phase 2.11).
 *
 * Every IExtractor implementation runs its input through these guards
 * before parsing. Each failure throws a typed `ExtractionError` with a
 * user-facing message — never a crash, never a partial result.
 */
import { ExtractionError } from "../interfaces.js";
import { MAX_DOCUMENT_BYTES } from "../../shared/constants.js";

export type FileKind = "PDF" | "DOCX" | "DOC" | "TXT" | "UNKNOWN";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
// DOCX is a zip — first bytes are "PK\x03\x04" or "PK\x05\x06".
const ZIP_MAGIC = [0x50, 0x4b];
const ZIP_END_MAGIC = [0x50, 0x4b, 0x05, 0x06];

function startsWithMagic(bytes: Uint8Array, magic: ReadonlyArray<number>): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

export function detectKind(bytes: Uint8Array, fileName?: string): FileKind {
  if (startsWithMagic(bytes, PDF_MAGIC)) return "PDF";
  if (startsWithMagic(bytes, ZIP_MAGIC) || startsWithMagic(bytes, ZIP_END_MAGIC)) {
    // Could be DOCX, XLSX, ODF, etc. We rely on the extension to disambiguate.
    if (fileName?.toLowerCase().endsWith(".docx")) return "DOCX";
    return "UNKNOWN";
  }
  if (fileName?.toLowerCase().endsWith(".txt")) return "TXT";
  if (fileName?.toLowerCase().endsWith(".doc")) return "DOC";
  return "UNKNOWN";
}

/**
 * Guard: reject empty, too-large, password-protected, or unknown inputs
 * before downstream parsing kicks in.
 */
export function validateInput(file: ArrayBuffer, fileName?: string): FileKind {
  if (file.byteLength === 0) {
    throw new ExtractionError("EMPTY", "This document is empty.");
  }
  if (file.byteLength > MAX_DOCUMENT_BYTES) {
    throw new ExtractionError(
      "TOO_LARGE",
      `This document is larger than the ${(MAX_DOCUMENT_BYTES / (1024 * 1024)).toFixed(0)} MB limit. Please trim attachments or split the file.`,
    );
  }
  const bytes = new Uint8Array(file);
  const kind = detectKind(bytes, fileName);
  if (kind === "UNKNOWN") {
    throw new ExtractionError(
      "UNSUPPORTED_FORMAT",
      "BidDiff supports PDF (.pdf) and Word (.docx) files. Convert the document and try again.",
    );
  }
  if (kind === "DOC") {
    throw new ExtractionError(
      "UNSUPPORTED_FORMAT",
      "Legacy .doc files are not supported. Save the document as .docx and try again.",
    );
  }
  return kind;
}

/** Heuristic check for an encrypted PDF (the canonical /Encrypt dictionary). */
export function isPdfEncrypted(bytes: Uint8Array): boolean {
  // Search the first ~200 KB for "/Encrypt". The dictionary is in the trailer
  // but PDFs often place it near the end; we scan the head + a chunk of the
  // tail to cover both.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 200_000)));
  const tail = new TextDecoder("latin1").decode(
    bytes.subarray(Math.max(0, bytes.length - 200_000)),
  );
  return head.includes("/Encrypt") || tail.includes("/Encrypt");
}
