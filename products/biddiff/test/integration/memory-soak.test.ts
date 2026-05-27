/**
 * Memory soak test (Phase 4.13).
 *
 * Run 50 sequential diffs and assert that the resident heap doesn't grow
 * unboundedly. This catches accumulating closures, leaked Maps, or
 * references retained by the engine across runs.
 *
 * Node-only: uses process.memoryUsage. We accept some growth (V8 doesn't
 * gc on demand) but fail if RSS more than triples from the post-warmup
 * baseline — a clear leak signature.
 */
import { describe, expect, it } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { loadAllPairs } from "../corpus/harness.js";

describe("Memory soak (Phase 4.13)", () => {
  it("50 sequential diffs do not blow up the heap", () => {
    const engine = new DiffEngine(new LocalClauseClient());
    const pairs = loadAllPairs().slice(0, 10);
    const enriched = pairs.map((p) => ({
      current: enrichStructuredDocument(p.current),
      prior: enrichStructuredDocument(p.prior),
    }));

    // Warm up: 5 diffs so V8 settles.
    for (let i = 0; i < 5; i++) {
      const b = enriched[i % enriched.length];
      engine.diff(b.current, b.prior);
    }
    if (typeof global.gc === "function") global.gc();
    const baseline = process.memoryUsage().rss;

    // Soak: 50 more diffs.
    for (let i = 0; i < 50; i++) {
      const b = enriched[i % enriched.length];
      const result = engine.diff(b.current, b.prior);
      // Touch the result so it isn't optimized away.
      if (result.changes.length < 0) throw new Error("impossible");
    }
    if (typeof global.gc === "function") global.gc();
    const after = process.memoryUsage().rss;

    const ratio = after / baseline;
    console.log(
      `[soak] baseline=${(baseline / 1024 / 1024).toFixed(1)}MB after=${(after / 1024 / 1024).toFixed(1)}MB ratio=${ratio.toFixed(2)}x`,
    );
    expect(ratio, "RSS should not triple over 50 diffs").toBeLessThan(3);
  });
});
