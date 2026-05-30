// brain-integrity.mjs
//
// PART 2.4 / SELF_IMPROVEMENT.md #7. Verifies the factory's memory
// is structurally intact at session start. The brain IS the
// factory's only memory between sessions (CLAUDE.md); a missing or
// emptied brain file is silent amnesia. This check fails loudly
// instead.
//
// It does NOT judge content quality (that is the META loop's job).
// It asserts the load-bearing files exist and are non-empty, and
// that STATE.md still has its required sections.

import { exists, isDir, readText, finding } from './lib.mjs';

export const name = 'brain-integrity';

// Files CLAUDE.md and ops/loop.md depend on every session. If any of
// these is missing the session cannot operate as specified.
const REQUIRED_FILES = [
  'CLAUDE.md',
  'README.md',
  'brain/STATE.md',
  'brain/PORTFOLIO.md',
  'brain/IDEA_BACKLOG.md',
  'brain/RANKING.md',
  'brain/SELF_IMPROVEMENT.md',
  'brain/DECISIONS.md',
  'brain/META_LESSONS.md',
  'brain/LESSONS.md',
  'brain/WISHLIST.md',
  'brain/MARKET_SIGNALS.md',
  'governance/CRITIQUE_AGENTS.md',
  'governance/GUARDRAILS.md',
  'governance/QUALITY_BAR.md',
  'governance/SCORING_MODEL.md',
  'governance/SPEND_CAP.md',
  'human/APPROVALS.md',
  'human/HOW_TO_USE.md',
  'human/NEED_FROM_HUMAN.md',
  'human/WEEKLY_DIGEST.md',
  'ops/loop.md',
  'ops/SCHEDULE_SETUP.md',
  'ops/run-kendama.sh',
];

const REQUIRED_DIRS = [
  'brain/PLAYBOOKS',
  'brain/RESEARCH',
  'ops/session-logs',
  'products',
  'play/experiments',
];

// STATE.md must keep these section anchors — they are the handoff
// contract the next session reads.
const STATE_SECTIONS = [
  '## Session',
  '## Active product',
  '## Queue snapshot',
  '## Next five actions',
];

export function run() {
  const findings = [];

  for (const f of REQUIRED_FILES) {
    if (!exists(f)) {
      findings.push(finding('P0', `Required brain/governance file missing: ${f}`));
      continue;
    }
    if (readText(f).trim().length === 0) {
      findings.push(finding('P0', `Required file is empty: ${f}`));
    }
  }

  for (const d of REQUIRED_DIRS) {
    if (!isDir(d)) {
      findings.push(finding('P1', `Required directory missing: ${d}/`));
    }
  }

  if (exists('brain/STATE.md')) {
    const state = readText('brain/STATE.md');
    for (const section of STATE_SECTIONS) {
      if (!state.includes(section)) {
        findings.push(
          finding('P1', `brain/STATE.md is missing its "${section}" section — the session-handoff contract is broken.`),
        );
      }
    }
  }

  if (findings.length === 0) {
    findings.push(
      finding('info', `${REQUIRED_FILES.length} required files present and non-empty; ${REQUIRED_DIRS.length} required directories present; STATE.md handoff sections intact.`),
    );
  }

  return { name, findings };
}
