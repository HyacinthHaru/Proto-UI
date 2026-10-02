import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { BROWSER_SUITES, createRuntimeTestPlan } from './runtime-test-plan.mjs';

describe('runtime test plan', () => {
  it('classifies every website browser suite into the shared-server phase', () => {
    const scan = (directory) =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory()
          ? ['node_modules', 'dist', '.astro'].includes(entry.name)
            ? []
            : scan(file)
          : file.endsWith('.browser.test.ts')
            ? [file.replaceAll(path.sep, '/')]
            : [];
      });
    for (const file of scan('apps/www')) {
      assert.ok(BROWSER_SUITES.includes(file), `${file} must not run in the parallel unit phase`);
    }
  });
  it('preserves focused Vitest arguments without starting the documentation server', () => {
    assert.deepEqual(
      createRuntimeTestPlan(['--', 'packages/spec/fixtures/test/context-fixtures.test.ts']),
      [
        {
          needsServer: false,
          args: ['packages/spec/fixtures/test/context-fixtures.test.ts'],
        },
      ]
    );
  });

  it('isolates browser suites behind one shared documentation server in a full run', () => {
    assert.deepEqual(createRuntimeTestPlan([]), [
      {
        needsServer: false,
        args: BROWSER_SUITES.flatMap((suite) => ['--exclude', suite]),
      },
      {
        needsServer: true,
        // Sequential, because every suite drives the same dev server.
        args: ['--no-file-parallelism', ...BROWSER_SUITES],
      },
    ]);
  });
});
