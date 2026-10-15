import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const root = new URL('../../', import.meta.url);
const workflow = parse(
  readFileSync(new URL('.github/workflows/liquid-material-evidence.yml', root), 'utf8')
);
const paths = workflow.on.pull_request.paths;
const covered = (file) => paths.some((pattern) => matchesGlob(file, pattern));
for (const file of [
  'packages/modules/feedback/src/material/shared-policy.ts',
  'packages/modules/feedback/src/material/visual-result.ts',
]) {
  test(`Liquid Glass evidence covers policy input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing material evidence input: ${file}`);
  });
}
test('Liquid Glass evidence validates its bounded trigger contract in CI', () => {
  assert.ok(covered('scripts/test/liquid-material-evidence-inputs.test.mjs'));
  assert.equal(covered('README.md'), false);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok(
    Object.values(workflow.jobs).some((job) =>
      job.steps?.some((step) =>
        step.run?.includes('scripts/test/liquid-material-evidence-inputs.test.mjs')
      )
    )
  );
});

for (const file of [
  'packages/prototypes/liquid-glass/src/toggle/toggle.proto.ts',
  'packages/prototypes/base/src/toggle/toggle.proto.ts',
  'packages/core/src/index.ts',
  'packages/runtime/src/index.ts',
  'packages/hooks/src/index.ts',
  'apps/www/src/pages/en/test/liquid-glass-toggle.astro',
  'apps/www/src/content/docs/zh-cn/demo-liquid-glass-toggle.browser.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-failure-diagnostics.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-failure-diagnostics.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-tint-probe.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-detail-metrics.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-detail-metrics.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-detail-probe.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-detail-probe.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-snapshot.ts',
  'apps/www/src/content/docs/zh-cn/liquid-toggle-snapshot.test.ts',
  'apps/www/scripts/diagnose-select-click.ts',
  'apps/www/src/content/docs/demo_components/liquid-glass/demo-liquid-glass-toggle.demo.ts',
  'apps/www/src/content/docs/en/ui-libraries/liquid-glass/toggle.mdx',
  'apps/www/src/content/docs/zh-cn/ui-libraries/liquid-glass/toggle.mdx',
  'apps/www/src/content/docs/zh-cn/browser-harness.ts',
  'apps/www/src/content/docs/zh-cn/material-paint-observation.ts',
  'apps/www/src/content/docs/zh-cn/material-paint-observation.test.ts',
  'scripts/test/runtime-test-plan.mjs',
  'apps/www/astro.config.mjs',
  'pnpm-lock.yaml',
  'vitest.config.ts',
]) {
  test(`Liquid Toggle material evidence covers source input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing material evidence input: ${file}`);
  });
}
test('Liquid Toggle executes in the retained exact-head optical evidence job', () => {
  const job = workflow.jobs['browser-evidence'];
  assert.equal(
    workflow.env.CANDIDATE_SHA,
    '${{ github.event.pull_request.head.sha || github.sha }}'
  );
  assert.equal(job.steps[0].with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.ok(
    job.steps.some((step) => step.run?.includes('demo-liquid-glass-toggle.browser.test.ts'))
  );
  for (const suite of [
    'packages/prototypes/liquid-glass/test/toggle.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-toggle-failure-diagnostics.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-toggle-snapshot.test.ts',
  ])
    assert.ok(
      job.steps.some((step) => step.run?.includes(suite)),
      `Missing Toggle regression: ${suite}`
    );
  assert.ok(
    job.steps.some((step) => step.if === 'always()' && step.uses === 'actions/upload-artifact@v4')
  );
});

test('Liquid portal capability controls execute alongside unchanged native optical journeys', () => {
  const steps = workflow.jobs['browser-evidence'].steps;
  for (const suite of [
    'packages/adapters/base/test/portal-destination.test.ts',
    'packages/adapters/base/test/portal-inline-size.test.ts',
    'apps/www/src/content/docs/zh-cn/demo-liquid-glass-portal.browser.test.ts',
    'apps/www/src/content/docs/zh-cn/demo-liquid-glass-toggle.browser.test.ts',
  ]) {
    assert.ok(covered(suite), `Missing portal capability evidence trigger: ${suite}`);
    assert.ok(
      steps.some((step) => step.run?.includes(suite)),
      `Missing portal capability suite: ${suite}`
    );
  }
});
