/**
 * Anchor-recall stress: take prose phrasings that appear in real solicitations
 * (no longer the synthetic generator's canonical forms) and assert each
 * gets the right anchor.
 *
 * Failures here are real recall gaps — the engine would miss CRITICAL changes
 * involving these phrasings.
 */
import { describe, it, expect } from "vitest";
import { detectAllAnchors, detectSetAside } from "../../src/core/extract/anchors/index.js";

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

// SAM.gov System for Award Management uses the colon separator format for
// NAICS on the solicitation synopsis page: "NAICS: 541519". The set-aside
// designation appears on the cover page under "Set-Aside:" or inline.
const SET_ASIDE_CASES: AnchorCase[] = [
  // SAM.gov colon format (most common in published synopses)
  { text: "NAICS: 541519 (Other Computer Related Services)", expect: [{ type: "SET_ASIDE" }] },
  { text: "NAICS: 541330", expect: [{ type: "SET_ASIDE" }] },
  // Cover-page "NAICS Code:" format
  { text: "NAICS Code: 541512 (Computer Systems Design and Related Services)", expect: [{ type: "SET_ASIDE" }] },
  // Plain-space form (also common on cover pages)
  { text: "NAICS 541511", expect: [{ type: "SET_ASIDE" }] },
  // Set-aside designation
  { text: "This acquisition is set-aside for small businesses.", expect: [{ type: "SET_ASIDE" }] },
  { text: "Set-Aside: Total Small Business", expect: [{ type: "SET_ASIDE" }] },
  // Size standard
  { text: "Size Standard: $30 million in average annual receipts.", expect: [{ type: "SET_ASIDE" }] },
  { text: "The applicable size standard is 1,000 employees.", expect: [{ type: "SET_ASIDE" }] },
];

// CLIN recall requires Section B / PRICING context (allowClin: true).
// These phrasings appear on Section B pricing pages and IDIQ task orders.
const CLIN_CASES = [
  // Standard 4-digit CLIN with description
  { text: "CLIN 0001: Systems Engineering Support Services, Labor Category: Senior Engineer.", clin: "0001" },
  // Sub-CLIN (DFARS 204.71 format — letter suffix)
  { text: "CLIN 0001AA is a sub-CLIN for travel costs.", clin: "0001AA" },
  { text: "SubCLIN 0002AA Informational: Government-Furnished Equipment.", clin: "0002AA" },
  // Leading zeros stripped form
  { text: "CLIN 1 base year — not to exceed $5M.", clin: "0001" },
];

describe("Anchor recall — real-world phrasings", () => {
  it("date phrasings", () => check(DATE_CASES));
  it("clause phrasings including PDF-broken numbers", () => check(CLAUSE_CASES));
  it("page-limit phrasings", () => check(PAGE_LIMIT_CASES));

  // 5.7.5 gap (2026-06-06): anchor-recall had no SET_ASIDE or CLIN recall cases.
  // SET_ASIDE drives critical rule 7 (eligibility-determining); CLIN drives rule 5
  // (pricing structure). Missing these in recall tests means real-world phrasings
  // that differ from the unit-test canonical forms could silently break CRITICAL detection.
  it("SET_ASIDE phrasings — SAM.gov colon format, set-aside designation, size standard", () => {
    for (const c of SET_ASIDE_CASES) {
      const anchors = detectSetAside(c.text);
      expect(
        anchors.some((a) => a.type === "SET_ASIDE"),
        `"${c.text}" should produce a SET_ASIDE anchor; got ${JSON.stringify(anchors)}`,
      ).toBe(true);
    }
  });

  it("CLIN phrasings — standard, sub-CLIN, leading-zero stripped", () => {
    for (const c of CLIN_CASES) {
      const anchors = detectAllAnchors(c.text, { allowClin: true });
      const clin = anchors.find((a) => a.type === "CLIN" && a.normalized === c.clin);
      expect(
        clin,
        `"${c.text}" should produce CLIN(${c.clin}); got ${JSON.stringify(anchors.filter((a) => a.type === "CLIN").map((a) => a.normalized))}`,
      ).toBeDefined();
    }
  });
});
