/**
 * Anchor-recall stress: take prose phrasings that appear in real solicitations
 * (no longer the synthetic generator's canonical forms) and assert each
 * gets the right anchor.
 *
 * Failures here are real recall gaps — the engine would miss CRITICAL changes
 * involving these phrasings.
 */
import { describe, it, expect } from "vitest";
import { detectAllAnchors } from "../../src/core/extract/anchors/index.js";

interface AnchorCase {
  text: string;
  expect: { type: string; normalized?: string }[];
}

const DATE_CASES: AnchorCase[] = [
  { text: "Offers are due no later than 2:00 P.M. EDT on Monday, August 15, 2026.", expect: [{ type: "DATE", normalized: "2026-08-15" }] },
  { text: "Closing date: 8/15/2026.", expect: [{ type: "DATE", normalized: "2026-08-15" }] },
  { text: "Issued this 15th day of August, 2026.", expect: [{ type: "DATE", normalized: "2026-08-15" }] },
  { text: "Performance begins 01 September 2026.", expect: [{ type: "DATE", normalized: "2026-09-01" }] },
];

const CLAUSE_CASES: AnchorCase[] = [
  { text: "See FAR 52.204-21 — Basic Safeguarding.", expect: [{ type: "CLAUSE_REF", normalized: "52.204-21" }] },
  { text: "DFARS 252.204-7012 applies.", expect: [{ type: "CLAUSE_REF", normalized: "252.204-7012" }] },
  // Clause with no prefix:
  { text: "Clauses 52.219-14 and 52.222-50 incorporated.", expect: [{ type: "CLAUSE_REF", normalized: "52.219-14" }, { type: "CLAUSE_REF", normalized: "52.222-50" }] },
  // Wrapped across a space (post-PDF-extraction):
  { text: "See 52. 204-21 and 252. 204-7012.", expect: [{ type: "CLAUSE_REF", normalized: "52.204-21" }, { type: "CLAUSE_REF", normalized: "252.204-7012" }] },
];

const PAGE_LIMIT_CASES: AnchorCase[] = [
  { text: "The proposal shall not exceed 30 pages.", expect: [{ type: "PAGE_LIMIT", normalized: "30" }] },
  { text: "Volume I is limited to 50 pages including graphics.", expect: [{ type: "PAGE_LIMIT", normalized: "50" }] },
  { text: "Page limit: 75 pages applies to the technical volume.", expect: [{ type: "PAGE_LIMIT", normalized: "75" }] },
  { text: "Maximum of 25 pages, single-sided.", expect: [{ type: "PAGE_LIMIT", normalized: "25" }] },
  { text: "No more than 100 pages total.", expect: [{ type: "PAGE_LIMIT", normalized: "100" }] },
];

function check(cases: AnchorCase[]): void {
  for (const c of cases) {
    const anchors = detectAllAnchors(c.text);
    for (const want of c.expect) {
      const found = anchors.find(
        (a) => a.type === want.type && (!want.normalized || a.normalized === want.normalized),
      );
      expect(
        found,
        `text "${c.text}" should produce ${want.type}${want.normalized ? `(${want.normalized})` : ""}; got ${JSON.stringify(anchors.map((a) => ({ t: a.type, n: a.normalized })))}`,
      ).toBeDefined();
    }
  }
}

describe("Anchor recall — real-world phrasings", () => {
  it("date phrasings", () => check(DATE_CASES));
  it("clause phrasings including PDF-broken numbers", () => check(CLAUSE_CASES));
  it("page-limit phrasings", () => check(PAGE_LIMIT_CASES));
});
