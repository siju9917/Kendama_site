// rule-cadence-consistency.mjs
//
// SELF_IMPROVEMENT.md #6. Prevents silent drift between the 5.7.N
// maximization rules defined in CLAUDE.md and the operational
// cadence/roster documents that are supposed to give each rule a
// home (ops/loop.md's "Cadences" heartbeat and the cadence section
// of governance/CRITIQUE_AGENTS.md).
//
// Two-way consistency:
//   1. Every 5.7.N rule DEFINED in CLAUDE.md must be REFERENCED in
//      at least one operational doc. A maximization rule with no
//      operational home has decayed into prose nobody runs.
//   2. Every 5.7.N REFERENCE in an operational doc must map to a
//      rule that actually exists in CLAUDE.md. A dangling reference
//      means a rule was renumbered or removed without updating the
//      docs that depend on it.
//   3. The defined rule set must be contiguous (1..max) — a gap
//      means a rule was deleted, which on a maximization-rule set is
//      itself suspicious (GUARDRAILS.md #16 / #12).

import { readText, finding } from './lib.mjs';

export const name = 'rule-cadence-consistency';

// Bold definition marker, e.g. `- **5.7.1 Mandatory re-critique...`.
const DEF_RE = /\*\*5\.7\.(\d+)\b/g;
// Any reference token, e.g. `5.7.4`, `(5.7.7)`, `5.7.7 + 5.7.8`.
const REF_RE = /\b5\.7\.(\d+)\b/g;

export function numsFrom(text, re) {
  const set = new Set();
  for (const m of text.matchAll(re)) set.add(Number(m[1]));
  return set;
}

// Pure analysis, separated from file I/O so drift detection is unit
// testable with synthetic inputs.
export function analyze({ claude, loop, critics }) {
  const findings = [];

  const defined = numsFrom(claude, DEF_RE);
  if (defined.size === 0) {
    findings.push(
      finding('P0', 'No `**5.7.N` rule definitions found in CLAUDE.md — the maximization rule set is missing or its format changed.'),
    );
    return findings;
  }

  // References that live in operational docs (where a rule earns a home).
  const opRefs = new Set([
    ...numsFrom(loop, REF_RE),
    ...numsFrom(critics, REF_RE),
  ]);

  const sorted = [...defined].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];

  // (3) Contiguity.
  for (let n = 1; n <= max; n++) {
    if (!defined.has(n)) {
      findings.push(
        finding('P1', `Rule 5.7.${n} is not defined in CLAUDE.md but 5.7.${max} is — the maximization rule set has a gap (a rule may have been removed without approval; see GUARDRAILS.md #12).`),
      );
    }
  }

  // (1) Every defined rule has an operational home.
  for (const n of sorted) {
    if (!opRefs.has(n)) {
      findings.push(
        finding('P1', `Rule 5.7.${n} is defined in CLAUDE.md but is never referenced in ops/loop.md or governance/CRITIQUE_AGENTS.md — it has no operational cadence/home and will not actually run.`),
      );
    }
  }

  // (2) No dangling operational reference.
  for (const n of opRefs) {
    if (!defined.has(n)) {
      findings.push(
        finding('P1', `5.7.${n} is referenced in an operational doc (ops/loop.md or governance/CRITIQUE_AGENTS.md) but no matching **5.7.${n}** rule is defined in CLAUDE.md — a dangling reference (rule renamed/removed without updating dependents).`),
      );
    }
  }

  if (findings.length === 0) {
    findings.push(
      finding('info', `${sorted.length} maximization rules (5.7.1–5.7.${max}) defined in CLAUDE.md, all with operational references and no dangling references.`),
    );
  }

  return findings;
}

export function run() {
  return {
    name,
    findings: analyze({
      claude: readText('CLAUDE.md'),
      loop: readText('ops/loop.md'),
      critics: readText('governance/CRITIQUE_AGENTS.md'),
    }),
  };
}
