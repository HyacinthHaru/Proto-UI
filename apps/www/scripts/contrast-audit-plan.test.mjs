import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import {
  parseContrastRuntimeOptions,
  contrastHeldBinaryTargets,
  assertContrastCaseCoverage,
} from './contrast-audit-plan.mjs';

const official = ['wc', 'react', 'vue', 'vue2'];
test('page-specific runtime planning keeps three-runtime Tooltip separate from four-runtime pages', () => {
  const tooltip = parseContrastRuntimeOptions('["wc","react","vue"]', official);
  assert.deepEqual(tooltip, official.slice(0, 3));
  assert.equal(tooltip.includes('vue2'), false);
  assert.deepEqual(parseContrastRuntimeOptions(JSON.stringify(official), official), official);
});
test('missing, invalid, duplicate and unsupported runtime availability fail closed', () => {
  for (const value of [null, '', 'null', '[]', '{}', '["wc","wc"]', '["native"]', '[1]'])
    assert.throws(() => parseContrastRuntimeOptions(value, official), /runtime/);
});
test('non-default Switch and all authored checked/mixed Checkbox controls receive held journeys', () => {
  assert.deepEqual(contrastHeldBinaryTargets('switch'), [
    { ref: 'releaseAlertsSwitch', state: 'checked', ariaChecked: 'true' },
  ]);
  assert.deepEqual(contrastHeldBinaryTargets('checkbox'), [
    { ref: 'checkedCheckbox', state: 'checked', ariaChecked: 'true' },
    { ref: 'mixedCheckbox', state: 'mixed', ariaChecked: 'mixed' },
    { ref: 'checkedIndeterminateCheckbox', state: 'checked-indeterminate', ariaChecked: 'mixed' },
  ]);
  assert.deepEqual(contrastHeldBinaryTargets('button'), []);
});
test('native evidence workflow has no path exclusions for rendered inputs', async () => {
  const workflow = parse(
    await readFile(
      new URL('../../../.github/workflows/brutalist-contrast-evidence.yml', import.meta.url),
      'utf8'
    )
  );
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  assert.equal(workflow.on.pull_request?.paths, undefined);
  assert.equal(workflow.on.pull_request?.['paths-ignore'], undefined);
  assert.equal(workflow.on.workflow_dispatch, undefined);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
});

test('held journey references cover the real authored enabled non-default binary states', async () => {
  for (const family of ['switch', 'checkbox']) {
    const { default: demo } = await import(
      `../src/content/docs/zh-cn/demo-brutalist-${family}.demo.ts`
    );
    const authored = [];
    const visit = (node) => {
      if (!node || typeof node === 'string') return;
      if (
        node.kind === 'proto' &&
        node.prototypeId === `brutalist-${family}-root` &&
        !node.props?.disabled &&
        (node.props?.defaultChecked || node.props?.defaultIndeterminate)
      )
        authored.push({
          ref: node.ref,
          ariaChecked: node.props.defaultIndeterminate ? 'mixed' : 'true',
        });
      for (const child of node.children ?? []) visit(child);
    };
    visit(demo.root);
    assert.deepEqual(
      contrastHeldBinaryTargets(family).map(({ ref, ariaChecked }) => ({ ref, ariaChecked })),
      authored
    );
  }
});

test('unsupported runtime availability cannot become zero-case success for a requested family', () => {
  assert.throws(() => parseContrastRuntimeOptions('["native"]', official), /runtime/);
  assert.throws(() => parseContrastRuntimeOptions('[]', official), /runtime/);
  assert.throws(() => assertContrastCaseCoverage(['tooltip'], []), /empty evidence/);
  assert.throws(
    () => assertContrastCaseCoverage(['tooltip', 'switch'], [{ family: 'switch' }]),
    /requested family/
  );
  assert.doesNotThrow(() =>
    assertContrastCaseCoverage(
      ['tooltip'],
      [{ family: 'tooltip', runtime: 'undiscovered', status: 'failed' }]
    )
  );
});
