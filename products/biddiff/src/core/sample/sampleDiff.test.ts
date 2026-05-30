import { describe, it, expect } from "vitest";
import { buildSampleResult } from "./sampleDiff.js";

describe("buildSampleResult — first-run example diff", () => {
  it("produces a deterministic, non-trivial diff with critical changes", () => {
    const a = buildSampleResult();
    const b = buildSampleResult();
    // Deterministic (same id + same content).
    expect(a).toEqual(b);
    // Non-trivial and demonstrates critical flagging (due date, page
    // limit, added DFARS clause).
    expect(a.changes.length).toBeGreaterThan(0);
    expect(a.criticalCount).toBeGreaterThanOrEqual(3);
    // Has the canned solicitation id and a fixed stamp.
    expect(a.currentDoc.solicitationId).toBe("SAMPLE-RFP-0042");
    expect(a.generatedAt).toBe("2026-05-30T12:00:00.000Z");
    // The added DFARS clause surfaces.
    const dfars = a.changes.some(
      (c) => (c.afterText ?? "").includes("252.204-7012"),
    );
    expect(dfars).toBe(true);
  });
});
