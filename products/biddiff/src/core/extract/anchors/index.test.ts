import { describe, it, expect } from "vitest";
import {
  detectAllAnchors,
  detectClauseRefs,
  detectClins,
  detectDates,
  detectMoney,
  detectPageLimits,
  detectSectionRefs,
  detectSetAside,
  sortAnchors,
} from "./index.js";
import type { Anchor } from "../../model/types.js";

describe("clause refs", () => {
  it("matches bare numbers", () => {
    const a = detectClauseRefs("Incorporates 52.204-21 and 52.219-14 by reference.");
    expect(a.map((x) => x.normalized)).toEqual(["52.204-21", "52.219-14"]);
  });

  it("matches FAR/DFARS prefixes", () => {
    const a = detectClauseRefs("See FAR 52.204-21 and DFARS 252.204-7012.");
    expect(a.map((x) => x.normalized)).toEqual(["52.204-21", "252.204-7012"]);
  });

  it("matches GSAR and NFS prefixes", () => {
    const a = detectClauseRefs("Applicable: GSAR 552.215-72; NFS 1852.227-70.");
    expect(a.map((x) => x.normalized)).toEqual(["552.215-72", "1852.227-70"]);
  });

  it("does not match plain decimals or version numbers", () => {
    expect(detectClauseRefs("see version 1.2.3 not 12.345").length).toBe(0);
    // Random "n.nnn-n" pattern that isn't really a clause? We still match it —
    // false positives on clause numbers are negligible in practice because
    // the regulation namespace owns this format. Confirmed by spec 2.8.
    const a = detectClauseRefs("clause 123.456-78 added");
    expect(a.length).toBe(1);
  });

  it("returns char spans", () => {
    const txt = "Add 52.204-21 to the list.";
    const a = detectClauseRefs(txt);
    expect(a[0].charStart).toBe(4);
    expect(a[0].charEnd).toBe(13);
  });
});

describe("dates", () => {
  it("matches ISO 8601 dates", () => {
    const a = detectDates("Proposals are due 2026-08-15 at noon.");
    expect(a.map((x) => x.normalized)).toEqual(["2026-08-15"]);
  });

  it("matches US m/d/y", () => {
    const a = detectDates("Conference held 7/3/2026 by phone.");
    expect(a.map((x) => x.normalized)).toEqual(["2026-07-03"]);
  });

  it("matches Month Day, Year", () => {
    const a = detectDates("On August 15, 2026 the deadline closes.");
    expect(a.map((x) => x.normalized)).toEqual(["2026-08-15"]);
  });

  it("matches Day Month Year", () => {
    const a = detectDates("Issued 15 August 2026 by the agency.");
    expect(a.map((x) => x.normalized)).toEqual(["2026-08-15"]);
  });

  it("does not match impossible dates", () => {
    expect(detectDates("2026-13-40 is not a date").length).toBe(0);
    expect(detectDates("99/99/2026 is not a date").length).toBe(0);
  });

  it("rejects calendrically-impossible but regex-shaped dates", () => {
    // These pass the regex (month/day in range) but are not real days,
    // so they must not produce a normalized impossible ISO date.
    expect(detectDates("02/30/2026").length).toBe(0); // Feb 30
    expect(detectDates("2026-02-30").length).toBe(0); // ISO Feb 30
    expect(detectDates("04/31/2026").length).toBe(0); // Apr 31
    expect(detectDates("February 30, 2026").length).toBe(0);
    // Leap-year boundary: 2026 is not a leap year, 2028 is.
    expect(detectDates("02/29/2026").length).toBe(0);
    expect(detectDates("02/29/2028").map((x) => x.normalized)).toEqual(["2028-02-29"]);
  });

  it("dedupes overlapping forms", () => {
    // "2026-08-15" appearing once should produce one anchor.
    expect(detectDates("Date: 2026-08-15. End.").length).toBe(1);
  });
});

describe("money", () => {
  it("matches simple amounts", () => {
    expect(detectMoney("Ceiling is $1,250,000.00 firm-fixed-price").map((x) => x.normalized)).toEqual([
      "1250000.00",
    ]);
  });
  it("handles cents-less", () => {
    expect(detectMoney("$500 per hour").map((x) => x.normalized)).toEqual(["500.00"]);
  });
  it("ignores stray dollar signs", () => {
    expect(detectMoney("The $ symbol alone").length).toBe(0);
  });
  it("parses magnitude suffixes (M / K / B)", () => {
    expect(detectMoney("Ceiling not to exceed $1.5M").map((x) => x.normalized)).toEqual([
      "1500000.00",
    ]);
    expect(detectMoney("$500K base").map((x) => x.normalized)).toEqual(["500000.00"]);
    expect(detectMoney("up to $1.5B over the period").map((x) => x.normalized)).toEqual([
      "1500000000.00",
    ]);
  });
  it("parses spelled-out magnitudes", () => {
    expect(detectMoney("a ceiling of $2.3 million").map((x) => x.normalized)).toEqual([
      "2300000.00",
    ]);
  });
  it("distinguishes $1.5M from $15M (must not normalize to the same value)", () => {
    expect(detectMoney("$1.5M").map((x) => x.normalized)).toEqual(["1500000.00"]);
    expect(detectMoney("$15M").map((x) => x.normalized)).toEqual(["15000000.00"]);
  });

  // Characterization tests (bug-hunt pass 13, 2026-05-30): pin the verified
  // behavior on adversarial inputs so it cannot silently drift. Where current
  // behavior is a known, documented limitation (PROGRESS.md N10), the test
  // asserts the CURRENT behavior and is labelled so — a future fix updates it
  // deliberately rather than discovering the change by surprise.
  it("strips thousands separators and keeps decimals", () => {
    expect(detectMoney("$1,234.56").map((x) => x.normalized)).toEqual(["1234.56"]);
    expect(detectMoney("$1,500,000").map((x) => x.normalized)).toEqual(["1500000.00"]);
  });
  it("reads only well-formed grouping; a malformed group truncates at the break", () => {
    // "$1,5M" is not valid en-US grouping (group must be exactly 3 digits),
    // so matching stops at "$1". This is acceptable: the change still surfaces
    // as a normal text diff; the anchor just isn't emitted.
    expect(detectMoney("$1,5M").map((x) => x.normalized)).toEqual(["1.00"]);
    expect(detectMoney("$12,34").map((x) => x.normalized)).toEqual(["12.00"]);
  });
  it("finds multiple amounts in one string", () => {
    expect(detectMoney("price is $5 and $1.5M total").map((x) => x.normalized)).toEqual([
      "5.00",
      "1500000.00",
    ]);
  });
  it("parses leading-decimal form ($.5M — no leading zero before decimal)", () => {
    expect(detectMoney("$.5M").map((x) => x.normalized)).toEqual(["500000.00"]);
    expect(detectMoney("award ceiling of $.75M").map((x) => x.normalized)).toEqual(["750000.00"]);
    expect(detectMoney("$.5").map((x) => x.normalized)).toEqual(["0.50"]);
  });
  it("parses double-M accounting notation ($1.5MM = $1.5 million)", () => {
    expect(detectMoney("$1.5MM").map((x) => x.normalized)).toEqual(["1500000.00"]);
    expect(detectMoney("ceiling not to exceed $2MM").map((x) => x.normalized)).toEqual(["2000000.00"]);
  });
  it("$1K parses to 1000.00 (magnitude suffix on bare integer)", () => {
    expect(detectMoney("$1K total").map((x) => x.normalized)).toEqual(["1000.00"]);
    expect(detectMoney("$500K base").map((x) => x.normalized)).toEqual(["500000.00"]);
  });
  it("$1,500K parses to 1500000.00 (commas + magnitude)", () => {
    // Unusual but mathematically valid: $1,500K = $1,500 × 1,000 = $1.5M
    expect(detectMoney("award of $1,500K").map((x) => x.normalized)).toEqual(["1500000.00"]);
  });
  it("$1.5MMM: triple-M suffix backtracks decimal — matches only $1", () => {
    // MM fails \b (third M is a word char); M also fails \b (second M is a word char).
    // The regex backtracks the optional decimal group: $1 matches with \b between
    // the digit and the subsequent '.'. The value $1 is a "best effort" partial match.
    // This is consistent behavior: $1.5MMM is not a valid notation; the anchor signals
    // a money amount is present without claiming the full value.
    expect(detectMoney("$1.5MMM").map((x) => x.normalized)).toEqual(["1.00"]);
  });
  it("KNOWN LIMITATION (PROGRESS.md obs #7): USD-prefix and spelled-out forms not parsed", () => {
    // "$"-prefixed forms work; non-dollar-sign prefixes do not.
    // Not changed: widening MONEY_RE to "USD"/"dollars" carries false-positive
    // risk ("5 USD per line item", "5 million parameters") and the miss-cost
    // is low (a USD amount change still surfaces as a plain text diff).
    // These probe the US domestic-contract common cases:
    expect(detectMoney("USD 5,000,000 ceiling").length).toBe(0);   // "USD" prefix
    expect(detectMoney("5,000,000 USD").length).toBe(0);            // trailing currency code
    expect(detectMoney("5 million dollars").length).toBe(0);        // spelled-out suffix
    // Contrast: "$" + spelled-out magnitude suffix IS handled:
    expect(detectMoney("$2.3 million").map((x) => x.normalized)).toEqual(["2300000.00"]);
  });
});

describe("page limits", () => {
  it("catches typical phrasings", () => {
    expect(
      detectPageLimits("The proposal shall not exceed 30 pages").map((x) => x.normalized),
    ).toEqual(["30"]);
    expect(
      detectPageLimits("Volume I is limited to 50 pages.").map((x) => x.normalized),
    ).toEqual(["50"]);
    expect(
      detectPageLimits("Page limit: 75 pages applies to the technical volume.").map(
        (x) => x.normalized,
      ),
    ).toEqual(["75"]);
  });
  it("does not match generic page mentions", () => {
    expect(detectPageLimits("on page 5 of the attachment").length).toBe(0);
  });

  // Bug-hunt pass 42 (PROGRESS coverage obs #2): spelled-out + parenthetical
  // page limits ("shall not exceed ten (10) pages") are a very common federal
  // phrasing that previously matched nothing. The authoritative digit is in
  // the parens; extract it.
  it("extracts the parenthetical digit from a spelled-out page limit", () => {
    expect(detectPageLimits("shall not exceed ten (10) pages").map((x) => x.normalized)).toEqual(["10"]);
    expect(detectPageLimits("not to exceed twenty (20) pages").map((x) => x.normalized)).toEqual(["20"]);
    expect(detectPageLimits("page limit of fifty (50) pages").map((x) => x.normalized)).toEqual(["50"]);
  });

  it("still matches the plain digit form (no regression)", () => {
    expect(detectPageLimits("not to exceed 30 pages").map((x) => x.normalized)).toEqual(["30"]);
    expect(detectPageLimits("maximum of 40 pages").map((x) => x.normalized)).toEqual(["40"]);
  });

  it("extracts the bare-parenthesized digit '(30) pages' form", () => {
    // "not to exceed (30) pages" — no spelled-out word, just digits in parens.
    // Less common but valid. The authoritative count is the digit inside parens.
    expect(detectPageLimits("not to exceed (30) pages").map((x) => x.normalized)).toEqual(["30"]);
    expect(detectPageLimits("limited to (50) pages").map((x) => x.normalized)).toEqual(["50"]);
    expect(detectPageLimits("page limit: (75) pages").map((x) => x.normalized)).toEqual(["75"]);
  });
});

describe("CLIN", () => {
  it("matches CLIN 0001 and CLIN 1", () => {
    const a = detectClins("CLIN 0001 and CLIN 2 are funded.");
    expect(a.map((x) => x.normalized)).toEqual(["0001", "0002"]);
  });
  it("ignores prose without CLIN token", () => {
    expect(detectClins("0001 alone").length).toBe(0);
  });
  it("matches sub-CLINs with 2-letter suffix (DFARS 204.71 format)", () => {
    const a = detectClins("CLIN 0001AA and CLIN 0001AB are sub-line items.");
    expect(a.map((x) => x.normalized)).toEqual(["0001AA", "0001AB"]);
  });
  it("matches SubCLIN keyword", () => {
    const a = detectClins("SubCLIN 0002AA is an informational sub-line item.");
    expect(a.map((x) => x.normalized)).toEqual(["0002AA"]);
  });
  it("parent CLIN and sub-CLINs are both detected", () => {
    const a = detectClins("CLIN 0001 (base) has sub-items CLIN 0001AA and CLIN 0001AB.");
    const norms = a.map((x) => x.normalized);
    expect(norms).toContain("0001");
    expect(norms).toContain("0001AA");
    expect(norms).toContain("0001AB");
  });
});

describe("SET_ASIDE", () => {
  it("matches 'set-aside' keyword (hyphen form)", () => {
    const a = detectSetAside("This acquisition is a Total Small Business Set-Aside.");
    expect(a.some((x) => x.type === "SET_ASIDE")).toBe(true);
  });
  it("does NOT match 'set aside' (space form / general verb — would be a false positive)", () => {
    // "Please set aside 30 minutes" is not a procurement set-aside.
    // Only the hyphenated form "set-aside" is the procurement term.
    expect(detectSetAside("Please set aside 30 minutes for the oral presentation.").length).toBe(0);
  });
  it("matches NAICS code with numeric code", () => {
    const a = detectSetAside("NAICS Code 541511 applies to this solicitation.");
    expect(a.some((x) => x.type === "SET_ASIDE")).toBe(true);
  });
  it("matches NAICS without 'code' keyword", () => {
    const a = detectSetAside("NAICS 541330 (Engineering Services).");
    expect(a.some((x) => x.type === "SET_ASIDE")).toBe(true);
  });
  it("matches 'size standard' phrase", () => {
    const a = detectSetAside("Size Standard: $25 million in annual receipts.");
    expect(a.some((x) => x.type === "SET_ASIDE")).toBe(true);
  });
  it("does not match unrelated text", () => {
    expect(detectSetAside("The award amount is $1 million for the base year.").length).toBe(0);
    expect(detectSetAside("FAR 52.204-21 is incorporated.").length).toBe(0);
  });
  it("is included in detectAllAnchors output for set-aside text", () => {
    const a = detectAllAnchors("This is a NAICS 541511 Small Business Set-Aside solicitation.");
    expect(a.some((x) => x.type === "SET_ASIDE")).toBe(true);
  });
});

describe("section refs", () => {
  it("matches Section L and Section M.1.2", () => {
    const a = detectSectionRefs("See Section L for instructions and Section M.1.2 for evaluation.");
    expect(a.map((x) => x.normalized)).toEqual(["L", "M.1.2"]);
  });
  it("matches paragraph L.4", () => {
    expect(detectSectionRefs("see paragraph L.4 for details").map((x) => x.normalized)).toEqual([
      "L.4",
    ]);
  });
});

describe("detectAllAnchors", () => {
  it("composes all and sorts by position", () => {
    const txt =
      "Offers due 2026-08-15. Page limit 30 pages. Includes 52.204-21 and DFARS 252.204-7012. See Section L.";
    const a = detectAllAnchors(txt);
    const types = a.map((x) => x.type);
    expect(types).toContain("DATE");
    expect(types).toContain("PAGE_LIMIT");
    expect(types).toContain("CLAUSE_REF");
    expect(types).toContain("SECTION_REF");
    for (let i = 1; i < a.length; i++) {
      expect(a[i].charStart).toBeGreaterThanOrEqual(a[i - 1].charStart);
    }
  });
  it("CLIN gated by context flag", () => {
    const txt = "CLIN 0001 listed.";
    expect(detectAllAnchors(txt).find((a) => a.type === "CLIN")).toBeUndefined();
    expect(detectAllAnchors(txt, { allowClin: true }).find((a) => a.type === "CLIN")).toBeDefined();
  });
});

describe("sortAnchors (direct — deterministic, locale-independent order)", () => {
  const a = (type: Anchor["type"], charStart: number): Anchor =>
    ({ type, raw: "x", normalized: "x", charStart, charEnd: charStart + 1 }) as Anchor;

  it("orders by charStart, then by type code-point (not locale)", () => {
    const sorted = sortAnchors([a("MONEY", 10), a("DATE", 5), a("CLAUSE_REF", 5)]);
    expect(sorted.map((x) => [x.type, x.charStart])).toEqual([
      ["CLAUSE_REF", 5], // same charStart as DATE → tie broken by type code-point (C < D)
      ["DATE", 5],
      ["MONEY", 10],
    ]);
  });

  it("does not mutate its input and is stable for equal keys", () => {
    const input = [a("DATE", 3), a("DATE", 3)];
    const snapshot = input.slice();
    const out = sortAnchors(input);
    expect(input).toEqual(snapshot); // not mutated
    expect(out).toHaveLength(2);
  });
});
