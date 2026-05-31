/**
 * Generate a sample PDF report for previewing the export layout.
 *
 *   npx tsx scripts/gen-sample-report.ts
 */
import fs from "node:fs";
import { DiffEngine } from "../src/core/diff/engine.js";
import { LocalClauseClient } from "../src/core/clauses/client.js";
import { enrichStructuredDocument } from "../src/core/extract/normalize.js";
import { loadPair } from "../test/corpus/harness.js";
import { exportPdfReport } from "../src/core/export/index.js";
import { exportRedlineDocx } from "../src/core/export/redlineDocx.js";

const pair = loadPair("stress-009-all-categories");
const engine = new DiffEngine(new LocalClauseClient());
const result = engine.diff(
  enrichStructuredDocument(pair.current),
  enrichStructuredDocument(pair.prior),
);
result.generatedAt = "2026-05-26T18:00:00.000Z";

const blob = await exportPdfReport(result);
const buf = Buffer.from(await blob.arrayBuffer());
// Write directly to the docs/store-assets directory so the artifact
// never lands at repo root (and can't be accidentally committed there).
const outDir = "docs/store-assets";
fs.mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/sample-report.pdf`;
fs.writeFileSync(outPath, buf);
console.log(`wrote ${outPath} (${buf.length} bytes; ${result.changes.length} changes, ${result.criticalCount} critical)`);

// Also emit the redline .docx (POLISH N3) for the one-time human Word-render
// check (human/NEED_FROM_HUMAN.md #9) before the export button is wired.
const docxBlob = await exportRedlineDocx(result);
const docxBuf = Buffer.from(await docxBlob.arrayBuffer());
const docxPath = `${outDir}/sample-redline.docx`;
fs.writeFileSync(docxPath, docxBuf);
console.log(`wrote ${docxPath} (${docxBuf.length} bytes) — open in Word to verify rendering before wiring the button`);
