import { describe, it, expect } from "vitest";
import { detectKind, isPdfEncrypted, validateInput, extractSolicitationId } from "./validate.js";
import { ExtractionError } from "../interfaces.js";

const bytes = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;
const pdfHeader = (): ArrayBuffer => bytes("%PDF-1.7\n... rest of file...");
const docxHeader = (): ArrayBuffer => bytes("PK\x03\x04random docx-ish bytes here");

describe("detectKind", () => {
  it("detects PDF by magic", () => {
    expect(detectKind(new Uint8Array(pdfHeader()), "x.pdf")).toBe("PDF");
  });
  it("detects DOCX by magic+extension", () => {
    expect(detectKind(new Uint8Array(docxHeader()), "x.docx")).toBe("DOCX");
  });
  it("returns UNKNOWN for ZIP without .docx extension", () => {
    expect(detectKind(new Uint8Array(docxHeader()), "x.zip")).toBe("UNKNOWN");
  });
  it("handles too-short buffers without throwing", () => {
    expect(detectKind(new Uint8Array(2), "x")).toBe("UNKNOWN");
  });
});

describe("validateInput", () => {
  it("rejects empty input with EMPTY", () => {
    try {
      validateInput(new ArrayBuffer(0));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtractionError);
      expect((e as ExtractionError).code).toBe("EMPTY");
    }
  });
  it("rejects oversized input with TOO_LARGE", () => {
    // 60 MB > 50 MB cap.
    const buf = new ArrayBuffer(60 * 1024 * 1024);
    try {
      validateInput(buf, "huge.pdf");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ExtractionError).code).toBe("TOO_LARGE");
    }
  });
  it("rejects unknown formats with UNSUPPORTED_FORMAT", () => {
    try {
      validateInput(bytes("not a real file"), "weird.bin");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ExtractionError).code).toBe("UNSUPPORTED_FORMAT");
    }
  });
  it("rejects legacy .doc with UNSUPPORTED_FORMAT and actionable conversion hint", () => {
    try {
      validateInput(bytes("anything"), "legacy.doc");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ExtractionError).code).toBe("UNSUPPORTED_FORMAT");
      // Message must include a concrete conversion step (Word Save As)
      expect((e as ExtractionError).message).toMatch(/Save.*as.*\.docx|\.docx.*Save/i);
    }
  });
  it("rejects .txt cleanly instead of routing it to the DOCX extractor", () => {
    try {
      validateInput(bytes("just some plain text, not a zip or pdf"), "notes.txt");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtractionError);
      expect((e as ExtractionError).code).toBe("UNSUPPORTED_FORMAT");
      expect((e as ExtractionError).message).toMatch(/\.txt|plain-text/i);
    }
  });
  it("accepts PDF magic bytes", () => {
    expect(validateInput(pdfHeader(), "x.pdf")).toBe("PDF");
  });
  it("accepts DOCX magic + extension", () => {
    expect(validateInput(docxHeader(), "x.docx")).toBe("DOCX");
  });
});

describe("extractSolicitationId", () => {
  it("extracts a solicitation number after 'Solicitation No.'", () => {
    expect(extractSolicitationId("Solicitation No. W912TP-26-R-0001\nPage 1")).toBe("W912TP-26-R-0001");
  });
  it("extracts after 'Solicitation Number:'", () => {
    expect(extractSolicitationId("Solicitation Number: FA8701-25-R-0042")).toBe("FA8701-25-R-0042");
  });
  it("extracts after RFP No.", () => {
    expect(extractSolicitationId("RFP No. N00030-26-R-0001")).toBe("N00030-26-R-0001");
  });
  it("extracts after RFQ No.", () => {
    expect(extractSolicitationId("RFQ No. W912TP-26-Q-0001")).toBe("W912TP-26-Q-0001");
  });
  it("normalizes internal whitespace (W912TP -26-R-0001 → W912TP-26-R-0001)", () => {
    expect(extractSolicitationId("Solicitation No. W912TP -26-R-0001")).toBe("W912TP-26-R-0001");
  });
  it("returns null when no solicitation label is present", () => {
    expect(extractSolicitationId("This is a plain document with no solicitation number.")).toBeNull();
  });
  it("returns null for an empty string", () => {
    expect(extractSolicitationId("")).toBeNull();
  });
  it("does not fire on bare alphanumeric strings without the label", () => {
    expect(extractSolicitationId("Contract number: W912TP-26-R-0001")).toBeNull();
  });
  it("only scans the first 2000 characters (ID buried deeper is ignored)", () => {
    const prefix = "A".repeat(2001);
    expect(extractSolicitationId(`${prefix} Solicitation No. W912TP-26-R-9999`)).toBeNull();
  });
});

describe("isPdfEncrypted", () => {
  it("flags PDFs with /Encrypt in their trailer", () => {
    const data = "%PDF-1.7\n... 200 KB junk ... /Encrypt <<...>> ... %%EOF";
    expect(isPdfEncrypted(new Uint8Array(bytes(data)))).toBe(true);
  });
  it("does not flag PDFs without /Encrypt", () => {
    expect(isPdfEncrypted(new Uint8Array(bytes("%PDF-1.7\n... clean content ... %%EOF")))).toBe(
      false,
    );
  });
});
