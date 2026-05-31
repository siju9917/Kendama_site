import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportRedlineDocx, buildRedlineDocumentXml, escapeXml } from "./redlineDocx.js";
import { parseDocumentXml } from "../extract/docx/docxExtractor.js";
import type { Change, DiffResult } from "../diff/types.js";

function change(p: Partial<Change>): Change {
  return {
    id: Math.random().toString(36).slice(2),
    changeType: "MODIFY",
    category: "DATES_DEADLINES",
    severity: "NORMAL",
    sectionHeading: "H",
    ucfLetter: "L",
    beforeText: "Offers are due 2026-08-15.",
    afterText: "Offers are due 2026-08-29.",
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

describe("escapeXml", () => {
  it("escapes the five XML metacharacters", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });
});

describe("buildRedlineDocumentXml", () => {
  it("is well-formed OOXML the DOCX reader can parse back", () => {
    const xml = buildRedlineDocumentXml(result([change({})]));
    // Round-trip through the product's own walker — proves the structure is
    // valid enough to read (paragraphs come back out).
    const paras = parseDocumentXml(xml);
    expect(paras.length).toBeGreaterThan(0);
    const allText = paras.map((p) => p.text).join("\n");
    expect(allText).toContain("Offers are due 2026-08-15."); // prior
    expect(allText).toContain("Offers are due 2026-08-29."); // new
    expect(allText).toContain("does not provide legal"); // disclaimer
  });

  it("emits run-properties in canonical CT_RPr order (Word rejects out-of-order rPr)", () => {
    // Insertion run = underlined + green color → color MUST precede u.
    // Heading = bold + larger size → b MUST precede sz.
    const xml = buildRedlineDocumentXml(
      result([change({ severity: "CRITICAL", criticalReasons: ["A date changed."] })]),
    );
    // No <w:u> ever appears before its sibling <w:color> within an rPr.
    for (const m of xml.matchAll(/<w:rPr>(.*?)<\/w:rPr>/g)) {
      const inner = m[1];
      if (inner.includes("<w:u ") && inner.includes("<w:color ")) {
        expect(inner.indexOf("<w:color "), `color before u in ${inner}`).toBeLessThan(inner.indexOf("<w:u "));
      }
      if (inner.includes("<w:b/>") && inner.includes("<w:sz ")) {
        expect(inner.indexOf("<w:b/>"), `b before sz in ${inner}`).toBeLessThan(inner.indexOf("<w:sz "));
      }
      if (inner.includes("<w:strike/>") && inner.includes("<w:color ")) {
        expect(inner.indexOf("<w:strike/>")).toBeLessThan(inner.indexOf("<w:color "));
      }
    }
  });

  it("ends the body with a sectPr (page geometry) so Word renders cleanly", () => {
    const xml = buildRedlineDocumentXml(result([change({})]));
    expect(xml).toContain("<w:sectPr>");
    expect(xml).toContain('<w:pgSz w:w="12240" w:h="15840"/>'); // US Letter
    expect(xml).toContain("</w:sectPr></w:body>"); // sectPr is the last body child
  });

  it("orders critical changes before normal ones", () => {
    const xml = buildRedlineDocumentXml(
      result([
        change({ severity: "NORMAL", afterText: "normal-change-text" }),
        change({ severity: "CRITICAL", criticalReasons: ["A date changed."], afterText: "critical-change-text" }),
      ]),
    );
    expect(xml.indexOf("Critical changes")).toBeLessThan(xml.indexOf("Other changes"));
    expect(xml.indexOf("critical-change-text")).toBeLessThan(xml.indexOf("normal-change-text"));
  });

  it("XML-escapes user/document text so angle brackets can't break the doc", () => {
    const xml = buildRedlineDocumentXml(result([change({ afterText: "uses <w:p> & </w:body> literally" })]));
    expect(xml).toContain("uses &lt;w:p&gt; &amp; &lt;/w:body&gt; literally");
    // The raw injected closing tag must NOT appear unescaped in the body text.
    expect(xml).not.toContain("uses <w:p>");
  });
});

describe("exportRedlineDocx", () => {
  it("produces a valid .docx zip with the OOXML parts", async () => {
    const blob = await exportRedlineDocx(result([change({ severity: "CRITICAL", criticalReasons: ["A date changed."] })]));
    expect(blob.type).toContain("wordprocessingml.document");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("_rels/.rels")).toBeTruthy();
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("BidDiff — Solicitation Amendment Redline");
    // And it round-trips back through the DOCX extractor's walker.
    const paras = parseDocumentXml(docXml);
    expect(paras.some((p) => p.text.includes("does not provide legal"))).toBe(true);
  });
});
