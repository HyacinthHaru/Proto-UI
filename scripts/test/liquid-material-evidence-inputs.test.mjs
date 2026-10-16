import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, matchesGlob } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import {
  assertBrowserInventory,
  BROWSER_SUITES,
  PRODUCTION_BROWSER_SUITES,
  PRODUCTION_BROWSER_OWNERS,
  createRuntimeTestPlan,
} from './runtime-test-plan.mjs';

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

for (const file of [
  'apps/www/src/pages/en/test/liquid-tint-stage-diagnostic.astro',
  'apps/www/src/content/docs/zh-cn/demo-liquid-tint-stage-diagnostic.browser.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-tint-stage-diagnostic.ts',
  'apps/www/src/content/docs/zh-cn/liquid-tint-stage-diagnostic.test.ts',
]) {
  test(`Tint stage diagnostics cover their test-only input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing diagnostic trigger: ${file}`);
  });
}

test('Tint stage diagnostics isolate cost and preserve all component evidence jobs', () => {
  const job = workflow.jobs['tint-stage-diagnostic'];
  assert.ok(job);
  assert.equal(job['timeout-minutes'], 20);
  assert.equal(job.needs, undefined);
  assert.equal(job.strategy, undefined, 'A kernel diagnostic does not claim four-runtime parity');
  assert.equal(job.steps[0].with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.equal(job.steps[0].with['persist-credentials'], false);
  const suite = 'apps/www/src/content/docs/zh-cn/demo-liquid-tint-stage-diagnostic.browser.test.ts';
  const commands = job.steps.filter((step) => step.run?.includes(suite));
  assert.equal(commands.length, 1);
  assert.equal(
    commands[0].env.PROTO_UI_MATERIAL_EVIDENCE_DIR,
    '${{ runner.temp }}/liquid-tint-stage-diagnostic'
  );
  assert.equal(commands[0].env.PROTO_UI_BROWSER_BASE_URL, undefined);
  assert.match(commands[0].run, /liquid-tint-stage-diagnostic\.test\.ts/);
  assert.match(commands[0].run, /--maxWorkers=1 --minWorkers=1/);
  for (const id of ['browser-evidence', 'prominent-tint-evidence', 'hover-evidence']) {
    assert.ok(workflow.jobs[id]);
    assert.equal(workflow.jobs[id]['timeout-minutes'], 20);
    assert.ok(!workflow.jobs[id].steps.some((step) => step.run?.includes(suite)));
  }
  const artifact = job.steps.find((step) => step.uses === 'actions/upload-artifact@v4');
  assert.equal(artifact.if, 'always()');
  assert.equal(artifact.with.path, '${{ runner.temp }}/liquid-tint-stage-diagnostic');
  assert.match(artifact.with.name, /env\.CANDIDATE_SHA/);
  assert.match(artifact.with.name, /github\.run_id/);
  assert.match(artifact.with.name, /github\.run_attempt/);
  assert.ok(covered('apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs/frozen.json'));
  assert.ok(covered('apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs/source.png'));
  assert.equal(covered('apps/www/src/content/docs/zh-cn/unrelated-diagnostic.ts'), false);
});

test('Tint stage browser suite has one dedicated owner and never enters the unit/shared-browser phase', () => {
  const suite = 'apps/www/src/content/docs/zh-cn/demo-liquid-tint-stage-diagnostic.browser.test.ts';
  assertBrowserInventory();
  assert.ok(PRODUCTION_BROWSER_SUITES.includes(suite));
  assert.equal(PRODUCTION_BROWSER_SUITES.filter((item) => item === suite).length, 1);
  assert.ok(!BROWSER_SUITES.includes(suite));
  assert.equal(PRODUCTION_BROWSER_OWNERS[suite], '.github/workflows/liquid-material-evidence.yml');
  const [general, browser] = createRuntimeTestPlan([]);
  assert.equal(general.args.filter((arg) => arg === suite).length, 1);
  assert.equal(general.args[general.args.indexOf(suite) - 1], '--exclude');
  assert.ok(!browser.args.includes(suite));
  for (let shard = 1; shard <= 8; shard++) {
    const [part] = createRuntimeTestPlan([], { phase: 'browser', shard: `${shard}/8` });
    assert.ok(!part.args.includes(suite));
  }
});

for (const file of [
  'apps/www/src/pages/en/test/liquid-visible-refraction-diagnostic.astro',
  'apps/www/src/content/docs/zh-cn/demo-liquid-visible-refraction-diagnostic.browser.test.ts',
  'apps/www/src/content/docs/zh-cn/liquid-visible-refraction-diagnostic.ts',
  'apps/www/src/content/docs/zh-cn/liquid-visible-refraction-diagnostic.test.ts',
]) {
  test(`Visible refraction diagnostics cover their test-only input ${file}`, () => {
    assert.ok(readFileSync(new URL(file, root), 'utf8').length > 0);
    assert.ok(covered(file), `Missing visible-refraction trigger: ${file}`);
  });
}

test('Visible refraction diagnostics isolate collection cost and preserve existing evidence jobs', () => {
  const job = workflow.jobs['visible-refraction-diagnostic'];
  assert.ok(job);
  assert.equal(job['timeout-minutes'], 20);
  assert.equal(job.needs, undefined);
  assert.equal(
    job.strategy,
    undefined,
    'Renderer frames do not establish component/runtime parity'
  );
  assert.equal(job.steps[0].with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.equal(job.steps[0].with['persist-credentials'], false);
  const suite =
    'apps/www/src/content/docs/zh-cn/demo-liquid-visible-refraction-diagnostic.browser.test.ts';
  const commands = job.steps.filter((step) => step.run?.includes(suite));
  assert.equal(commands.length, 1);
  assert.equal(
    commands[0].env.PROTO_UI_MATERIAL_EVIDENCE_DIR,
    '${{ runner.temp }}/liquid-visible-refraction-diagnostic'
  );
  assert.equal(commands[0].env.PROTO_UI_BROWSER_BASE_URL, undefined);
  assert.match(commands[0].run, /liquid-visible-refraction-diagnostic\.test\.ts/);
  assert.match(commands[0].run, /--maxWorkers=1 --minWorkers=1/);
  for (const id of [
    'browser-evidence',
    'prominent-tint-evidence',
    'hover-evidence',
    'tint-stage-diagnostic',
  ]) {
    assert.ok(workflow.jobs[id]);
    assert.equal(workflow.jobs[id]['timeout-minutes'], 20);
    assert.ok(!workflow.jobs[id].steps.some((step) => step.run?.includes(suite)));
  }
  const artifact = job.steps.find((step) => step.uses === 'actions/upload-artifact@v4');
  assert.equal(artifact.if, 'always()');
  assert.equal(artifact.with.path, '${{ runner.temp }}/liquid-visible-refraction-diagnostic');
  assert.match(artifact.with.name, /env\.CANDIDATE_SHA/);
  assert.match(artifact.with.name, /github\.run_id/);
  assert.match(artifact.with.name, /github\.run_attempt/);
  for (const dependency of [
    'packages/adapters/base/src/material/program.ts',
    'packages/adapters/base/src/material/style-tint.ts',
    'packages/adapters/base/src/material/contact.ts',
    'apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs/frozen.json',
    'apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs/source.png',
  ])
    assert.ok(covered(dependency), `Missing diagnostic source closure: ${dependency}`);
  assert.equal(covered('apps/www/src/content/docs/zh-cn/unrelated-visible-diagnostic.ts'), false);
});

test('Visible refraction browser suite has one dedicated owner and is excluded from shared phases', () => {
  const suite =
    'apps/www/src/content/docs/zh-cn/demo-liquid-visible-refraction-diagnostic.browser.test.ts';
  assertBrowserInventory();
  assert.ok(PRODUCTION_BROWSER_SUITES.includes(suite));
  assert.equal(PRODUCTION_BROWSER_SUITES.filter((item) => item === suite).length, 1);
  assert.ok(!BROWSER_SUITES.includes(suite));
  assert.equal(PRODUCTION_BROWSER_OWNERS[suite], '.github/workflows/liquid-material-evidence.yml');
  const [general, browser] = createRuntimeTestPlan([]);
  assert.equal(general.args.filter((arg) => arg === suite).length, 1);
  assert.equal(general.args[general.args.indexOf(suite) - 1], '--exclude');
  assert.ok(!browser.args.includes(suite));
  for (let shard = 1; shard <= 8; shard++) {
    const [part] = createRuntimeTestPlan([], { phase: 'browser', shard: `${shard}/8` });
    assert.ok(!part.args.includes(suite));
  }
});
