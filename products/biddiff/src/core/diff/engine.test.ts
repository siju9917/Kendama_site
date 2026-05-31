import { describe, it, expect } from "vitest";
import { DiffEngine } from "./engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { loadAllPairs } from "../../../test/corpus/harness.js";
import { enrichStructuredDocument } from "../extract/normalize.js";

describe("DiffEngine — warning propagation", () => {
  it("merges per-document extractionWarnings into result.warnings", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId.startsWith("null-"))!;
    const current = enrichStructuredDocument({
      ...pair.current,
      metadata: {
        ...pair.current.metadata,
        extractionWarnings: ["This PDF appears to be a scanned image."],
      },
    });
    const prior = enrichStructuredDocument(pair.prior);
    const result = engine.diff(current, prior);
    expect(result.warnings).toContain("This PDF appears to be a scanned image.");
  });

  it("does not duplicate identical warnings from both sides", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId.startsWith("null-"))!;
    const w = "Both sides scanned.";
    const current = enrichStructuredDocument({
      ...pair.current,
      metadata: { ...pair.current.metadata, extractionWarnings: [w] },
    });
    const prior = enrichStructuredDocument({
      ...pair.prior,
      metadata: { ...pair.prior.metadata, extractionWarnings: [w] },
    });
    const result = engine.diff(current, prior);
    expect(result.warnings.filter((x) => x === w).length).toBe(1);
  });
});

describe("DiffEngine — null pairs", () => {
  it("identical documents produce zero changes", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    for (const b of loadAllPairs().filter((p) => p.pairId.startsWith("null-"))) {
      const enrichedCurrent = enrichStructuredDocument(b.current);
      const enrichedPrior = enrichStructuredDocument(b.prior);
      const result = engine.diff(enrichedCurrent, enrichedPrior);
      expect(result.changes.length, `pair ${b.pairId} should be a no-op`).toBe(0);
      expect(result.criticalCount).toBe(0);
    }
  });
});

describe("DiffEngine — determinism", () => {
  it("repeated runs produce byte-identical output (modulo generatedAt)", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId === "it-svc-001-due-date-shift")!;
    const enrichedCurrent = enrichStructuredDocument(pair.current);
    const enrichedPrior = enrichStructuredDocument(pair.prior);
    const r1 = engine.diff(enrichedCurrent, enrichedPrior);
    const r2 = engine.diff(enrichedCurrent, enrichedPrior);
    // generatedAt is "" in both since caller sets it.
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

describe("DiffEngine — single-edit pairs detect their change", () => {
  it("due-date shift produces exactly one CRITICAL DATES_DEADLINES change", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId === "it-svc-001-due-date-shift")!;
    const ec = enrichStructuredDocument(pair.current);
    const ep = enrichStructuredDocument(pair.prior);
    const result = engine.diff(ec, ep);
    const critical = result.changes.filter((c) => c.severity === "CRITICAL");
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(
      critical.some((c) => c.category === "DATES_DEADLINES" && (c.afterText ?? "").includes("2026-08-29")),
    ).toBe(true);
  });

  it("clause add produces a CRITICAL CLAUSES INSERT", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId === "it-svc-003-clause-add")!;
    const ec = enrichStructuredDocument(pair.current);
    const ep = enrichStructuredDocument(pair.prior);
    const result = engine.diff(ec, ep);
    const matching = result.changes.filter(
      (c) =>
        c.severity === "CRITICAL" &&
        c.category === "CLAUSES" &&
        c.changeType === "INSERT" &&
        (c.afterText ?? "").includes("52.204-25"),
    );
    expect(matching.length).toBe(1);
    expect(matching[0].clauseInfo?.title).toBeTruthy();
  });

  it("page-limit change yields a CRITICAL SUBMISSION_INSTRUCTIONS modify", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId === "it-svc-002-page-limit")!;
    const ec = enrichStructuredDocument(pair.current);
    const ep = enrichStructuredDocument(pair.prior);
    const result = engine.diff(ec, ep);
    const match = result.changes.filter(
      (c) =>
        c.severity === "CRITICAL" &&
        c.category === "SUBMISSION_INSTRUCTIONS" &&
        (c.afterText ?? "").includes("25 pages"),
    );
    expect(match.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DiffEngine — within-section change order follows document position", () => {
  it("does not cluster changes by changeType within a single section", () => {
    // Regression: an earlier sort key included changeType as a tiebreaker,
    // so DELETE/INSERT/MODIFY/MOVE clustered alphabetically — an INSERT at
    // block 5 would appear before a MODIFY at block 2.
    const engine = new DiffEngine(new LocalClauseClient());
    const pair = loadAllPairs().find((b) => b.pairId === "stress-001-multi-six-edits")!;
    const ec = enrichStructuredDocument(pair.current);
    const ep = enrichStructuredDocument(pair.prior);
    const result = engine.diff(ec, ep);
    // Group changes by section and ensure ordinals are monotonic within
    // each group when more than one change shares a section.
    const bySection = new Map<string, number[]>();
    for (const c of result.changes) {
      // We can't recover the underlying block ordinal from a Change, but
      // the locationHint encodes "<heading> — block N+1". Parse it.
      const m = c.locationHint.match(/block\s+(\d+)/);
      if (!m) continue;
      const key = `${c.ucfLetter ?? "?"}|${c.sectionHeading}`;
      const arr = bySection.get(key) ?? [];
      arr.push(parseInt(m[1], 10));
      bySection.set(key, arr);
    }
    for (const [key, ords] of bySection) {
      for (let i = 1; i < ords.length; i++) {
        expect(
          ords[i] >= ords[i - 1],
          `${key}: ord ${ords[i - 1]} then ${ords[i]} is out of document order`,
        ).toBe(true);
      }
    }
  });
});

describe("DiffEngine — summary counts are consistent with the change list", () => {
  // The Summary UI shows criticalCount and a per-category breakdown. If those
  // numbers don't match the actual changes, the user is misled about what
  // changed. Assert the invariants across the whole corpus (one test, looping
  // over every pair so a failure names the offending pair).
  it("category counts sum to the total and criticalCount matches, for every corpus pair", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    for (const pair of loadAllPairs()) {
      const r = engine.diff(
        enrichStructuredDocument(pair.current),
        enrichStructuredDocument(pair.prior),
      );
      const categorySum = Object.values(r.changeCountByCategory).reduce((a, b) => a + b, 0);
      expect(categorySum, `${pair.pairId}: category counts must sum to changes.length`).toBe(
        r.changes.length,
      );
      const actualCritical = r.changes.filter((c) => c.severity === "CRITICAL").length;
      expect(r.criticalCount, `${pair.pairId}: criticalCount must match CRITICAL changes`).toBe(
        actualCritical,
      );
      expect(r.criticalCount).toBeLessThanOrEqual(r.changes.length);
    }
  });
});
