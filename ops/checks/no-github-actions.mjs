// no-github-actions.mjs
//
// GUARDRAILS.md #1-2. The factory's ONLY legitimate scheduling
// mechanism is a Claude Code Routine (scheduled trigger) or the
// local-cron fallback (ops/run-kendama.sh). GitHub Actions and any
// CI-based scheduler are absolutely prohibited. This check fails if
// a workflow surface has appeared in the repo.
//
// The read-only carve-out in GUARDRAILS.md #1 permits *reading*
// third-party Actions logs; it does not permit a workflow file to
// exist in THIS repo. So the presence of `.github/workflows/` (with
// any workflow file) is the violation this check detects.

import { isDir, exists, listFiles, finding } from './lib.mjs';

export const name = 'no-github-actions';

// Other CI scheduler config files that would also violate #2.
const FORBIDDEN_CI_FILES = [
  '.circleci/config.yml',
  '.travis.yml',
  'azure-pipelines.yml',
  '.gitlab-ci.yml',
  '.buildkite/pipeline.yml',
  'Jenkinsfile',
];

// Filesystem accessors are injectable (defaulting to the real ones) so the
// violation-detection path is unit-testable with a synthetic filesystem —
// otherwise the only coverage is "the real repo is clean", which a check that
// silently never fires would also pass.
export function run(deps = {}) {
  const isDirFn = deps.isDir ?? isDir;
  const existsFn = deps.exists ?? exists;
  const listFilesFn = deps.listFiles ?? listFiles;
  const findings = [];

  if (isDirFn('.github/workflows')) {
    const workflows = listFilesFn('.github/workflows').filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    if (workflows.length > 0) {
      findings.push(
        finding('P0', `GitHub Actions workflow file(s) present — prohibited by GUARDRAILS.md #1: ${workflows.join(', ')}`),
      );
    }
  }

  for (const f of FORBIDDEN_CI_FILES) {
    if (existsFn(f)) {
      findings.push(
        finding('P0', `CI-scheduler config present — prohibited by GUARDRAILS.md #2: ${f}`),
      );
    }
  }

  if (findings.length === 0) {
    findings.push(
      finding('info', 'No GitHub Actions workflows and no CI-scheduler config present (GUARDRAILS.md #1-2 upheld).'),
    );
  }

  return { name, findings };
}
