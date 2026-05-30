// no-forbidden-markers.mjs
//
// Enforces GUARDRAILS.md #10 across every product: no TODO / FIXME / XXX
// / HACK marker survives in shipped source (a closed phase / shipped
// product), unless it is a documented human-gated blocker in
// `human/NEED_FROM_HUMAN.md`. Scans `products/*/src/**` (excludes test
// files and legacy-notes). A hit is P1 — the operator must either resolve
// it or convert it into a documented blocker.
//
// The marker pattern avoids false positives: a negative lookbehind for a
// word char OR a dot (so the `XXX` in a clause format like `XX.XXX-XXXX`
// is NOT flagged) and a negative lookahead for a word char.

import { listFiles, readText, finding } from './lib.mjs';

export const name = 'no-forbidden-markers';

const MARKER_RE = /(?<![\w.])(TODO|FIXME|HACK|XXX)(?![\w])/;

export function scan(files, read) {
  const findings = [];
  for (const f of files) {
    // Shipped source only: product src, excluding tests + legacy notes.
    if (!/\/products\/[^/]+\/src\//.test('/' + f)) continue;
    if (/\.(test|spec)\.[tj]sx?$/.test(f)) continue;
    if (!/\.[tj]sx?$/.test(f)) continue;
    const text = read(f);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (MARKER_RE.test(lines[i])) {
        findings.push(
          finding('P1', `${f}:${i + 1} contains a forbidden marker (TODO/FIXME/XXX/HACK) — resolve it or record it as a documented blocker in human/NEED_FROM_HUMAN.md (GUARDRAILS #10).`),
        );
      }
    }
  }
  if (findings.length === 0) {
    findings.push(finding('info', `No TODO/FIXME/XXX/HACK markers in any product's shipped src.`));
  }
  return findings;
}

export function run() {
  return { name, findings: scan(listFiles('products'), readText) };
}
