// @vitest-environment jsdom
//
// Strict XML well-formedness validation of the redline OOXML (pass 58). The
// other redline tests round-trip through the product's LENIENT regex walker,
// which would NOT catch an unbalanced/malformed tag that Word's strict parser
// rejects (a "repair?" prompt → fails the human render-check). jsdom's
// DOMParser does strict XML parsing and surfaces a <parsererror>, so this is
// the rigorous well-formedness gate the regex walker can't provide.
import { describe, it, expect } from "vitest";
import { buildRedlineDocumentXml } from "./redlineDocx.js";
import type { Change, DiffResult } from "../diff/types.js";

function change(p: Partial<Change>): Change {
  return {
    id: Math.random().toString(36).slice(2),
    changeType: "MODIFY",
    category: "DATES_DEADLINES",
    severity: "NORMAL",
    sectionHeading: "H",
    ucfLetter: "L",
    beforeText: "Offers due 2026-08-15.",
    afterText: "Offers due 2026-08-29.",
    tokenSpans: null,
    anchorsInvolved: [],
    criticalReasons: [],
    clauseInfo: null,
    locationHint: "loc",
    ...p,
  } as Change;
}
function result(changes: Change[]): DiffResult {
  return {
    id: "d",
    generatedAt: "2026-05-26T00:00:00.000Z",
    currentDoc: { sourceFileName: "amend2.pdf" } as never,
    priorDoc: { sourceFileName: "amend1.pdf" } as never,
    changes,
    criticalCount: changes.filter((c) => c.severity === "CRITICAL").length,
    changeCountByCategory: {} as never,
    diffConfidence: 1,
    warnings: [],
  } as DiffResult;
}

function parseErrors(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  return err ? err.textContent : null;
}

describe("redline OOXML is strictly well-formed XML (jsdom DOMParser)", () => {
  it("parses without error for a normal diff", () => {
    const xml = buildRedlineDocumentXml(
      result([change({ severity: "CRITICAL", criticalReasons: ["A date changed."] }), change({})]),
    );
    expect(parseErrors(xml)).toBeNull();
  });

  it("stays well-formed when document text contains XML metacharacters", () => {
    // The escaper must keep the doc valid even with injected angle brackets,
    // ampersands, quotes, and a lone < that would otherwise break parsing.
    const xml = buildRedlineDocumentXml(
      result([
        change({ afterText: 'a < b & c > d "e" <w:body> </w:p> & raw' }),
        change({ beforeText: "100% < 200% & rising", afterText: "see <attachment>" }),
      ]),
    );
    expect(parseErrors(xml)).toBeNull();
  });

  it("stays well-formed with empty changes and with unicode/emoji text", () => {
    expect(parseErrors(buildRedlineDocumentXml(result([])))).toBeNull();
    expect(
      parseErrors(buildRedlineDocumentXml(result([change({ afterText: "café — résumé 日本語 😀" })]))),
    ).toBeNull();
  });

  it("stays well-formed when extracted text carries XML-illegal control chars", () => {
    // A malformed PDF/DOCX can yield raw control codes in extracted text; the
    // escaper strips them so the whole document stays valid (Word would
    // otherwise reject the file as corrupt). Verify both that it parses and
    // that no illegal code point survived anywhere in the emitted XML.
    const xml = buildRedlineDocumentXml(
      result([
        change({ beforeText: "Prior\x00 due\x07 date", afterText: "New\x1f due\x0b date" }),
        change({ severity: "CRITICAL", criticalReasons: ["Reason with \x0c form-feed."] }),
      ]),
    );
    expect(parseErrors(xml)).toBeNull();
    const illegal = [...xml].filter((ch) => {
      const c = ch.codePointAt(0)!;
      return (c < 0x20 && c !== 0x9 && c !== 0xa && c !== 0xd) || c === 0xfffe || c === 0xffff;
    });
    expect(illegal).toEqual([]);
  });
});
