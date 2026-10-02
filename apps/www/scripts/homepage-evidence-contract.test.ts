import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import {
  HOMEPAGE_BASELINE,
  HOMEPAGE_VIEWPORTS,
  layoutFailures,
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
