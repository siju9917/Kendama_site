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
