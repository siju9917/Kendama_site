/**
 * Thesis validation (PLAY-loop experiment, 2026-05-30) + regression.
 *
 * The portfolio strategy (`brain/IDEA_BACKLOG.md` derivative family /
 * `brain/RANKING.md`) rests on a claim: BidDiff's engine is a *horizontal*
 * critical-change-diff capability — the federal specifics are one rule-pack
 * on top of a domain-agnostic align→diff→classify core. This test exercises
 * that claim with running code by diffing two versions of a NON-federal
 * document (a generic software license) and asserting:
 *   - the engine aligns/diffs it correctly (the core is domain-agnostic);
 *   - changes in it are NOT flagged critical (the federal rule-pack
 *     correctly does not fire on non-federal content) — i.e. criticality
 *     is the separable layer.
 *
 * Keeping it green also guards against the engine accidentally coupling to
 * federal-specific assumptions.
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "../../src/core/diff/engine.js";
import { LocalClauseClient } from "../../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../../src/core/extract/normalize.js";
import { buildBlock, buildSection } from "../../src/core/model/build.js";
import type { Section, StructuredDocument } from "../../src/core/model/types.js";

function genericDoc(name: string, grantClause: string): StructuredDocument {
  const section: Section = buildSection({
    heading: "2. License Grant",
    headingLevel: 1,
    ucfLetter: null, // non-federal: no UCF letter
    sectionType: "OTHER",
    ordinal: 0,
    blocks: [
      buildBlock({ sectionPath: "lic", ordinal: 0, blockType: "PARAGRAPH", rawText: "This Agreement governs your use of the Software." }),
      buildBlock({ sectionPath: "lic", ordinal: 1, blockType: "PARAGRAPH", rawText: grantClause }),
      buildBlock({ sectionPath: "lic", ordinal: 2, blockType: "PARAGRAPH", rawText: "All rights not expressly granted are reserved." }),
    ],
  });
  return {
    metadata: {
      sourceFileName: name,
      sourceFileHash: name,
      solicitationId: null,
      amendmentNumber: null,
      extractedAt: "2026-05-30T00:00:00.000Z",
      overallExtractionConfidence: 1,
      extractionWarnings: [],
      pageCount: 1,
    },
    sections: [section],
  };
}

describe("Engine is domain-agnostic (regdiff thesis)", () => {
  const engine = new DiffEngine(new LocalClauseClient());

  it("diffs a non-federal document correctly, with the federal rule-pack not firing", () => {
    const prior = enrichStructuredDocument(
      genericDoc("license-v1.txt", "You are granted a non-exclusive license for up to 5 seats."),
    );
    const current = enrichStructuredDocument(
      genericDoc("license-v2.txt", "You are granted a non-exclusive license for up to 50 seats."),
    );
    const r = engine.diff(current, prior);

    // Core generalizes: exactly the changed clause surfaces as a MODIFY;
    // the two unchanged paragraphs align (no spurious changes).
    expect(r.changes.length).toBe(1);
    const c = r.changes[0];
    expect(c.changeType).toBe("MODIFY");
    expect((c.beforeText ?? "")).toContain("5 seats");
    expect((c.afterText ?? "")).toContain("50 seats");

    // Criticality is the SEPARABLE layer: the federal rule-pack does not
    // fire on non-federal content (no FAR clause / CLIN / UCF section / due
    // date), so this material-but-non-federal change is NORMAL, OTHER.
    expect(c.severity).toBe("NORMAL");
    expect(c.category).toBe("OTHER");
    expect(r.criticalCount).toBe(0);
  });
});
