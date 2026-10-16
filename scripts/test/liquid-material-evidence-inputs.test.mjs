import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, matchesGlob } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const root = new URL('../../', import.meta.url);
const workflow = parse(
  readFileSync(new URL('.github/workflows/liquid-material-evidence.yml', root), 'utf8')
);
const paths = workflow.on.pull_request.paths;
const covered = (file) => paths.some((pattern) => matchesGlob(file, pattern));
const commandSpecInputs = [
  'spec/contracts/C-LIQUID-GLASS-COMMAND-INTERACTION-0001.yaml',
  'spec/tests/T-LIQUID-GLASS-COMMAND-INTERACTION-0001.yaml',
  'spec/prototypes/P-LIQUID-GLASS-TOGGLE.yaml',
  'spec/tests/T-LIQUID-GLASS-TOGGLE-0001.yaml',
];
for (const file of commandSpecInputs) {
  test(`Liquid command evidence covers governing entity ${file}`, () => {
    const entity = parse(readFileSync(new URL(file, root), 'utf8'));
    assert.equal(entity.id, basename(file, '.yaml'));
    assert.ok(covered(file), `Missing command evidence definition: ${file}`);
  });
}
test('Liquid evidence retains the bounded command, Toggle, tint and Button spec input union', () => {
  assert.deepEqual(
    paths.filter((pattern) => pattern.startsWith('spec/')).sort(),
    [
      ...commandSpecInputs,
      'spec/contracts/C-LIQUID-GLASS-MAIN-COMMAND-TINT-0001.yaml',
      'spec/tests/T-LIQUID-GLASS-MAIN-COMMAND-TINT-0001.yaml',
      'spec/prototypes/P-LIQUID-GLASS-BUTTON.yaml',
      'spec/tests/T-LIQUID-GLASS-BUTTON-0001.yaml',
    ].sort()
  );
  for (const file of [
    'spec/README.md',
    'spec/contracts/C-CORE-SYNTAX-0003.yaml',
    'spec/prototypes/P-SHADCN-TOGGLE.yaml',
  ]) {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.equal(covered(file), false, `Unrelated spec input must remain excluded: ${file}`);
  }
});
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
  'apps/www/src/content/docs/zh-cn/liquid-material-observation.ts',
  'apps/www/src/content/docs/zh-cn/public-portal-diagnostic.ts',
  'apps/www/src/content/docs/zh-cn/material-paint-observation.test.ts',
  'scripts/docs/test/liquid-toggle-mdx.test.mjs',
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

for (const file of [
  'packages/prototypes/liquid-glass/src/interactive-surface.ts',
  'packages/prototypes/liquid-glass/test/interactive-surface.test.ts',
  'apps/www/src/pages/en/test/liquid-glass-hover.astro',
  'apps/www/src/content/docs/zh-cn/demo-liquid-glass-hover.browser.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-hover-fixture.ts',
  'apps/www/src/content/docs/zh-cn/liquid-hover-capture.ts',
  'apps/www/src/content/docs/zh-cn/liquid-hover-fixture.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-hover-capture.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-hover-source-layout.test.ts',
  'apps/www/src/components/PrototypePreviewer/demo-types.ts',
  'apps/www/src/components/PrototypePreviewer/demo-renderer.ts',
  'apps/www/src/components/PrototypePreviewer/demo-renderer.hover-reenable.test.ts',
]) {
  test(`Liquid command interaction evidence covers source input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing hover evidence input: ${file}`);
  });
}
test('Liquid command interaction keeps original optical journeys and adds a separate native matrix', () => {
  const steps = workflow.jobs['browser-evidence'].steps;
  for (const suite of [
    'packages/prototypes/liquid-glass/test/interactive-surface.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-hover-fixture.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-hover-capture.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-hover-source-layout.test.ts',
    'apps/www/src/components/PrototypePreviewer/demo-renderer.hover-reenable.test.ts',
    'apps/www/src/content/docs/zh-cn/demo-liquid-glass-material.browser.test.ts',
    'apps/www/src/content/docs/zh-cn/demo-liquid-glass-portal.browser.test.ts',
    'apps/www/src/content/docs/zh-cn/demo-liquid-glass-toggle.browser.test.ts',
  ])
    assert.ok(
      steps.some((step) => step.run?.includes(suite)),
      `Missing suite: ${suite}`
    );
});

for (const file of [
  'packages/prototypes/liquid-glass/src/button/button.proto.ts',
  'packages/prototypes/liquid-glass/src/form/submit.proto.ts',
  'packages/prototypes/liquid-glass/src/form/reset.proto.ts',
  'apps/www/src/pages/en/test/liquid-glass-prominent-tint.astro',
  'apps/www/src/content/docs/zh-cn/demo-liquid-glass-prominent-tint.browser.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-fixture.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-fixture.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-test-harness.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-test-harness.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-capture.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-metrics.ts',
  'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-metrics.test.ts',
  'spec/contracts/C-LIQUID-GLASS-MAIN-COMMAND-TINT-0001.yaml',
  'spec/tests/T-LIQUID-GLASS-MAIN-COMMAND-TINT-0001.yaml',
  'spec/prototypes/P-LIQUID-GLASS-BUTTON.yaml',
  'spec/tests/T-LIQUID-GLASS-BUTTON-0001.yaml',
]) {
  test(`Main-command tint evidence covers source input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing prominent tint evidence input: ${file}`);
  });
}
test('Main-command tint uses independent runtime shards without replacing original journeys', () => {
  const job = workflow.jobs['prominent-tint-evidence'];
  assert.deepEqual(job.strategy.matrix.runtime, ['wc', 'react', 'vue', 'vue2']);
  assert.equal(job.strategy['fail-fast'], false);
  assert.equal(job['timeout-minutes'], 20);
  assert.equal(job.steps[0].with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.equal(job.steps[0].with['persist-credentials'], false);
  const evidence = job.steps.find((step) =>
    step.run?.includes('demo-liquid-glass-prominent-tint.browser.test.ts')
  );
  assert.ok(evidence);
  assert.equal(evidence.env.PROTO_UI_PROMINENT_TINT_RUNTIME, '${{ matrix.runtime }}');
  for (const suite of [
    'packages/prototypes/liquid-glass/test/button.test.ts',
    'packages/prototypes/liquid-glass/test/material.test.ts',
    'packages/prototypes/liquid-glass/test/interactive-surface.test.ts',
    'packages/prototypes/base/test/form-actions-material.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-fixture.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-test-harness.test.ts',
    'apps/www/src/content/docs/zh-cn/liquid-prominent-tint-metrics.test.ts',
  ])
    assert.ok(evidence.run.includes(suite), `Missing main-command tint regression: ${suite}`);
  assert.ok(
    job.steps.some((step) => step.if === 'always()' && step.uses === 'actions/upload-artifact@v4')
  );
  assert.equal(workflow.jobs['browser-evidence']['timeout-minutes'], 20);
});

test('Liquid hover runs all four runtime shards without sharing the optical job deadline', () => {
  const job = workflow.jobs['hover-evidence'];
  assert.ok(job, 'Missing independent hover evidence job');
  assert.equal(job['timeout-minutes'], 20);
  assert.equal(job.strategy['fail-fast'], false);
  assert.deepEqual(job.strategy.matrix.runtime, ['wc', 'react', 'vue', 'vue2']);
  assert.equal(job.steps[0].with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.equal(job.steps[0].with['persist-credentials'], false);
  assert.equal(job.needs, undefined, 'Hover must not wait for the optical job');
  const native = 'apps/www/src/content/docs/zh-cn/demo-liquid-glass-hover.browser.test.ts';
  const commands = job.steps.filter((step) => step.run?.includes(native));
  assert.equal(commands.length, 1);
  assert.equal(commands[0].env.PROTO_UI_HOVER_RUNTIME, '${{ matrix.runtime }}');
  assert.equal(commands[0].env.PROTO_UI_BROWSER_BASE_URL, undefined);
  assert.match(commands[0].run, /--maxWorkers=1 --minWorkers=1/);
  assert.equal(workflow.jobs['browser-evidence']['timeout-minutes'], 20);
  assert.ok(!workflow.jobs['browser-evidence'].steps.some((step) => step.run?.includes(native)));
  const artifact = job.steps.find((step) => step.uses === 'actions/upload-artifact@v4');
  assert.equal(artifact.if, 'always()');
  assert.match(artifact.with.name, /matrix\.runtime/);
  assert.match(artifact.with.name, /env\.CANDIDATE_SHA/);
  assert.match(artifact.with.name, /github\.run_id/);
  assert.match(artifact.with.name, /github\.run_attempt/);
  assert.equal(artifact.with.path, '${{ runner.temp }}/liquid-material-evidence');
});

test('Liquid hover plan and every command owner remain path-triggered', () => {
  for (const file of [
    'apps/www/src/content/docs/zh-cn/liquid-hover-plan.ts',
    'apps/www/src/content/docs/zh-cn/liquid-hover-plan.test.ts',
    'packages/prototypes/liquid-glass/src/button/button.proto.ts',
    'packages/prototypes/liquid-glass/src/toggle/toggle.proto.ts',
    'packages/prototypes/liquid-glass/src/form/submit.proto.ts',
    'packages/prototypes/liquid-glass/src/form/reset.proto.ts',
    'packages/prototypes/liquid-glass/src/accordion/trigger.proto.ts',
    'packages/prototypes/liquid-glass/src/collapsible/trigger.proto.ts',
    'packages/prototypes/liquid-glass/src/select/trigger.proto.ts',
    'packages/prototypes/liquid-glass/src/dropdown/trigger.proto.ts',
  ]) {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing planned hover input: ${file}`);
  }
  assert.ok(
    Object.values(workflow.jobs).some((job) =>
      job.steps?.some((step) =>
        step.run?.includes('apps/www/src/content/docs/zh-cn/liquid-hover-plan.test.ts')
      )
    ),
    'CI must validate the shard union and checkpoint behavior'
  );
});
