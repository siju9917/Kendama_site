/**
 * DOCX extractor test: build a tiny .docx with JSZip in-memory, then extract.
 */
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { DocxExtractor, parseDocumentXml } from "./docxExtractor.js";

async function buildDocx(documentXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

const SAMPLE_DOCX_BODY = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>SECTION L — INSTRUCTIONS TO OFFERORS</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Offers are due 2026-08-15.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>The proposal shall not exceed 30 pages.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>SECTION M — EVALUATION FACTORS FOR AWARD</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Technical approach is the most important factor.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

describe("parseDocumentXml", () => {
  it("parses paragraphs and styles", () => {
    const paras = parseDocumentXml(SAMPLE_DOCX_BODY);
    expect(paras.length).toBe(5);
    expect(paras[0].text).toContain("SECTION L");
    expect(paras[0].styleName).toBe("Heading1");
    expect(paras[2].text).toContain("30 pages");
  });

  it("emits table rows with cells pipe-joined (real solicitations use tables for CLINs)", () => {
    const tableXml = `<?xml version="1.0"?>
<w:document xmlns:w="x"><w:body>
  <w:p><w:r><w:t>CLIN Schedule</w:t></w:r></w:p>
  <w:tbl>
    <w:tr><w:tc><w:p><w:r><w:t>CLIN 0001</w:t></w:r></w:p></w:tc>
           <w:tc><w:p><w:r><w:t>Help Desk Services</w:t></w:r></w:p></w:tc>
           <w:tc><w:p><w:r><w:t>12 Months</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>CLIN 0002</w:t></w:r></w:p></w:tc>
           <w:tc><w:p><w:r><w:t>Optional Tier 3 Support</w:t></w:r></w:p></w:tc>
           <w:tc><w:p><w:r><w:t>12 Months</w:t></w:r></w:p></w:tc></w:tr>
  </w:tbl>
</w:body></w:document>`;
    const paras = parseDocumentXml(tableXml);
    const texts = paras.map((p) => p.text);
    // One header paragraph + two table rows.
    expect(texts).toContain("CLIN Schedule");
    expect(texts).toContain("CLIN 0001 | Help Desk Services | 12 Months");
    expect(texts).toContain("CLIN 0002 | Optional Tier 3 Support | 12 Months");
    // Table rows should be tagged.
    const tableRows = paras.filter((p) => p.styleName === "TableRow");
    expect(tableRows.length).toBe(2);
  });

  it("decodes XML entities", () => {
    const xml =
      "<w:document xmlns:w=\"x\"><w:body><w:p><w:r><w:t>at &amp; sign &lt;here&gt;</w:t></w:r></w:p></w:body></w:document>";
    const paras = parseDocumentXml(xml);
    expect(paras[0].text).toBe("at & sign <here>");
  });
});

describe("DocxExtractor", () => {
  it("extracts a tiny DOCX into a StructuredDocument", async () => {
    const buf = await buildDocx(SAMPLE_DOCX_BODY);
    const extractor = new DocxExtractor();
    const doc = await extractor.extract(buf, "sample.docx");
    const letters = doc.sections.map((s) => s.ucfLetter);
    expect(letters).toContain("L");
    expect(letters).toContain("M");
    const allText = doc.sections.flatMap((s) => s.blocks.map((b) => b.text)).join(" ");
    expect(allText).toContain("2026-08-15");
    expect(allText).toContain("30 pages");
  });

  it("rejects empty docx with EMPTY error", async () => {
    const buf = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body></w:body></w:document>`,
    );
    const extractor = new DocxExtractor();
    await expect(extractor.extract(buf, "x.docx")).rejects.toMatchObject({ code: "EMPTY" });
  });
});
