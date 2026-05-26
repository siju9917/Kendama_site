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

const pair = loadPair("stress-009-all-categories");
const engine = new DiffEngine(new LocalClauseClient());
const result = engine.diff(
  enrichStructuredDocument(pair.current),
  enrichStructuredDocument(pair.prior),
);
result.generatedAt = "2026-05-26T18:00:00.000Z";

const blob = await exportPdfReport(result);
const buf = Buffer.from(await blob.arrayBuffer());
const outPath = "biddiff-sample-report.pdf";
fs.writeFileSync(outPath, buf);
console.log(`wrote ${outPath} (${buf.length} bytes; ${result.changes.length} changes, ${result.criticalCount} critical)`);
