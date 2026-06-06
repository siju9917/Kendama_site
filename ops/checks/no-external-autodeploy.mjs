// no-external-autodeploy.mjs
//
// GUARDRAILS.md #17. Kendama_site is a NON-DEPLOYABLE factory/brain repo.
// External hosts (Render, Netlify, Vercel, Heroku, ...) that auto-build on every
// push will fail forever on this repo and email on each failure — the "build
// failed for appraise-os" spam the human hit on 2026-06-06.
//
// The factory cannot disconnect a host's service from inside Git (that is a
// dashboard action, logged in human/NEED_FROM_HUMAN.md), but it CAN guarantee
// its own pushes never trigger a host build, via a commit-msg hook that appends
// host skip-tokens to every commit. This check verifies that interlock exists,
// skips the right tokens, is installable, and that the written guardrail backing
// it has not drifted.
//
// Pure file/text inspection (+ a best-effort read of .git/config for
// core.hooksPath). Dependency-free; safe at session start.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists, readText, finding, REPO_ROOT } from './lib.mjs';

export const name = 'no-external-autodeploy';

// Host deploy descriptors that would wrongly advertise this factory repo as a
// deployable app. Render et al. deploy from dashboard config rather than these,
// so their presence is advisory (P2), not the primary trigger — but a deploy
// descriptor in a non-deployable repo is a smell worth surfacing.
const DEPLOY_DESCRIPTORS = [
  'render.yaml', 'render.yml', 'Procfile', 'netlify.toml',
  'vercel.json', 'now.json', 'app.yaml', 'fly.toml', 'railway.json',
];

// Pure analysis over an explicit state object, so failure paths are unit
// testable on synthetic input (see rule-cadence-consistency.mjs's analyze()).
export function analyze(state) {
  const {
    hookExists, hookSkipsRender, installerExists,
    hooksPathSet, guardrailHasRule, presentDescriptors,
  } = state;
  const findings = [];

  // The interlock itself is the primary, no-approval defense.
  if (!hookExists) {
    findings.push(finding('P0', 'ops/githooks/commit-msg is MISSING — the commit auto-skip interlock (GUARDRAILS #17) is gone. Without it the factory’s constant pushes can trigger external host auto-deploy builds (the Render appraise-os build-failure email spam). Restore the hook.'));
  } else if (!hookSkipsRender) {
    findings.push(finding('P0', 'ops/githooks/commit-msg exists but no longer appends the host deploy skip-token "[skip render]" — the interlock is defanged. Repair it (GUARDRAILS #17).'));
  }

  if (!installerExists) {
    findings.push(finding('P1', 'ops/checks/install-githooks.mjs is missing — a fresh clone cannot activate the commit-msg hook (GUARDRAILS #17). Restore the installer and keep its call in ops/loop.md session start.'));
  }

  if (!guardrailHasRule) {
    findings.push(finding('P1', 'GUARDRAILS.md #17 (no external auto-deploy / non-deployable factory repo) is missing or has drifted — the written rule backing this interlock must stay present.'));
  }

  // hooksPath activation is per-clone and re-done every session by the loop's
  // install step, so a not-yet-activated clone is an advisory reminder, not a
  // blocking defect (the file-level protections above are the blocking ones).
  if (hookExists && !hooksPathSet) {
    findings.push(finding('P2', 'git core.hooksPath is not set to ops/githooks in this clone — the commit-msg auto-skip hook is inactive HERE until `node ops/checks/install-githooks.mjs` runs (ops/loop.md session-start step).'));
  }

  for (const d of presentDescriptors) {
    findings.push(finding('P2', `Host deploy descriptor "${d}" present at repo root — this factory repo is non-deployable (GUARDRAILS #17). If not deliberate, remove it; a deployed Kendama product belongs in its own separate repo.`));
  }

  if (findings.length === 0) {
    findings.push(finding('info', 'External auto-deploy interlock intact: commit-msg auto-skip hook present and wired, installer present, GUARDRAILS #17 in place, no stray deploy descriptors.'));
  }
  return findings;
}

// Best-effort read of this clone's core.hooksPath. Returns the configured value
// or null if it cannot be determined (a worktree, a missing config — never a
// hard failure: hooksPath activation is advisory, see analyze()).
function readGitHooksPath() {
  try {
    const dotgit = join(REPO_ROOT, '.git');
    let configPath = join(dotgit, 'config');
    try {
      // Succeeds only when .git is a FILE (a linked worktree): "gitdir: <path>".
      const raw = readFileSync(dotgit, 'utf8');
      const m = raw.match(/^gitdir:\s*(.+)$/m);
      if (m) configPath = join(m[1].trim(), 'config');
    } catch {
      // .git is a directory (normal clone) — use .git/config directly.
    }
    const cfg = readFileSync(configPath, 'utf8');
    const hp = cfg.match(/hooksPath\s*=\s*(.+)$/m);
    return hp ? hp[1].trim() : null;
  } catch {
    return null;
  }
}

export function run() {
  const hookRel = 'ops/githooks/commit-msg';
  const hookExists = exists(hookRel);
  const hookSkipsRender = hookExists && readText(hookRel).includes('[skip render]');
  const installerExists = exists('ops/checks/install-githooks.mjs');
  const hooksPathSet = readGitHooksPath() === 'ops/githooks';

  let guardrailHasRule = false;
  try {
    const g = readText('governance/GUARDRAILS.md');
    guardrailHasRule = /No external auto-deploy/i.test(g);
  } catch {
    /* brain-integrity owns the missing-file case */
  }

  const presentDescriptors = DEPLOY_DESCRIPTORS.filter((d) => exists(d));

  return {
    name,
    findings: analyze({
      hookExists, hookSkipsRender, installerExists,
      hooksPathSet, guardrailHasRule, presentDescriptors,
    }),
  };
}
