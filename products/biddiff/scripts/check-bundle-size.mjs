#!/usr/bin/env node
/**
 * Bundle-size budget gate (QUALITY_BAR "Bundle/binary size meets a
 * documented budget"). Run after `npm run build`, as part of
 * `scripts/ci.sh`. Measures GZIPPED sizes of the emitted JS chunks and
 * fails if a chunk or the total exceeds the documented budget below.
 *
 * The pdf.js *worker* is excluded: it's a fixed external library cost
 * loaded lazily only during PDF extraction, not part of the side panel's
 * interactive bundle. The budgets target the code we actually author/own.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Documented budgets (gzipped). Keep ~20-25% headroom over observed sizes;
// tightening is welcome, loosening needs a noted reason (a real new feature).
const MAX_CHUNK_GZ = 230 * 1024; // largest single non-worker chunk
const MAX_TOTAL_GZ = 460 * 1024; // sum of all non-worker JS chunks

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "dist", "assets");
const fmt = (n) => `${(n / 1024).toFixed(1)} kB`;

if (!existsSync(assets)) {
  console.error("dist/assets/ missing — run `npm run build` first.");
  process.exit(2);
}

const files = readdirSync(assets).filter((f) => f.endsWith(".js") && !/worker/i.test(f));
let total = 0;
let maxName = "";
let maxGz = 0;
for (const f of files) {
  const gz = gzipSync(readFileSync(join(assets, f))).length;
  total += gz;
  if (gz > maxGz) {
    maxGz = gz;
    maxName = f;
  }
}

console.log(
  `bundle: ${files.length} non-worker JS chunks · total ${fmt(total)} gz · largest ${maxName} ${fmt(maxGz)} gz`,
);

let failed = false;
if (maxGz > MAX_CHUNK_GZ) {
  console.error(`FAIL: largest chunk ${fmt(maxGz)} exceeds budget ${fmt(MAX_CHUNK_GZ)}.`);
  failed = true;
}
if (total > MAX_TOTAL_GZ) {
  console.error(`FAIL: total ${fmt(total)} exceeds budget ${fmt(MAX_TOTAL_GZ)}.`);
  failed = true;
}
if (failed) process.exit(1);
console.log("bundle size within budget.");
