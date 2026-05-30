// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { isAllowedDownloadUrl } from "./FilePickerWithSam.js";

describe("isAllowedDownloadUrl — attachment fetch scheme allowlist", () => {
  it("allows https", () => {
    expect(isAllowedDownloadUrl("https://sam.gov/api/download/abc.pdf")).toBe(true);
    expect(isAllowedDownloadUrl("https://falextracts.s3.amazonaws.com/x.docx?token=1")).toBe(true);
  });
  it("rejects non-https schemes that must never be fetched", () => {
    expect(isAllowedDownloadUrl("http://sam.gov/x.pdf")).toBe(false);
    expect(isAllowedDownloadUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedDownloadUrl("data:application/pdf;base64,AAAA")).toBe(false);
    expect(isAllowedDownloadUrl("blob:https://sam.gov/uuid")).toBe(false);
    expect(isAllowedDownloadUrl("javascript:alert(1)")).toBe(false);
  });
  it("rejects malformed URLs", () => {
    expect(isAllowedDownloadUrl("not a url")).toBe(false);
    expect(isAllowedDownloadUrl("")).toBe(false);
  });
});
