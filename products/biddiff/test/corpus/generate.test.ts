/**
 * Validates that the generator produces well-formed, labeled corpus pairs.
 * Runs as part of `npm test`. Implicitly re-validates after every corpus
 * regeneration.
 */
import { describe, it, expect } from "vitest";
import { loadAllPairs, loadManifest } from "./harness.js";

describe("corpus generator", () => {
  it("emits a manifest with at least 40 pairs", () => {
    const m = loadManifest();
    expect(m.pairs.length).toBeGreaterThanOrEqual(40);
  });

  it("manifest entries reference real files", () => {
    const bundles = loadAllPairs();
    for (const b of bundles) {
      expect(b.prior.sections.length).toBeGreaterThan(0);
      expect(b.current.sections.length).toBeGreaterThan(0);
      expect(b.label.pairId).toBe(b.pairId);
    }
  });

  it("every UCF letter A-M appears in every base template", () => {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
    for (const b of loadAllPairs()) {
      const present = new Set(b.prior.sections.map((s) => s.ucfLetter));
      for (const l of letters) {
        expect(present.has(l)).toBe(true);
      }
    }
  });

  it("every NON-null pair has at least one expected change", () => {
    for (const b of loadAllPairs()) {
      if (b.pairId.startsWith("null-")) continue;
      expect(b.label.expectedChanges.length).toBeGreaterThan(0);
    }
  });

  // Floor-integrity invariant (bug-hunt pass 47): the corpus audit's
  // "0 critical missed" hard floor only counts CRITICAL expecteds whose
  // `mustDetect` is truthy (harness.ts evaluatePair). If a future CRITICAL
  // expected were added with mustDetect:false, it would silently escape the
  // floor — weakening the headline guarantee. Pin that EVERY critical
  // expected is must-detect so the floor cannot be quietly hollowed out.
  it("every CRITICAL expected change is mustDetect (the floor can't be silently weakened)", () => {
    for (const b of loadAllPairs()) {
      for (const e of b.label.expectedChanges) {
        if (e.severity === "CRITICAL") {
          expect(e.mustDetect, `${b.pairId}: a CRITICAL expected must be mustDetect`).toBe(true);
        }
      }
    }
  });

  it("null pairs have zero expected changes and identical prior/current sections (by block IDs)", () => {
    const nullPairs = loadAllPairs().filter((b) => b.pairId.startsWith("null-"));
    expect(nullPairs.length).toBeGreaterThanOrEqual(2);
    for (const b of nullPairs) {
      expect(b.label.expectedChanges.length).toBe(0);
      // Same number of sections.
      expect(b.current.sections.length).toBe(b.prior.sections.length);
      // Concatenated block IDs match.
      const priorIds = b.prior.sections.flatMap((s) => s.blocks.map((bl) => bl.id)).join(",");
      const currentIds = b.current.sections.flatMap((s) => s.blocks.map((bl) => bl.id)).join(",");
      expect(currentIds).toBe(priorIds);
    }
  });

  it("CRITICAL expected changes have mustDetect=true", () => {
    for (const b of loadAllPairs()) {
      for (const e of b.label.expectedChanges) {
        if (e.severity === "CRITICAL") expect(e.mustDetect).toBe(true);
      }
    }
  });

  it("every expected category appears at least once across the corpus", () => {
    const seen = new Set<string>();
    for (const b of loadAllPairs()) {
      for (const e of b.label.expectedChanges) seen.add(e.category);
    }
    for (const cat of [
      "SCOPE_SOW",
      "EVALUATION_CRITERIA",
      "DATES_DEADLINES",
      "CLAUSES",
      "SUBMISSION_INSTRUCTIONS",
      "PRICING_CLINS",
      "ATTACHMENTS",
    ]) {
      expect(seen.has(cat)).toBe(true);
    }
  });

  it("every change type appears at least once across the corpus", () => {
    const seen = new Set<string>();
    for (const b of loadAllPairs()) {
      for (const e of b.label.expectedChanges) seen.add(e.changeType);
    }
    for (const t of ["INSERT", "DELETE", "MODIFY"]) {
      expect(seen.has(t)).toBe(true);
    }
  });

  it("anchors and category enums are used consistently", () => {
    const validCategories = new Set([
      "SCOPE_SOW",
      "EVALUATION_CRITERIA",
      "DATES_DEADLINES",
      "CLAUSES",
      "SUBMISSION_INSTRUCTIONS",
      "PRICING_CLINS",
      "ATTACHMENTS",
      "OTHER",
    ]);
    for (const b of loadAllPairs()) {
      for (const e of b.label.expectedChanges) {
        expect(validCategories.has(e.category)).toBe(true);
      }
    }
  });
});
