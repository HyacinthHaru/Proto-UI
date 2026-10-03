import assert from 'node:assert/strict';
import { it } from 'node:test';

import { BROWSER_SUITES, createRuntimeTestPlan } from './runtime-test-plan.mjs';

it('runs the Brutalist Spinner only in the shared sequential browser phase', () => {
  const spinner = 'apps/www/src/content/docs/zh-cn/demo-brutalist-spinner.browser.test.ts';
  const plan = createRuntimeTestPlan([]);
  assert.equal(BROWSER_SUITES.filter((suite) => suite === spinner).length, 1);
  assert.equal(plan[0].args[plan[0].args.indexOf(spinner) - 1], '--exclude');
  assert.equal(plan[1].needsServer, true);
  assert.ok(plan[1].args.includes('--no-file-parallelism'));
  assert.equal(plan[1].args.filter((suite) => suite === spinner).length, 1);
});
