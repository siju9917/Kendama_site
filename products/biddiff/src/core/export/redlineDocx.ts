/**
 * Redline DOCX export (POLISH N3) — a Word document capture teams can attach
 * to a review. A `.docx` is a zip of OOXML, built here with the existing
 * JSZip dependency (no new dep). Deletions render struck-through + red,
 * insertions underlined + green; critical changes first; the canonical
 * disclaimer at the end. Reports, never advises.
 *
 * GATE (per PROGRESS.md N3): a user-facing Word export must render
 * *professionally* in Word, which cannot be verified headless. This module
 * (generator + structural tests below) is built BEHIND that gate — it is NOT
 * yet wired to a UI button. Before exposing a button, a human opens a
 * generated file in Word once to confirm it renders cleanly. Until then this
 * is dead-but-tested code: valid OOXML, contains the change text + disclaimer.
 */
import JSZip from "jszip";
import type { Change, DiffResult } from "../diff/types.js";
import { DISCLAIMER_TEXT } from "../../shared/disclaimer.js";
import { CATEGORY_LABELS } from "../../shared/constants.js";

/** Escape text for inclusion in XML character data / attribute values. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A single <w:p> paragraph with one run, optional bold/color/strike/underline. */
function para(
  text: string,
  opts: { bold?: boolean; color?: string; strike?: boolean; underline?: boolean; heading?: boolean } = {},
): string {
  const rpr: string[] = [];
  if (opts.bold) rpr.push("<w:b/>");
  if (opts.strike) rpr.push("<w:strike/>");
  if (opts.underline) rpr.push('<w:u w:val="single"/>');
  if (opts.color) rpr.push(`<w:color w:val="${opts.color}"/>`);
  if (opts.heading) rpr.push('<w:sz w:val="28"/>', "<w:b/>");
  const rPr = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function changeParagraphs(c: Change): string {
  const out: string[] = [];
  const cat = CATEGORY_LABELS[c.category] ?? c.category;
  const sec = c.ucfLetter ? `[Section ${c.ucfLetter}] ` : "";
  const tag = c.severity === "CRITICAL" ? "CRITICAL · " : "";
  out.push(para(`${tag}${sec}${cat}`, { bold: true }));
  for (const r of c.criticalReasons) out.push(para(`• ${r}`));
  if (c.beforeText) out.push(para(`Prior: ${c.beforeText}`, { strike: true, color: "C00000" }));
  if (c.afterText) out.push(para(`New: ${c.afterText}`, { underline: true, color: "006100" }));
  if (c.clauseInfo) {
    out.push(para(`Clause: ${c.clauseInfo.regulation} ${c.clauseInfo.clauseNumber} — ${c.clauseInfo.title}`));
  }
  out.push(para("")); // spacer
  return out.join("");
}

/** Build the `word/document.xml` body for the redline. */
export function buildRedlineDocumentXml(result: DiffResult): string {
  const critical = result.changes.filter((c) => c.severity === "CRITICAL");
  const normal = result.changes.filter((c) => c.severity !== "CRITICAL");
  const body: string[] = [];
  body.push(para("BidDiff — Solicitation Amendment Redline", { heading: true }));
  body.push(
    para(
      `Compared: ${result.currentDoc.sourceFileName} vs. ${result.priorDoc.sourceFileName}`,
    ),
  );
  body.push(para(`Total changes: ${result.changes.length} · Critical: ${result.criticalCount}`));
  body.push(para(""));
  if (critical.length) {
    body.push(para("Critical changes", { heading: true }));
    for (const c of critical) body.push(changeParagraphs(c));
  }
  if (normal.length) {
    body.push(para("Other changes", { heading: true }));
    for (const c of normal) body.push(changeParagraphs(c));
  }
  body.push(para(""));
  body.push(para(DISCLAIMER_TEXT, { color: "595959" }));
  // A final <w:sectPr> (US Letter, 1" margins) — Word expects the body to end
  // with section properties; omitting it makes some Word versions warn or
  // render with odd page geometry. Twips: 12240×15840 page, 1440 margins.
  const sectPr =
    `<w:sectPr>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>` +
    `</w:sectPr>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body.join("")}${sectPr}</w:body></w:document>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

/** Produce the redline as a .docx Blob. */
export async function exportRedlineDocx(result: DiffResult): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/document.xml", buildRedlineDocumentXml(result));
  const buf = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
