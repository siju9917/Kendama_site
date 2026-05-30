// checks.test.mjs — tests for the Kendama factory-level checks.
//
// Run with: node --test ops/checks/
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

// --- Regression: real repo is currently known-good. ---

for (const check of [brainIntegrity, noGithubActions, ruleCadence, humanQueue, noForbiddenMarkers]) {
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
