import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

import { BROWSER_SUITES, createRuntimeTestPlan } from './runtime-test-plan.mjs';
import {
  observeReadinessFailures,
  observeRuntimeServer,
  runtimeServerSnapshot,
} from './runtime-server-diagnostics.mjs';

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

describe('shared browser server diagnostics', () => {
  it('prints the current bounded output even when the wrapper process has not exited', () => {
    const message = runtimeServerSnapshot(
      { pid: 123, exitCode: null, signalCode: null },
      'browser readiness failed',
      'old output' + 'x'.repeat(20_000) + '\n[500] /ready/'
    );
    assert.match(message, /pid=123; exitCode=null; signal=null/);
    assert.match(message, /\[500\] \/ready\/$/);
    assert.equal(message.includes('old output'), false);
    assert.equal(message.split('characters):\n')[1].length, 20_000);
  });

  it('recognizes a readiness failure across output chunks and reports it only once', () => {
    let reports = 0;
    const inspect = observeReadinessFailures(() => reports++);
    inspect(Buffer.from('normal browser output\n[browser-har'));
    assert.equal(reports, 0);
    inspect(Buffer.from('ness] readiness failed: Last readiness result: HTTP 500'));
    assert.equal(reports, 1);
    inspect(Buffer.from('\n[browser-harness] readiness failed: again'));
    assert.equal(reports, 1);
  });

  function fixture() {
    const server = new EventEmitter();
    const reports = [];
    let shuttingDown = false;
    let output = 'startup output';
    const dispose = observeRuntimeServer(server, {
      isShuttingDown: () => shuttingDown,
      readOutput: () => output,
      report: (message) => reports.push(message),
    });
    return {
      server,
      reports,
      dispose,
      shutdown: () => (shuttingDown = true),
      output: (value) => (output = value),
    };
  }

  it('reports unexpected signal exit immediately with bounded current server output', () => {
    const probe = fixture();
    probe.output('old output' + 'x'.repeat(20_000) + '\nFATAL ERROR: heap exhausted');
    probe.server.emit('exit', null, 'SIGKILL');
    assert.equal(probe.reports.length, 1);
    assert.match(probe.reports[0], /exitCode=null; signal=SIGKILL/);
    assert.match(probe.reports[0], /FATAL ERROR: heap exhausted$/);
    assert.equal(probe.reports[0].includes('old output'), false);
    assert.equal(probe.reports[0].split('characters):\n')[1].length, 20_000);
    probe.dispose();
  });

  it('reports an unexpected nonzero or clean early exit', () => {
    for (const code of [1, 0]) {
      const probe = fixture();
      probe.server.emit('exit', code, null);
      assert.equal(probe.reports.length, 1);
      assert.match(probe.reports[0], new RegExp(`exitCode=${code}; signal=null`));
      probe.dispose();
    }
  });

  it('reports error followed by exit only once', () => {
    const probe = fixture();
    probe.server.emit('error', new Error('server process error'));
    probe.server.emit('exit', 1, null);
    assert.equal(probe.reports.length, 1);
    assert.match(probe.reports[0], /error=server process error/);
    probe.dispose();
  });

  it('keeps normal completion and signal cleanup silent and removes its listeners', () => {
    for (const signal of [null, 'SIGTERM', 'SIGKILL']) {
      const probe = fixture();
      probe.shutdown();
      probe.server.emit('error', new Error('shutdown error'));
      probe.server.emit('exit', signal ? null : 0, signal);
      assert.deepEqual(probe.reports, []);
      probe.dispose();
      assert.equal(probe.server.listenerCount('exit'), 0);
      assert.equal(probe.server.listenerCount('error'), 0);
    }
  });
});
