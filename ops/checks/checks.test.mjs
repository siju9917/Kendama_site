// checks.test.mjs — tests for the Kendama factory-level checks.
//
// Run with: node --test ops/checks/*.test.mjs
//   (the bare-directory form `node --test ops/checks/` is not supported by
//   this Node version — it tries to load the dir as a module.)
//
// Dependency-free (node:test + node:assert). Two layers:
//   1. Unit tests of rule-cadence drift detection on synthetic input.
//   2. Regression tests: every check returns zero blocking findings
//      against the real repo, which is known-good right now. If a
//      future session breaks the brain, adds a workflow, or lets the
//      rules drift, these fail loudly.

import test from 'node:test';
import assert from 'node:assert/strict';

import { analyze } from './rule-cadence-consistency.mjs';
import * as ruleCadence from './rule-cadence-consistency.mjs';
import * as brainIntegrity from './brain-integrity.mjs';
import * as noGithubActions from './no-github-actions.mjs';
import * as humanQueue from './human-queue.mjs';
import { analyze as analyzeQueue } from './human-queue.mjs';
import * as noForbiddenMarkers from './no-forbidden-markers.mjs';
import { scan as scanMarkers } from './no-forbidden-markers.mjs';
import { redTeamStop, hookDecision } from './stop-guard.mjs';
import * as stopGuardLogic from './stop-guard-logic.mjs';
import * as governanceIntegrity from './governance-integrity.mjs';
import { scanText as scanGov } from './governance-integrity.mjs';
import * as checksRegistry from './checks-registry.mjs';
import { analyze as analyzeRegistry } from './checks-registry.mjs';
import * as stateCountSanity from './state-count-sanity.mjs';
import { analyze as analyzeStateCount } from './state-count-sanity.mjs';
import * as approvalsWindow from './approvals-window.mjs';
import { analyze as analyzeApprovals } from './approvals-window.mjs';
import { BLOCKING_LEVELS } from './lib.mjs';

const blocking = (findings) => findings.filter((f) => BLOCKING_LEVELS.has(f.level));

// A minimal well-formed rule set: three rules, each referenced.
const GOOD = {
  claude: 'Rules: **5.7.1 A** and **5.7.2 B** and **5.7.3 C**.',
  loop: 'Cadence rows reference 5.7.1 and 5.7.2 and 5.7.3.',
  critics: 'The roster cites 5.7.3.',
};

test('rule-cadence: well-formed rule set has no blocking findings', () => {
  assert.equal(blocking(analyze(GOOD)).length, 0);
});

test('rule-cadence: a defined-but-unreferenced rule is flagged', () => {
  const f = analyze({ ...GOOD, loop: '5.7.1 5.7.2', critics: '' });
  const hit = f.find((x) => x.message.includes('5.7.3') && x.message.includes('no operational'));
  assert.ok(hit, 'expected a finding about 5.7.3 having no operational home');
  assert.ok(BLOCKING_LEVELS.has(hit.level));
});

test('rule-cadence: a dangling operational reference is flagged', () => {
  const f = analyze({ ...GOOD, loop: '5.7.1 5.7.2 5.7.3 5.7.9' });
  const hit = f.find((x) => x.message.includes('5.7.9') && x.message.includes('dangling'));
  assert.ok(hit, 'expected a dangling-reference finding for 5.7.9');
});

test('rule-cadence: a gap in the rule set is flagged', () => {
  // 5.7.1 and 5.7.3 defined, 5.7.2 missing.
  const f = analyze({
    claude: '**5.7.1 A** **5.7.3 C**',
    loop: '5.7.1 5.7.3',
    critics: '',
  });
  const hit = f.find((x) => x.message.includes('5.7.2') && x.message.includes('gap'));
  assert.ok(hit, 'expected a contiguity-gap finding for 5.7.2');
});

test('rule-cadence: no rule definitions at all is a P0', () => {
  const f = analyze({ claude: 'no rules here', loop: '', critics: '' });
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'P0');
});

test('human-queue: well-numbered list passes', () => {
  const md = '## 1. a\nbody\n## 2. b\n## 3. c\n';
  assert.equal(blocking(analyzeQueue(md)).length, 0);
});

test('human-queue: duplicate item number is flagged', () => {
  const md = '## 1. a\n## 2. b\n## 2. c\n## 3. d\n';
  const hit = analyzeQueue(md).find((f) => f.message.includes('two items numbered 2'));
  assert.ok(hit, 'expected a duplicate-number finding');
});

test('human-queue: a gap in numbering is flagged', () => {
  const md = '## 1. a\n## 2. b\n## 4. d\n';
  const hit = analyzeQueue(md).find((f) => f.message.includes('jumps from 2 to 4'));
  assert.ok(hit, 'expected a contiguity-gap finding');
});

test('no-forbidden-markers: flags a real TODO in product src', () => {
  const read = () => '// TODO: fix this later\nconst x = 1;';
  const f = scanMarkers(['products/foo/src/a.ts'], read);
  assert.ok(f.some((x) => x.message.includes('forbidden marker')));
});

test('no-forbidden-markers: does NOT flag a clause format like XX.XXX-XXXX', () => {
  const read = () => '// matches the canonical XX.XXX-XXXX pattern';
  const f = scanMarkers(['products/foo/src/a.ts'], read);
  assert.equal(blocking(f).length, 0);
});

test('no-forbidden-markers: ignores test files', () => {
  const read = () => 'it("TODO later", () => {});';
  const f = scanMarkers(['products/foo/src/a.test.ts'], read);
  assert.equal(blocking(f).length, 0);
});

test('no-forbidden-markers: flags lowercase/mixed-case markers (case-insensitive)', () => {
  for (const src of ['// todo: fix this', '// FixMe before ship', '/* hack */']) {
    const f = scanMarkers(['products/foo/src/a.ts'], () => src);
    assert.ok(f.some((x) => x.message.includes('forbidden marker')), `should flag: ${src}`);
  }
});

test('no-forbidden-markers: does NOT flag identifiers containing a marker substring', () => {
  for (const src of ['const todoList = [];', 'function renderTodos() {}', 'const maxxx = 9;']) {
    const f = scanMarkers(['products/foo/src/a.ts'], () => src);
    assert.equal(blocking(f).length, 0, `should not flag: ${src}`);
  }
});

// The work window is the HUMAN's local Saturday (Mountain Time). These
// instants are chosen so the Mountain-time weekday is unambiguous.
test('stop-guard: REFUSES a stop on Saturday (the work window)', () => {
  const sat = new Date('2026-05-30T18:00:00Z'); // Sat 12:00 MDT
  const f = redTeamStop(sat, 'queue exhausted');
  assert.ok(f.some((x) => x.level === 'P0' && /STOP REFUSED/.test(x.message)));
});

test('stop-guard: rejects a non-"no longer Saturday" reason on Saturday', () => {
  const sat = new Date('2026-05-30T18:00:00Z');
  const f = redTeamStop(sat, 'diminishing returns');
  assert.ok(f.some((x) => x.message.includes('Rejected stop reason')));
});

test('stop-guard: PERMITS a stop once it is no longer Saturday', () => {
  const sun = new Date('2026-05-31T18:00:00Z'); // Sun 12:00 MDT
  const f = redTeamStop(sun);
  assert.equal(blocking(f).length, 0);
  assert.ok(f.some((x) => x.level === 'info' && /Stop permitted/.test(x.message)));
});

// REGRESSION (the timezone bug): Saturday evening in Mountain time is
// already Sunday in UTC. A UTC weekday check would wrongly authorize a stop;
// the guard must still REFUSE because it is Saturday for the human.
test('stop-guard: REFUSES on Saturday evening MT even though it is Sunday UTC', () => {
  const satEveningMT = new Date('2026-05-31T00:48:00Z'); // Sat 18:48 MDT, Sun 00:48 UTC
  assert.equal(satEveningMT.getUTCDay(), 0, 'precondition: this instant is Sunday in UTC');
  const f = redTeamStop(satEveningMT);
  assert.ok(
    f.some((x) => x.level === 'P0' && /STOP REFUSED/.test(x.message)),
    'must refuse: it is still Saturday evening in Mountain time',
  );
});

// BOUNDARY (the highest-stakes edge of the rule): the full Saturday in
// Mountain time must be preserved to the last minute, and the stop becomes
// permissible only once it is genuinely Sunday MT. MDT = UTC-6.
test('stop-guard: REFUSES at 23:59 Saturday MDT (the full Saturday is preserved)', () => {
  const satLastMinute = new Date('2026-05-31T05:59:00Z'); // Sat 23:59 MDT
  const f = redTeamStop(satLastMinute);
  assert.ok(
    f.some((x) => x.level === 'P0' && /STOP REFUSED/.test(x.message)),
    'one minute before Mountain midnight is still Saturday — must refuse',
  );
});

test('stop-guard: PERMITS just after midnight Sunday MDT (00:01)', () => {
  const sunFirstMinute = new Date('2026-05-31T06:01:00Z'); // Sun 00:01 MDT
  const f = redTeamStop(sunFirstMinute);
  assert.equal(blocking(f).length, 0, 'just past Mountain midnight it is Sunday — stop permitted');
});

test('stop-guard hook: BLOCKS the stop on Saturday', () => {
  const sat = new Date('2026-05-30T18:00:00Z');
  const d = hookDecision(sat);
  assert.equal(d.decision, 'block');
  assert.ok(/still Saturday/.test(d.reason));
});

test('stop-guard hook: BLOCKS on Saturday evening MT (Sunday UTC)', () => {
  const satEveningMT = new Date('2026-05-31T00:48:00Z');
  const d = hookDecision(satEveningMT);
  assert.equal(d.decision, 'block');
});

test('stop-guard hook: allows the stop once it is no longer Saturday', () => {
  const sun = new Date('2026-05-31T18:00:00Z'); // Sun 12:00 MDT
  const d = hookDecision(sun);
  assert.deepEqual(d, {});
});

test('governance-integrity: flags leaked operator narration', () => {
  const f = scanGov('ops/loop.md', '## Section\n\nThere appears to be an issue with the file.\n');
  assert.ok(f.some((x) => x.level === 'P1' && /leaked operator narration/.test(x.message)));
});

test('governance-integrity: flags a substantial line repeated 3+ times', () => {
  const dup = 'When a real limit is reached and we must consider stopping carefully.';
  const f = scanGov('ops/loop.md', [dup, dup, dup, dup].join('\n'));
  assert.ok(f.some((x) => /repeats 4×|repeats 4x/.test(x.message) || /repeats \d+× consecutively/.test(x.message)));
});

test('governance-integrity: clean text passes', () => {
  const f = scanGov('CLAUDE.md', '## Heading\n\nNormal prose that does not repeat.\n\n## Another\n');
  assert.equal(blocking(f).length, 0);
});

test('stop-guard-logic: the real guard logic is sound (no blocking findings)', () => {
  assert.equal(blocking(stopGuardLogic.analyze()).length, 0);
});

test('checks-registry: flags a check missing from run-all', () => {
  const f = analyzeRegistry(['ops/checks/orphan-check.mjs'], 'const CHECKS = [];', '`orphan-check`');
  assert.ok(f.some((x) => x.level === 'P1' && /NOT imported in run-all/.test(x.message)));
});

test('checks-registry: flags a check missing from the README', () => {
  const f = analyzeRegistry(['ops/checks/foo.mjs'], "import * as foo from './foo.mjs'", 'no mention here');
  assert.ok(f.some((x) => /not documented/.test(x.message)));
});

test('checks-registry: a fully-wired check passes', () => {
  const f = analyzeRegistry(['ops/checks/foo.mjs'], "'./foo.mjs'", '`foo`');
  assert.equal(blocking(f).length, 0);
});

test('checks-registry: ignores known infrastructure files (lib, run-all, etc.)', () => {
  const f = analyzeRegistry(
    ['ops/checks/lib.mjs', 'ops/checks/run-all.mjs', 'ops/checks/stop-guard.mjs', 'ops/checks/checks-registry.mjs'],
    'const CHECKS = [];',
    '',
  );
  assert.equal(blocking(f).length, 0);
});

test('state-count-sanity: a well-formed X/X headline passes', () => {
  const f = analyzeStateCount('intro\n- **Build green:** **385/385 tests** lint clean\nmore');
  assert.equal(blocking(f).length, 0);
});

test('state-count-sanity: a mangled X/Y headline is flagged P1', () => {
  const f = analyzeStateCount('- **Build green:** **288/312 tests** green');
  assert.ok(f.some((x) => x.level === 'P1' && /passed === total|mangled/.test(x.message)));
});

test('state-count-sanity: a missing headline is flagged', () => {
  const f = analyzeStateCount('STATE with no build-green line at all');
  assert.ok(f.some((x) => /no canonical/.test(x.message)));
});

test('state-count-sanity: duplicate headlines are flagged', () => {
  const f = analyzeStateCount('**Build green:** **385/385 tests**\n**Build green:** **385/385 tests**');
  assert.ok(f.some((x) => /\d+ .*headlines/.test(x.message)));
});

const APPROVALS_DOC = `## Open proposals
### Proposal #1 — test
- Auto-proceed window: defaults to REPOSITION if no response by 2026-06-03
- **Status:** _awaiting human response_
## Closed proposals (audit trail)
### old thing — no response by 2020-01-01
- **Status:** AUTO-PROCEEDED
`;

test('approvals-window: open proposal with elapsed window is flagged P1', () => {
  const after = new Date('2026-06-10T12:00:00Z');
  const f = analyzeApprovals(APPROVALS_DOC, after);
  assert.ok(f.some((x) => x.level === 'P1' && /auto-proceed window elapsed/.test(x.message)));
});

test('approvals-window: open proposal BEFORE its window does not flag', () => {
  const before = new Date('2026-05-30T12:00:00Z');
  const f = analyzeApprovals(APPROVALS_DOC, before);
  assert.equal(blocking(f).length, 0);
});

test('approvals-window: a resolved proposal never flags even past its date', () => {
  const doc = APPROVALS_DOC.replace('_awaiting human response_', 'APPROVED on 2026-05-28 by human');
  const f = analyzeApprovals(doc, new Date('2026-06-10T12:00:00Z'));
  assert.equal(blocking(f).length, 0);
});

test('approvals-window: dates in the Closed section never trip the check', () => {
  // The closed entry has a 2020 date but lives below "## Closed proposals".
  const f = analyzeApprovals(APPROVALS_DOC, new Date('2026-06-10T12:00:00Z'));
  // Only the open #1 should flag — exactly one P1, not two.
  assert.equal(f.filter((x) => x.level === 'P1').length, 1);
});

// --- Violation detection (the check must FAIL on a bad input, not just
//     pass on the clean real repo — a check that can never fire is useless). ---

test('no-github-actions: flags a workflow file as P0', () => {
  const { findings } = noGithubActions.run({
    isDir: (p) => p === '.github/workflows',
    listFiles: () => ['ci.yml', 'README.md'], // only the .yml counts
    exists: () => false,
  });
  const bad = blocking(findings);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].level, 'P0');
  assert.match(bad[0].message, /ci\.yml/);
});

test('no-github-actions: flags a foreign CI scheduler config as P0', () => {
  const { findings } = noGithubActions.run({
    isDir: () => false,
    listFiles: () => [],
    exists: (f) => f === 'Jenkinsfile',
  });
  const bad = blocking(findings);
  assert.equal(bad.length, 1);
  assert.match(bad[0].message, /Jenkinsfile/);
});

test('no-github-actions: clean filesystem yields only an info finding', () => {
  const { findings } = noGithubActions.run({
    isDir: () => false,
    listFiles: () => [],
    exists: () => false,
  });
  assert.equal(blocking(findings).length, 0);
  assert.ok(findings.some((f) => f.level === 'info'));
});

const STATE_OK = '## Session\n## Active product\n## Queue snapshot\n## Next five actions\n';

test('brain-integrity: flags a missing required file as P0', () => {
  const { findings } = brainIntegrity.run({
    exists: (f) => f !== 'CLAUDE.md', // CLAUDE.md is "missing"
    isDir: () => true,
    readText: (f) => (f === 'brain/STATE.md' ? STATE_OK : 'content'),
  });
  const bad = blocking(findings);
  assert.ok(bad.some((f) => f.level === 'P0' && /CLAUDE\.md/.test(f.message)));
});

test('brain-integrity: flags an empty required file as P0', () => {
  const { findings } = brainIntegrity.run({
    exists: () => true,
    isDir: () => true,
    readText: (f) => (f === 'brain/STATE.md' ? STATE_OK : f === 'brain/PORTFOLIO.md' ? '   ' : 'content'),
  });
  const bad = blocking(findings);
  assert.ok(bad.some((f) => f.level === 'P0' && /empty.*PORTFOLIO/i.test(f.message)));
});

test('brain-integrity: flags STATE.md missing a handoff section as P1', () => {
  const { findings } = brainIntegrity.run({
    exists: () => true,
    isDir: () => true,
    // STATE present but missing "## Queue snapshot".
    readText: (f) => (f === 'brain/STATE.md' ? '## Session\n## Active product\n## Next five actions\n' : 'content'),
  });
  assert.ok(findings.some((f) => f.level === 'P1' && /Queue snapshot/.test(f.message)));
});

// --- Regression: real repo is currently known-good. ---

for (const check of [brainIntegrity, noGithubActions, ruleCadence, humanQueue, noForbiddenMarkers, governanceIntegrity, stopGuardLogic, checksRegistry, stateCountSanity, approvalsWindow]) {
  test(`real repo passes: ${check.name}`, () => {
    const { findings } = check.run();
    const bad = blocking(findings);
    assert.equal(
      bad.length,
      0,
      `unexpected blocking findings:\n${bad.map((f) => `  ${f.level}: ${f.message}`).join('\n')}`,
    );
  });
}
