import { describe, it, expect } from "vitest";
import { contentHash, fnv1a32, shortHash } from "./hash.js";

describe("hash", () => {
  it("is deterministic for the same input", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
    expect(contentHash("a quick brown fox")).toBe(contentHash("a quick brown fox"));
  });

  it("differs for different inputs", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
    expect(contentHash("Section L. Page limit 30")).not.toBe(
      contentHash("Section L. Page limit 31"),
    );
  });

  it("produces fixed-width hex", () => {
    expect(contentHash("anything")).toMatch(/^[0-9a-f]{16}$/);
    expect(shortHash("x")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles empty input", () => {
    expect(contentHash("")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles unicode", () => {
    expect(contentHash("café — résumé")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("uses two INDEPENDENT halves (the second pass is salted)", () => {
    // Regression: the second pass once re-hashed the identical input,
    // so both 32-bit halves were equal and the hash delivered only
    // 32-bit collision resistance despite its 16-hex width.
    for (const s of ["hello world", "Section L", "a quick brown fox", "café"]) {
      const h = contentHash(s);
      expect(h.slice(0, 8), `halves should differ for ${JSON.stringify(s)}`).not.toBe(
        h.slice(8),
      );
    }
  });
});
