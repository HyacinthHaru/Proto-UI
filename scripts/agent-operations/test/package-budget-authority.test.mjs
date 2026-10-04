import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadSkillRegistry } from '../skill-registry.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const development = readFileSync(resolve(root, '.agents/skills/pui-dev/SKILL.md'), 'utf8');
const budgetRule = development.split('## Decide package-budget ceilings\n')[1]?.split('\n## ')[0];

test('package-byte decisions are bounded ordinary work without an additional human gate', () => {
  assert.ok(budgetRule, 'the development entrypoint must carry the package-budget rule');
  assert.match(budgetRule, /Within an authorized development task/);
  assert.match(budgetRule, /bounded numeric increase/);
  assert.match(budgetRule, /already accepted capability/);
  assert.match(budgetRule, /does not require an additional human gate/);
  assert.match(budgetRule, /not authority to accept a new capability or waive another gate/);
  assert.match(budgetRule, /does not expand other budgets or spending limits/);
});

test('package-byte decisions retain canonical attributable and integrated evidence', () => {
  for (const obligation of [
    /separately reviewable numeric transaction/,
    /exact baseline and candidate revisions/,
    /old and proposed ceilings/,
    /resulting headroom/,
    /do not raise a threshold merely to turn a failing check green/,
    /repository CI with the pinned toolchain as the canonical before\/after measurement/,
    /Node, esbuild, platform\/architecture, zlib, minified artifact hashes, gzip level/,
    /accidental dependency closure, duplicate Runtime copies, dead code and avoidable eager inclusion/,
    /isolate unchanged source across old\/new environments/,
    /Measure the integrated combination/,
    /Do not add isolated deltas or reuse stale feature-only measurements/,
    /Re-run the canonical blocking gate for the final candidate/,
  ]) {
    assert.match(budgetRule, obligation);
  }
});

test('package-byte decisions cannot replace the blocking gate or independent acceptance', () => {
  assert.match(budgetRule, /Preserve the blocking whole-entry gate/);
  assert.match(budgetRule, /measurement shape and external dependency boundary/);
  assert.match(budgetRule, /Consumer\/profile measurements remain supplementary diagnostics/);
  assert.match(budgetRule, /Keep earlier red runs and failed alternatives visible/);
  assert.match(budgetRule, /Independent review, trusted CI\/DCO, exact-head integration/);
  assert.match(budgetRule, /live permission and current authorization remain required/);
  assert.match(
    budgetRule,
    /An unresolved product-direction choice still needs its normal decision/
  );
  assert.match(
    budgetRule,
    /Publication, release, access, secrets, rulesets, security disclosure and provenance exceptions retain their existing boundaries/
  );
});

test('the repository entrypoint projects the single development budget rule', () => {
  const guide = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');
  assert.match(guide, /bounded numeric package-budget increases without an additional human gate/);
  assert.match(guide, /\.agents\/skills\/pui-dev\/SKILL\.md#decide-package-budget-ceilings/);
  assert.match(
    guide,
    /canonical measurements, separately reviewable transactions, independent review and all other gates remain required/
  );
});

test('package-budget autonomy does not grant the governance leaf write authority', () => {
  const registry = loadSkillRegistry({ root });
  const governance = registry.byId.get('pui-govern');
  assert.equal(governance.mutation, 'none');
  assert.match(budgetRule, /`pui-govern` remains read-only/);
});
