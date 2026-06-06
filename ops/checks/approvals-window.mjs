// approvals-window.mjs — flags an OPEN approval proposal whose auto-proceed
// window has elapsed, so a session can't silently miss that it should now
// proceed on the documented default.
//
// `human/APPROVALS.md` proposals carry an auto-proceed deadline ("...if no
// response by YYYY-MM-DD") and a Status line. When the real date is on/after
// a still-open proposal's deadline, the factory is supposed to apply the
// default and update the Status to AUTO-PROCEEDED (APPROVALS "Working notes").
// Nothing enforced that an elapsed window gets noticed — this does.
//
// Deliberately scoped to the "## Open proposals" section so the "## Closed
// proposals (audit trail)" history (which legitimately contains past dates)
// never trips it. Pure text + a clock; no I/O beyond reading the file.

import { readText, finding } from './lib.mjs';

export const name = 'approvals-window';

// A proposal is "resolved" if its actual metadata Status line (formatted
// **Status:** in bold markdown) is anything other than the awaiting placeholder.
// Must match ONLY the real status bullet — NOT the example response-format lines
// in the proposal body, which are backtick-quoted (`Status: APPROVED ...`).
// The bold `**Status:**` marker is the distinguishing feature; backtick examples
// do NOT have the surrounding `**`.
const RESOLVED_RE = /\*\*Status:\*\*\s*_*\s*(APPROVED|REJECTED|REDIRECT|AUTO-PROCEEDED)/i;
const DEADLINE_RE = /no response by\s+(\d{4})-(\d{2})-(\d{2})/i;

/** today = a Date; text = APPROVALS.md contents. */
export function analyze(text, today = new Date()) {
  const findings = [];
  // Restrict to the Open-proposals section (up to the Closed-proposals or
  // Working-notes heading) so closed/audit history never trips the check.
  const openStart = text.indexOf('## Open proposals');
  if (openStart === -1) {
    findings.push(finding('info', 'APPROVALS.md has no "## Open proposals" section.'));
    return findings;
  }
  const rest = text.slice(openStart + '## Open proposals'.length);
  const endMatch = rest.search(/\n## (Closed proposals|Working notes)/);
  const openSection = endMatch === -1 ? rest : rest.slice(0, endMatch);

  // Split into per-proposal blocks on "### " headings.
  const blocks = openSection.split(/\n### /).slice(1);
  for (const block of blocks) {
    const title = block.split('\n', 1)[0].trim();
    const resolved = RESOLVED_RE.test(block);
    const dl = block.match(DEADLINE_RE);
    if (!dl) continue; // no auto-proceed deadline → nothing to enforce here
    if (resolved) continue; // already actioned

    // Compare dates at day granularity in UTC (the deadline is a calendar day).
    const deadline = Date.UTC(Number(dl[1]), Number(dl[2]) - 1, Number(dl[3]));
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    if (todayUtc >= deadline) {
      findings.push(
        finding('P1', `APPROVALS proposal "${title}" is still open but its auto-proceed window elapsed on ${dl[1]}-${dl[2]}-${dl[3]}. Apply the documented default now and update its Status to AUTO-PROCEEDED (APPROVALS "Working notes").`),
      );
    }
  }
  if (findings.length === 0) {
    findings.push(finding('info', 'No open approval proposal has an elapsed auto-proceed window.'));
  }
  return findings;
}

export function run() {
  return { name, findings: analyze(readText('human/APPROVALS.md'), new Date()) };
}
