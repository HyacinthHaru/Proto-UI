import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import {
  parseContrastRuntimeOptions,
  contrastHeldBinaryTargets,
  assertContrastCaseCoverage,
  classifyFlatTabPaint,
  establishNativeItemPointerBaseline,
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

test('normal PR evidence shards cover every current manifest family exactly once', async () => {
  const { PROJECTION_FAMILY_MANIFESTS } =
    await import('../src/components/PrototypePreviewer/projection-families.ts');
  const workflow = parse(
    await readFile(
      new URL('../../../.github/workflows/brutalist-contrast-evidence.yml', import.meta.url),
      'utf8'
    )
  );
  const job = workflow.jobs['family-audit-evidence'];
  const rows = job.strategy.matrix.include;
  const families = rows.flatMap((row) => row.families.split(','));
  assert.equal(new Set(families).size, families.length);
  assert.deepEqual(
    [...families].sort(),
    Object.keys(PROJECTION_FAMILY_MANIFESTS.brutalist.families).sort()
  );
  assert.equal(job.strategy['fail-fast'], false);
  assert.equal(job.strategy['max-parallel'], 2);
  const observe = job.steps.find((step) => step.env?.PROTO_UI_CONTRAST_FAMILIES);
  assert.equal(observe.env.PROTO_UI_CONTRAST_FAMILIES, '${{ matrix.families }}');
  const upload = job.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.ok(upload.with.name.includes('${{ matrix.shard }}'));
  assert.equal(upload.if, 'always()');
});

test('current flat Tabs accept the recorded native focus rings and reject legacy elevation or motion', () => {
  // Captured f8894c3c / run37237502096 / tabs-react-light-keyboard-selection-overview.
  // This literal is replayed source evidence, not a new native observation.
  const recorded = {
    shadow:
      'rgb(220, 235, 254) 0px 0px 0px 2px, rgb(0, 0, 0) 0px 0px 0px 4px, rgba(0, 0, 0, 0) 0px 0px 0px 0px',
    transform: 'none',
    translate: 'none',
  };
  assert.equal(classifyFlatTabPaint(recorded).flatPaint, true);
  assert.equal(classifyFlatTabPaint({ ...recorded, shadow: 'none' }).flatPaint, true);
  for (const shadow of [
    'rgb(0, 0, 0) 3px 3px 0px 0px',
    'rgb(0, 0, 0) 0px 0px 3px 0px',
    'rgb(0, 0, 0) 0px 0px 0px 2px inset',
    'malformed',
  ])
    assert.equal(classifyFlatTabPaint({ ...recorded, shadow }).flatPaint, false, shadow);
  for (const transform of ['matrix(1, 0, 0, 1, 1, 0)', 'matrix(2, 0, 0, 2, 0, 0)', 'rotate(2deg)'])
    assert.equal(classifyFlatTabPaint({ ...recorded, transform }).flatPaint, false, transform);
  assert.equal(classifyFlatTabPaint({ ...recorded, translate: '1px 0px' }).flatPaint, false);
  assert.equal(
    classifyFlatTabPaint({
      ...recorded,
      transform: 'matrix(1, 0, 0, 1, 0, 0)',
      translate: '0px 0px',
    }).flatPaint,
    true
  );
});

test('Tabs held audit follows current flat prototype criteria while retaining native state and pair guards', async () => {
  const spec = parse(
    await readFile(
      new URL('../../../spec/prototypes/P-BRUTALIST-TABS-TRIGGER.yaml', import.meta.url),
      'utf8'
    )
  );
  assert.equal(spec.status, 'draft');
  assert.match(
    spec.criteria.find((criterion) => criterion.id.endsWith('SELECTED-PAIR-INVARIANT')).text.en,
    /Selection never adds elevation/
  );
  const runner = await readFile(new URL('./audit-brutalist-contrast.mts', import.meta.url), 'utf8');
  assert.ok(runner.includes('classifyFlatTabPaint(value)'));
  assert.ok(runner.includes('held.nativeActive === true'));
  assert.ok(runner.includes('sameSelectedPair(held)'));
  assert.ok(runner.includes('held.flatPaint === true'));
  assert.ok(!runner.includes('selectedElevation'));
});

test('native item baseline waits for deferred entry and exact other focus before reading the target', async () => {
  // Explicit injected readiness ordering; not a browser execution claim.
  const calls = [];
  let ready = false;
  let otherFocused = false;
  let releaseEntry;
  let releaseOther;
  const entry = new Promise((resolve) => {
    releaseEntry = () => {
      ready = true;
      resolve();
    };
  });
  const other = new Promise((resolve) => {
    releaseOther = () => {
      otherFocused = true;
      resolve();
    };
  });
  const before = { achieved: true, focused: false, hovered: false, ariaSelected: 'true' };
  const result = establishNativeItemPointerBaseline({
    waitForEntry: async () => {
      calls.push('entry');
      await entry;
    },
    pressEdge: async () => {
      assert.equal(ready, true);
      calls.push('native-End');
    },
    waitForOther: async () => {
      calls.push('other');
      await other;
    },
    readTarget: async () => {
      assert.equal(otherFocused, true);
      calls.push('read');
      return before;
    },
    expectedSelection: 'true',
    identity: 'selected',
  });
  assert.deepEqual(calls, ['entry']);
  releaseEntry();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['entry', 'native-End', 'other']);
  releaseOther();
  assert.equal(await result, before);
  assert.deepEqual(calls, ['entry', 'native-End', 'other', 'read']);
});

test('native item baseline preserves absent-focus and strict target-state failures', async () => {
  const valid = { achieved: true, focused: false, hovered: false, ariaSelected: 'true' };
  const common = {
    waitForEntry: async () => {},
    pressEdge: async () => {},
    waitForOther: async () => {},
    expectedSelection: 'true',
    identity: 'selected',
  };
  for (const mutation of [
    { achieved: false },
    { focused: true },
    { hovered: true },
    { ariaSelected: 'false' },
    { ariaSelected: null },
  ])
    await assert.rejects(
      establishNativeItemPointerBaseline({
        ...common,
        readTarget: async () => ({ ...valid, ...mutation }),
      }),
      /Invalid independent pointer baseline/
    );
  let pressed = false;
  await assert.rejects(
    establishNativeItemPointerBaseline({
      ...common,
      waitForEntry: async () => {
        throw new Error('entry missing');
      },
      pressEdge: async () => {
        pressed = true;
      },
      readTarget: async () => valid,
    }),
    /entry missing/
  );
  assert.equal(pressed, false);
  let read = false;
  await assert.rejects(
    establishNativeItemPointerBaseline({
      ...common,
      waitForOther: async () => {
        throw new Error('other focus missing');
      },
      readTarget: async () => {
        read = true;
        return valid;
      },
    }),
    /other focus missing/
  );
  assert.equal(read, false);
});
