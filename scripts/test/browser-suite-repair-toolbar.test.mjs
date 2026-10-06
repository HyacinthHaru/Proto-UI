import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import YAML from 'yaml';

test('focused public browser evidence disables only the supported Astro developer toolbar before tests', () => {
  const workflow = YAML.parse(
    readFileSync('.github/workflows/browser-suite-repair-evidence.yml', 'utf8')
  );
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const steps = workflow.jobs['focused-browser'].steps;
  const setup = steps.findIndex((step) =>
    step.run?.includes('astro preferences disable devToolbar')
  );
  const execute = steps.findIndex(
    (step) => step.name === 'Exercise unchanged controls with failure diagnostics'
  );
  assert.ok(
    setup >= 0 && setup < execute,
    'The official preference must be set before launching the browser suite.'
  );
  assert.match(
    steps[setup].run,
    /--filter apps-www exec astro preferences get devToolbar\.enabled/
  );
  assert.doesNotMatch(
    steps[execute].run,
    /force\s*:\s*true|pointer-events|astro-dev-toolbar.*remove/
  );
  assert.match(steps[execute].run, /demo-base-image\.browser\.test\.ts/);
  assert.equal(
    steps.find((step) => step.uses === 'actions/checkout@v4').with['persist-credentials'],
    false
  );
});
