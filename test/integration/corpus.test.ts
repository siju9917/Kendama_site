/**
 * Phase 3.12 — the miss-rate audit.
 *
 * Runs the diff engine against EVERY pair in the corpus, asserts the spec's
 * hard gates:
 *   - zero missed CRITICAL changes
 *   - overall recall ≥ 98%
 *   - zero false positives on null/reformatting pairs
 *   - deterministic output
 */
import { describe, expect, it } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import {
  formatMetrics,
  loadAllPairs,
  runCorpusAgainstEngine,
} from "../corpus/harness.js";
import type { DiffResult } from "../../src/core/diff/types.js";
import type { IDiffEngine } from "../../src/core/interfaces.js";
import type { StructuredDocument } from "../../src/core/model/types.js";

/** Wraps the diff engine to apply enrichStructuredDocument before diff. */
function makeEnrichingEngine(): IDiffEngine {
  const inner = new DiffEngine(new LocalClauseClient());
  return {
    diff(current: StructuredDocument, prior: StructuredDocument): DiffResult {
      return inner.diff(enrichStructuredDocument(current), enrichStructuredDocument(prior));
    },
  };
}

describe("Corpus miss-rate audit (Phase 3.12)", () => {
  it("zero missed CRITICAL changes; recall >= 98%; zero false positives on null pairs", () => {
    const engine = makeEnrichingEngine();
    const metrics = runCorpusAgainstEngine(engine);
    // Print metrics so a failure shows them on the console.
    console.log("\n" + formatMetrics(metrics) + "\n");

    expect(metrics.criticalMissed, "zero missed CRITICAL changes is a hard floor").toBe(0);
    expect(metrics.falsePositivesOnNullPairs, "zero FPs on null pairs is a hard floor").toBe(0);
    expect(metrics.recall, "overall recall must be at least 98%").toBeGreaterThanOrEqual(0.98);
  });

  it("diff engine output is deterministic across the entire corpus", () => {
    const engine = makeEnrichingEngine();
    const bundles = loadAllPairs();
    for (const b of bundles) {
      const r1 = engine.diff(b.current, b.prior);
      const r2 = engine.diff(b.current, b.prior);
      expect(JSON.stringify(r1), `pair ${b.pairId} must be deterministic`).toBe(JSON.stringify(r2));
    }
  });
});
