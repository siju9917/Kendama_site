// governance-integrity.mjs
//
// Catches CORRUPTION of the factory's own governance/brain/ops markdown —
// the class of defect where operator narration or a botched edit overwrites
// real content and gets committed undetected. This actually happened
// (2026-05-30): an edit overwrote ops/loop.md's "Session-end sequence" with
// duplicated headings and stray narration ("There appears to be an
// issue..."), and no check noticed. Per 5.7.3, the defect leaves behind a
// check that would have caught it.
//
// Two signatures:
//   1. Narration / scratchpad phrases that should never appear in a
//      committed factory document (operator "thinking" that leaked in).
//   2. The same substantial line repeated 3+ times in a row — a strong
//      mangled-edit signature (the loop.md corruption repeated one line ~20x).

import { listFiles, readText, finding } from './lib.mjs';

export const name = 'governance-integrity';

// Operator narration / model-voice that must never land in a committed doc.
const NARRATION = [
  /there appears to be an issue/i,
  /let me (read it directly|view the|check|look at)/i,
  /\bas an ai\b/i,
  /\bstale buffer\b/i,
  /wait\s*—\s*that last line is wrong/i,
  /i'll (now |go ahead and )?(read|view|check|fix)/i,
];

// Which trees to guard (markdown only; skip logs + the checks' own code).
function targetFiles() {
  const all = [
    'CLAUDE.md', 'README.md',
    ...listFiles('governance'),
    ...listFiles('ops'),
    ...listFiles('brain'),
  ];
  return all.filter(
    (f) => f.endsWith('.md') && !f.startsWith('ops/session-logs/'),
  );
}

export function scanText(rel, text) {
  const findings = [];
  for (const re of NARRATION) {
    const m = text.match(re);
    if (m) {
      findings.push(
        finding('P1', `${rel}: leaked operator narration / mangled-edit text "${m[0]}" — a committed factory doc must not contain scratchpad prose (governance-integrity).`),
      );
    }
  }
  // Repeated-identical-line signature.
  const lines = text.split('\n');
  let run = 1;
  for (let i = 1; i <= lines.length; i++) {
    const same = i < lines.length && lines[i] === lines[i - 1] && lines[i].trim().length > 20;
    if (same) {
      run++;
    } else {
      if (run >= 3) {
        findings.push(
          finding('P1', `${rel}:${i - run + 1}: a substantial line repeats ${run}× consecutively — a mangled-edit / corruption signature: "${lines[i - 1].slice(0, 50)}…"`),
        );
      }
      run = 1;
    }
  }
  return findings;
}

export function run() {
  const findings = [];
  for (const f of targetFiles()) {
    findings.push(...scanText(f, readText(f)));
  }
  if (findings.length === 0) {
    findings.push(finding('info', 'No corruption signatures in factory governance/brain/ops markdown.'));
  }
  return { name, findings };
}
