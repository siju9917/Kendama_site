/**
 * Edge cases the diff engine must handle without crashing or producing nonsense:
 *   - Empty current, non-empty prior (whole-doc DELETE)
 *   - Empty prior, non-empty current (whole-doc INSERT)
 *   - Both empty
 *   - Doc with only a Preamble section (no UCF headers)
 *   - Doc with a section containing zero blocks
 */
import { describe, it, expect } from "vitest";
import { DiffEngine } from "./engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { buildBlock, buildSection } from "../model/build.js";
import { enrichStructuredDocument } from "../extract/normalize.js";
import type { Section, StructuredDocument } from "../model/types.js";

function meta(name: string): StructuredDocument["metadata"] {
  return {
    sourceFileName: name,
    sourceFileHash: name,
    solicitationId: null,
    amendmentNumber: null,
    extractedAt: "2026-05-26T00:00:00.000Z",
    overallExtractionConfidence: 1,
    extractionWarnings: [],
    pageCount: 1,
  };
}

const emptyDoc: StructuredDocument = { metadata: meta("empty"), sections: [] };

function singleSection(text: string): StructuredDocument {
  const block = buildBlock({
    sectionPath: "X",
    ordinal: 0,
    blockType: "PARAGRAPH",
    rawText: text,
  });
  const section: Section = buildSection({
    heading: "Section X",
    headingLevel: 1,
    ucfLetter: null,
    sectionType: "OTHER",
    blocks: [block],
    ordinal: 0,
  });
  return { metadata: meta("single"), sections: [section] };
}

describe("DiffEngine edge cases", () => {
  const engine = new DiffEngine(new LocalClauseClient());

  it("two empty docs produce zero changes", () => {
    const r = engine.diff(emptyDoc, emptyDoc);
    expect(r.changes.length).toBe(0);
    expect(r.criticalCount).toBe(0);
  });

  it("empty prior + non-empty current is INSERTs only", () => {
    const r = engine.diff(singleSection("Hello world."), emptyDoc);
    // A new section appears: should yield an INSERT for the block.
    expect(r.changes.every((c) => c.changeType === "INSERT")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("empty current + non-empty prior is DELETEs only", () => {
    const r = engine.diff(emptyDoc, singleSection("Hello world."));
    expect(r.changes.every((c) => c.changeType === "DELETE")).toBe(true);
    expect(r.changes.length).toBeGreaterThan(0);
  });

  it("a small MODIFY computes token-level spans", () => {
    const prior = singleSection("The proposal shall not exceed 30 pages total.");
    const current = singleSection("The proposal shall not exceed 50 pages total.");
    const r = engine.diff(current, prior);
    const modify = r.changes.find((c) => c.changeType === "MODIFY");
    expect(modify).toBeTruthy();
    expect(modify?.tokenSpans).not.toBeNull();
  });

  it("a pathologically large MODIFY degrades gracefully (no 400MB dp) and still surfaces the change", () => {
    // ~3000 tokens on each side → product ~9M cells, over the 4M cap.
    // The previous per-dimension 10k cap would have let this allocate a
    // huge LCS table; the product cap skips token spans but still emits
    // the block-level MODIFY.
    const base = Array.from({ length: 3000 }, (_, i) => `word${i}`).join(" ");
    const prior = singleSection(base + " original-tail-token");
    const current = singleSection(base + " amended-tail-token");
    const t0 = Date.now();
    const r = engine.diff(current, prior);
    const elapsed = Date.now() - t0;
    const modify = r.changes.find((c) => c.changeType === "MODIFY");
    expect(modify).toBeTruthy();
    // Token spans are intentionally skipped for this size.
    expect(modify?.tokenSpans).toBeNull();
    // Both texts are still carried so the UI shows the whole-block diff.
    expect(modify?.beforeText).toContain("original-tail-token");
    expect(modify?.afterText).toContain("amended-tail-token");
    // Must not have gone down the 100M-op path.
    expect(elapsed).toBeLessThan(2000);
  });

  it("a section with zero blocks does not crash the engine", () => {
    const emptySection = buildSection({
      heading: "Section Y",
      headingLevel: 1,
      ucfLetter: null,
      sectionType: "OTHER",
      blocks: [],
      ordinal: 0,
    });
    const doc: StructuredDocument = { metadata: meta("z"), sections: [emptySection] };
    const r = engine.diff(doc, doc);
    expect(r.changes.length).toBe(0);
  });

  // ---- List-renumbering noise suppression (PROGRESS coverage-obs #8) --------
  //
  // Scenario (from the PROGRESS note): a Section-L list has one item inserted
  // at position 2. Every item after it shifts ordinal by 1, which used to
  // produce spurious CRITICAL MODIFYs for items whose content is unchanged.
  //
  // Expected engine output:
  //   1 × INSERT  (the genuinely new item at position 2)
  //   0 × MODIFY  (the shifted "L.2/L.3" items must be suppressed)

  it("inserting a list item produces exactly 1 INSERT and no spurious MODIFYs for shifted items", () => {
    function makeSectionL(items: string[]): StructuredDocument {
      const blocks = items.map((text, i) =>
        buildBlock({ sectionPath: "L", ordinal: i, blockType: "PARAGRAPH", rawText: text }),
      );
      const section = buildSection({
        heading: "Section L — Instructions",
        headingLevel: 1,
        ucfLetter: "L",
        sectionType: "INSTRUCTIONS",
        blocks,
        ordinal: 0,
      });
      return { metadata: meta("L-doc"), sections: [section] };
    }

    const prior = makeSectionL([
      "L.1 Submit via SAM.gov.",
      "L.2 Use 12-point font.",
      "L.3 Page limit is 50 pages.",
    ]);
    const current = makeSectionL([
      "L.1 Submit via SAM.gov.",
      "L.2 All attachments must be in PDF.",   // ← new item inserted here
      "L.3 Use 12-point font.",                 // was L.2 — ordinal shifted, content same
      "L.4 Page limit is 50 pages.",            // was L.3 — ordinal shifted, content same
    ]);

    const r = engine.diff(current, prior);

    // The insert must appear.
    const inserts = r.changes.filter((c) => c.changeType === "INSERT");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].afterText).toContain("All attachments must be in PDF");

    // The shifted items must NOT appear as MODIFY changes (renumbering noise suppressed).
    const modifies = r.changes.filter((c) => c.changeType === "MODIFY");
    expect(modifies).toHaveLength(0);

    // Total: only the 1 real INSERT (no spurious MODIFYs).
    expect(r.changes).toHaveLength(1);
    // The new instruction in Section L IS legitimately critical — no spurious
    // CRITICAL from the shifted items (there are none). The count reflects the
    // real change, not noise.
  });

  // 5.7.5 end-to-end: NAICS colon-separator form goes all the way to CRITICAL.
  // Tests the full pipeline: block text → detectAllAnchors (via enrichStructuredDocument)
  // → SET_ASIDE anchor → evaluateCriticality → CRITICAL severity.
  // Regression for the bug where "NAICS: 541519" (SAM.gov colon format) was silently
  // dropped by the anchor detector, making a NAICS-code change appear as NORMAL.
  it("NAICS code change in SAM.gov colon format (NAICS: XXXXXX) is CRITICAL end-to-end", () => {
    function makeDoc(naicsText: string): StructuredDocument {
      const block = buildBlock({
        sectionPath: "H",
        ordinal: 0,
        blockType: "PARAGRAPH",
        rawText: naicsText,
      });
      const section = buildSection({
        heading: "Section H — Special Contract Requirements",
        headingLevel: 1,
        ucfLetter: "H",
        sectionType: "OTHER",
        blocks: [block],
        ordinal: 0,
      });
      return enrichStructuredDocument({ metadata: meta("h-doc"), sections: [section] });
    }

    const prior = makeDoc("NAICS: 541511 (Computer Programming Services)");
    const current = makeDoc("NAICS: 541519 (Other Computer Related Services)");
    const r = engine.diff(current, prior);

    const naicsChange = r.changes.find((c) => c.changeType === "MODIFY");
    expect(naicsChange).toBeDefined();
    expect(naicsChange?.severity).toBe("CRITICAL");
    expect(naicsChange?.criticalReasons).toContain(
      "A set-aside designation, NAICS code, or size standard changed.",
    );
  });

  it("inserting a list item where content also changed produces INSERT + MODIFY (not suppressed)", () => {
    function makeList(items: string[]): StructuredDocument {
      const blocks = items.map((text, i) =>
        buildBlock({ sectionPath: "L", ordinal: i, blockType: "PARAGRAPH", rawText: text }),
      );
      const section = buildSection({
        heading: "Section L",
        headingLevel: 1,
        ucfLetter: "L",
        sectionType: "INSTRUCTIONS",
        blocks,
        ordinal: 0,
      });
      return { metadata: meta("L-doc"), sections: [section] };
    }

    const prior = makeList([
      "1. Page limit is 15 pages.",
      "2. Submit electronically.",
    ]);
    const current = makeList([
      "1. New requirement added.",          // inserted before original first item
      "2. Page limit is 20 pages.",         // ordinal shifted AND content changed → must surface
      "3. Submit electronically.",          // ordinal shifted, content same → suppressed
    ]);

    const r = engine.diff(current, prior);

    // Item 1 (new) → INSERT.
    const inserts = r.changes.filter((c) => c.changeType === "INSERT");
    expect(inserts.length).toBeGreaterThanOrEqual(1);

    // "Page limit 15 → 20" must surface as MODIFY (content changed).
    const modifies = r.changes.filter((c) => c.changeType === "MODIFY");
    const pageLimitMod = modifies.find(
      (c) => c.beforeText?.includes("15") && c.afterText?.includes("20"),
    );
    expect(pageLimitMod).toBeTruthy();

    // "Submit electronically" shifted ordinal only → suppressed (not in modifies).
    const spurious = modifies.find(
      (c) =>
        c.afterText?.includes("Submit electronically") &&
        c.beforeText?.includes("Submit electronically"),
    );
    expect(spurious).toBeUndefined();
  });
});
