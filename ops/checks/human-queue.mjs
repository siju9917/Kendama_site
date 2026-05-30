// human-queue.mjs
//
// Integrity of the human action queue (`human/NEED_FROM_HUMAN.md`). The
// Sunday/Monday check-in walks the human through this list by number, so
// duplicate or gapped item numbers are genuinely confusing ("do item 4" —
// which one?). This check was added after a real defect: two items were
// both numbered `## 4.` (fixed 2026-05-30). Per 5.7.3 applied to the
// factory's own check roster, an observed defect leaves behind a check
// that would have caught it.
//
// Asserts the top-level item headings (`## N. ...`) are uniquely numbered
// and contiguous from 1.

import { readText, finding } from './lib.mjs';

export const name = 'human-queue';

// Top-level numbered item heading, e.g. "## 3. **[OPEN]** ...".
const ITEM_RE = /^##\s+(\d+)\.\s/gm;

export function analyze(text) {
  const findings = [];
  const nums = [];
  for (const m of text.matchAll(ITEM_RE)) nums.push(Number(m[1]));

  if (nums.length === 0) {
    findings.push(
      finding('P1', 'No `## N.` item headings found in human/NEED_FROM_HUMAN.md — the action-queue format changed or the file is empty.'),
    );
    return findings;
  }

  // Duplicates.
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) {
      findings.push(
        finding('P2', `human/NEED_FROM_HUMAN.md has two items numbered ${n} — the check-in walks the list by number, so numbers must be unique.`),
      );
    }
    seen.add(n);
  }

  // Contiguity from 1 (sorted, since items may be edited out of order).
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  if (sorted[0] !== 1) {
    findings.push(
      finding('P2', `human/NEED_FROM_HUMAN.md item numbering starts at ${sorted[0]}, not 1.`),
    );
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      findings.push(
        finding('P2', `human/NEED_FROM_HUMAN.md item numbering jumps from ${sorted[i - 1]} to ${sorted[i]} — a number is missing.`),
      );
    }
  }

  if (findings.length === 0) {
    findings.push(
      finding('info', `${nums.length} human-queue items, uniquely numbered 1–${sorted[sorted.length - 1]}.`),
    );
  }
  return findings;
}

export function run() {
  return { name, findings: analyze(readText('human/NEED_FROM_HUMAN.md')) };
}
