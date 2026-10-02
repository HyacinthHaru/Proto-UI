import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import ts from 'typescript';
import { parse } from 'yaml';
import {
  HOMEPAGE_BASELINE,
  HOMEPAGE_KEYBOARD_TRANSITION,
  HOMEPAGE_POINTER_RUNTIME_SEQUENCE,
  HOMEPAGE_VIEWPORTS,
  layoutFailures,
  classifyHistoricalFailure,
  verifyRevision,
} from './homepage-evidence-contract';

test('evidence binds to a full exact SHA and a clean source checkout', () => {
  assert.doesNotThrow(() => verifyRevision(HOMEPAGE_BASELINE, HOMEPAGE_BASELINE, ''));
  assert.throws(
    () => verifyRevision(HOMEPAGE_BASELINE, HOMEPAGE_BASELINE.slice(0, 8), ''),
    /full Git SHA/
  );
  assert.throws(() => verifyRevision('a'.repeat(40), HOMEPAGE_BASELINE, ''), /Revision mismatch/);
  assert.throws(
    () => verifyRevision(HOMEPAGE_BASELINE, HOMEPAGE_BASELINE, ' M homepage.css'),
    /clean source/
  );
});

test('candidate layout failures distinguish overflow, missing samples and serif inheritance', () => {
  const valid = {
    viewportWidth: 390,
    documentWidth: 390,
    bodyWidth: 390,
    fonts: [{ name: 'heading', fontFamily: 'Arial, sans-serif' }],
  };
  assert.deepEqual(layoutFailures(valid), []);
  assert.match(layoutFailures({ ...valid, bodyWidth: 411 })[0]!, /Horizontal overflow/);
  assert.match(layoutFailures({ ...valid, fonts: [] })[0]!, /Missing heading/);
  assert.match(
    layoutFailures({
      ...valid,
      fonts: [{ name: 'heading', fontFamily: 'Times New Roman, serif' }],
    })[0]!,
    /sans-serif/
  );
  assert.deepEqual(
    HOMEPAGE_VIEWPORTS.map(({ width, height }) => [width, height]),
    [
      [1440, 1000],
      [390, 844],
    ]
  );
});

test('pointer coverage reaches all four runtimes before strict non-first keyboard navigation', () => {
  assert.deepEqual(
    [...new Set(HOMEPAGE_POINTER_RUNTIME_SEQUENCE)].sort(),
    ['react', 'vue', 'vue2', 'wc'].sort()
  );
  assert.equal(
    HOMEPAGE_POINTER_RUNTIME_SEQUENCE.filter((runtime) => runtime === 'react').length,
    2
  );
  assert.deepEqual(HOMEPAGE_KEYBOARD_TRANSITION, { from: 'react', to: 'vue' });
  const source = readFileSync(new URL('capture-homepage-evidence.ts', import.meta.url), 'utf8');
  assert.match(source, /chooseRuntime\(page, runtime, false\)/);
  assert.ok(
    source.indexOf('HOMEPAGE_POINTER_RUNTIME_SEQUENCE.entries()') <
      source.indexOf('chooseRuntime(page, HOMEPAGE_KEYBOARD_TRANSITION.to, true)')
  );
  assert.match(source, /aria-selected="true"\]:focus/);
  assert.match(source, /report\.failures\.push/);
});

test('CI preserves the pinned baseline, exact head, read-only permissions and artifact boundary', () => {
  const source = readFileSync(
    new URL('../../../.github/workflows/homepage-visual-evidence.yml', import.meta.url),
    'utf8'
  );
  const workflow = parse(source);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.env.BASELINE_SHA, HOMEPAGE_BASELINE);
  assert.equal(
    workflow.env.CANDIDATE_SHA,
    '${{ github.event.pull_request.head.sha || github.sha }}'
  );
  assert.ok(workflow.on.pull_request.paths.includes('apps/www/**'));
  assert.equal(workflow.on.pull_request_target, undefined);
  assert.doesNotMatch(source, /\$\{\{\s*secrets\./);
  const steps = workflow.jobs.capture.steps;
  assert.equal(
    steps.find((step: { id?: string }) => step.id === 'baseline_capture')['continue-on-error'],
    true
  );
  const inventory = steps.find((step: { id?: string }) => step.id === 'baseline_visual_inventory');
  assert.ok(inventory.if.includes('always()'));
  assert.ok(inventory.run.includes('report.cases.length, 20'));
  for (const step of steps.filter(
    (step: { name?: string }) =>
      step.name?.includes('Capture real exact-head candidate') ||
      step.name?.includes('Execute focused real-browser')
  )) {
    assert.notEqual(
      step['continue-on-error'],
      true,
      'Candidate evidence and regressions remain strict'
    );
  }

  const checkouts = steps.filter((step: { uses?: string }) =>
    step.uses?.startsWith('actions/checkout@')
  );
  assert.equal(checkouts.length, 2);
  for (const checkout of checkouts) assert.equal(checkout.with['persist-credentials'], false);
  const artifact = steps
    .filter((step: { uses?: string }) => step.uses?.startsWith('actions/upload-artifact@'))
    .at(-1);
  assert.equal(artifact.with.path, '${{ runner.temp }}/homepage-evidence');
  assert.equal(artifact.if, 'always()');
});

test('serialized browser probes do not depend on tsx keepNames helpers', () => {
  let inspected = 0;
  for (const file of ['capture-homepage-evidence.ts', 'capture-documentation-evidence.ts']) {
    const source = ts.createSourceFile(
      file,
      readFileSync(new URL(file, import.meta.url), 'utf8'),
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['evaluate', 'evaluateAll', 'waitForFunction', 'addInitScript'].includes(
          node.expression.name.text
        )
      ) {
        const callback = node.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          const compiled = transformSync(`const probe = ${callback.getText(source)};`, {
            loader: 'ts',
            format: 'cjs',
            target: 'es2022',
            keepNames: true,
          }).code;
          const probe = runInNewContext(`${compiled}\nprobe;`);
          assert.doesNotMatch(
            String(probe),
            /\b__name\s*\(/,
            `${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1} must be self-contained when Playwright serializes it`
          );
          inspected++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.ok(inspected >= 15, 'Inspect the actual browser callbacks, not a synthetic subset');
});

test('baseline negative control never swallows unrelated or candidate failures', () => {
  const known = {
    revisionKind: 'baseline',
    route: '/en/',
    stage: 'keyboard-home',
    errorName: 'TimeoutError',
    activeRole: 'option',
    activeText: 'React',
    committedRuntime: 'react',
  };
  assert.equal(classifyHistoricalFailure(known), 'baseline-react-select-home-focus');
  for (const different of [
    { revisionKind: 'candidate' },
    { route: '/zh-cn/ui-libraries/base/toggle/' },
    { stage: 'keyboard-arrow-down' },
    { errorName: 'ReferenceError' },
    { activeRole: 'listbox' },
    { activeText: 'Vue' },
    { committedRuntime: 'wc' },
  ])
    assert.equal(classifyHistoricalFailure({ ...known, ...different }), 'unexpected');
});
