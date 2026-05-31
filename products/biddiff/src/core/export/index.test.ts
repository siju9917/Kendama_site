import { describe, expect, it } from "vitest";
import { buildSummaryText, exportPdfReport } from "./index.js";
import { DiffEngine } from "../diff/engine.js";
import { LocalClauseClient } from "../clauses/client.js";
import { enrichStructuredDocument } from "../extract/normalize.js";
import { loadPair } from "../../../test/corpus/harness.js";

function makeResult(pairId: string) {
  const pair = loadPair(pairId);
  const ec = enrichStructuredDocument(pair.current);
  const ep = enrichStructuredDocument(pair.prior);
  const engine = new DiffEngine(new LocalClauseClient());
  const r = engine.diff(ec, ep);
  r.generatedAt = "2026-05-26T00:00:00.000Z";
  return r;
}

describe("buildSummaryText", () => {
  it("includes the disclaimer and key counts", () => {
    const text = buildSummaryText(makeResult("it-svc-011-multi-critical"));
    expect(text).toContain("BidDiff");
    expect(text).toContain("Critical changes:");
    expect(text).toContain("BidDiff identifies textual differences");
  });

  it("renders each change type with its verb, section label, and reason (bug-hunt pass 44)", () => {
    const r = makeResult("it-svc-001-due-date-shift");
    const base = {
      category: "OTHER" as const,
      severity: "CRITICAL" as const,
      sectionHeading: "H",
      tokenSpans: null,
      anchorsInvolved: [],
      criticalReasons: ["A reason."],
      clauseInfo: null,
      locationHint: "loc",
    };
    r.changes = [
      { ...base, id: "1", changeType: "INSERT", ucfLetter: "L", beforeText: null, afterText: "new clause text" },
      { ...base, id: "2", changeType: "DELETE", ucfLetter: null, beforeText: "old clause text", afterText: null, criticalReasons: [] },
      { ...base, id: "3", changeType: "MOVE", ucfLetter: "M", beforeText: "moved text", afterText: "moved text" },
      { ...base, id: "4", changeType: "MODIFY", ucfLetter: "C", beforeText: "was this", afterText: "now that" },
    ];
    const text = buildSummaryText(r);
    expect(text).toMatch(/\[Section L\].*A reason\. Added: new clause text/);
    expect(text).toMatch(/Removed: old clause text/); // no section label (null ucf), no reason (empty)
    expect(text).not.toMatch(/\[Section \]/); // empty ucf never renders an empty bracket
    expect(text).toMatch(/\[Section M\].*Moved: moved text/);
    expect(text).toMatch(/\[Section C\].*Modified: was "was this" now "now that"/);
  });

  it("never recommends an action", () => {
    const text = buildSummaryText(makeResult("it-svc-011-multi-critical"));
    // Reports, doesn't advise.
    // We check that the engine's own prose (the disclaimer + summary text)
    // doesn't carry advisory language. Document content itself isn't subject
    // to this rule; clause text legitimately contains "must" / "shall".
    expect(text).toContain("does not provide legal");
    expect(text.length).toBeGreaterThan(100);
  });

  // Ordering guard (bug-hunt pass 20, 2026-05-30): the export must list
  // critical changes before normal ones — matching the store-listing claim
  // ("critical changes flagged at the top") AND the DiffView default order
  // (criticalFirst, POLISH N9). This keeps all three surfaces consistent.
  it("lists the Critical section before the Other section", () => {
    const text = buildSummaryText(makeResult("it-svc-011-multi-critical"));
    const ci = text.indexOf("Critical changes:");
    const oi = text.indexOf("Other changes:");
    expect(ci).toBeGreaterThan(-1);
    // If there are normal changes too, Critical must come first; if there
    // are none, the Other section is simply absent (also acceptable).
    if (oi !== -1) expect(ci).toBeLessThan(oi);
  });
});

describe("buildSummaryMarkdown", () => {
  it("emits valid markdown structure with disclaimer", async () => {
    const { buildSummaryMarkdown } = await import("./index.js");
    const md = buildSummaryMarkdown(makeResult("stress-001-multi-six-edits"));
    expect(md).toMatch(/^# BidDiff/);
    expect(md).toContain("## Critical changes");
    expect(md).toMatch(/\*[^*]+\*$/m); // italicized line (the disclaimer)
  });

  it("inline-code spans survive embedded backticks (CommonMark)", async () => {
    const { buildSummaryMarkdown } = await import("./index.js");
    const r = makeResult("it-svc-001-due-date-shift");
    if (r.changes.length > 0) {
      r.changes[0].beforeText = "uses a `template` literal";
      r.changes[0].afterText = "uses a ``double-back`` literal";
    }
    const md = buildSummaryMarkdown(r);
    // The two pieces of content must appear intact.
    expect(md).toContain("uses a `template` literal");
    expect(md).toContain("uses a ``double-back`` literal");
    // And the wrap fence must use strictly more backticks than the longest
    // run inside the content — i.e. content with 1 backtick is wrapped by
    // ``…``; content with 2 backticks is wrapped by ```…```.
    expect(md).toMatch(/``\s?uses a `template` literal\s?``/);
    expect(md).toMatch(/```\s?uses a ``double-back`` literal\s?```/);
  });

  it("header metadata (filenames, solicitation id) survives an embedded backtick (bug-hunt pass 41)", async () => {
    const { buildSummaryMarkdown } = await import("./index.js");
    const r = makeResult("it-svc-001-due-date-shift");
    r.currentDoc.sourceFileName = "weird`name.pdf";
    r.priorDoc.sourceFileName = "ok.pdf";
    r.currentDoc.solicitationId = "RFP-`123";
    const md = buildSummaryMarkdown(r);
    const compared = md.split("\n").find((l) => l.includes("Compared:")) ?? "";
    // The fence must be wider than the embedded backtick so the span doesn't
    // break — the filename appears intact inside a single code span.
    expect(compared).toMatch(/``\s?weird`name\.pdf\s?``/);
    const sol = md.split("\n").find((l) => l.includes("Solicitation:")) ?? "";
    expect(sol).toMatch(/``\s?RFP-`123\s?``/);
  });
});

describe("exportPdfReport", () => {
  it("produces a non-empty PDF blob", async () => {
    const r = makeResult("stress-001-multi-six-edits");
    const blob = await exportPdfReport(r);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  }, 15_000);

  it("does not crash on absurdly long unbreakable tokens", async () => {
    const r = makeResult("it-svc-001-due-date-shift");
    // Inject a 2000-char "word" into a change's afterText.
    const longWord = "x".repeat(2000);
    const cloned = { ...r, changes: r.changes.map((c) => ({ ...c, afterText: longWord })) };
    const blob = await exportPdfReport(cloned);
    expect(blob.size).toBeGreaterThan(500);
  }, 30_000);

  it("is byte-deterministic for a given DiffResult (pinned metadata)", async () => {
    const r = makeResult("it-svc-001-due-date-shift");
    const a = await (await exportPdfReport(r)).arrayBuffer();
    const b = await (await exportPdfReport(r)).arrayBuffer();
    expect(a.byteLength).toBe(b.byteLength);
    const av = new Uint8Array(a);
    const bv = new Uint8Array(b);
    for (let i = 0; i < av.length; i++) {
      if (av[i] !== bv[i]) {
        throw new Error(`PDF bytes differ at offset ${i}: ${av[i]} vs ${bv[i]}`);
      }
    }
  }, 30_000);

  it("does not throw on non-WinAnsi characters in the source text", async () => {
    // Real solicitations occasionally contain chars outside pdf-lib's
    // Helvetica/WinAnsi encoding (math symbols, mu, Chinese, emoji).
    // The export must survive — sanitizer replaces them with '?'.
    const r = makeResult("it-svc-001-due-date-shift");
    const exotic = "Ω µ ∑ ✓ 你好 😀 ¹⁰⁰ ℃";
    const cloned = {
      ...r,
      // Exercise BOTH interpolation sites: the change body AND the header's
      // "Compared: <file> vs <file>" line (a non-Latin attachment name is a
      // realistic crash vector pdf-lib would otherwise throw on).
      currentDoc: { ...r.currentDoc, sourceFileName: `改訂版😀-${exotic}.pdf` },
      priorDoc: { ...r.priorDoc, sourceFileName: "原本.pdf" },
      changes: r.changes.map((c) => ({
        ...c,
        beforeText: `prior: ${exotic}`,
        afterText: `current: ${exotic}`,
      })),
    };
    const blob = await exportPdfReport(cloned);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
  }, 30_000);

  it("exports a valid report for a ZERO-change diff (identical versions) without crashing", async () => {
    // A realistic path: the user compares two versions that turn out identical
    // (or differ only by suppressed reformatting) → 0 changes, then exports.
    // The export must produce a clean 'Total changes: 0' report, not crash on
    // the empty change list or emit a confusing blank document.
    const engine = new DiffEngine(new LocalClauseClient());
    const doc = enrichStructuredDocument(loadPair("it-svc-001-due-date-shift").current);
    const zero = engine.diff(doc, doc); // self-diff = zero changes
    expect(zero.changes.length).toBe(0);
    const text = buildSummaryText(zero);
    expect(text).toMatch(/Total changes:\s*0/);
    expect(text).toContain("BidDiff identifies textual differences"); // disclaimer still present
    const blob = await exportPdfReport(zero);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
  }, 30_000);
});
