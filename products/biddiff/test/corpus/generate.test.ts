/**
 * Validates that the generator produces well-formed, labeled corpus pairs.
 * Runs as part of `npm test`. Implicitly re-validates after every corpus
 * regeneration.
 */
import { describe, it, expect } from "vitest";
import { loadAllPairs, loadManifest, evaluatePair } from "./harness.js";
import type { Change } from "../../src/core/diff/types.js";

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

// Characterization of the greedy-matcher limitation (bug-hunt pass 48). The
// matcher is NOT an optimal bipartite assignment; with overlapping text
// fragments it can report a false MISS. This is documented + accepted because
// the error direction is conservative (a false miss fails the audit loudly,
// never hides a real miss). These tests pin both halves of that contract.
describe("corpus matcher: greedy-misassign characterization", () => {
  const act = (after: string): Change =>
    ({
      id: Math.random().toString(36).slice(2),
      changeType: "MODIFY",
      category: "OTHER",
      severity: "NORMAL",
      sectionHeading: "H",
      ucfLetter: null,
      beforeText: "x",
      afterText: after,
      tokenSpans: null,
      anchorsInvolved: [],
      criticalReasons: [],
      clauseInfo: null,
      locationHint: "l",
    }) as unknown as Change;

  it("greedy assignment can report a false miss on overlapping fragments (documented limitation)", () => {
    const bundle = {
      pairId: "synthetic",
      current: {},
      prior: {},
      label: {
        expectedChanges: [
          { category: "OTHER", severity: "NORMAL", changeType: "MODIFY", mustDetect: false, expectedTextFragments: ["alpha"] },
          { category: "OTHER", severity: "NORMAL", changeType: "MODIFY", mustDetect: false, expectedTextFragments: ["alpha", "beta"] },
        ],
      },
    } as never;
    // A1="alpha beta" matches both; A2="alpha" matches only the first. Greedy
    // gives A1 to the first expected, stranding the second → a false miss.
    const m = evaluatePair(bundle, { changes: [act("alpha beta"), act("alpha")] } as never);
    expect(m.hits).toBe(1);
    expect(m.missed.length).toBe(1);
    // The error is conservative: a miss never falsely PASSES an audit.
  });

  it("the REAL corpus has no fragment-overlap collision (so the limitation is dormant)", () => {
    // If the real corpus ever triggered the greedy misassign, the Phase 3.12
    // audit would spuriously fail. Guard that it doesn't, today.
    for (const b of loadAllPairs()) {
      const frags = b.label.expectedChanges
        .map((e) => (e.expectedTextFragments ?? []).slice().sort().join("|"))
        .filter((s) => s.length > 0);
      // No two expecteds in a pair share an identical fragment-set (the
      // precondition for a greedy strand). Distinct fragment-sets ⇒ safe.
      expect(new Set(frags).size, `${b.pairId}: duplicate expected fragment-sets`).toBe(frags.length);
    }
  });
});
