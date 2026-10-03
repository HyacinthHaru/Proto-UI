import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { EventEmitter, getEventListeners } from 'node:events';
import { waitForServerReadiness } from './server-readiness.mjs';

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

it('runs the Brutalist Spinner only in the shared sequential browser phase', () => {
  const spinner = 'apps/www/src/content/docs/zh-cn/demo-brutalist-spinner.browser.test.ts';
  const plan = createRuntimeTestPlan([]);
  assert.equal(BROWSER_SUITES.filter((suite) => suite === spinner).length, 1);
  assert.equal(plan[0].args[plan[0].args.indexOf(spinner) - 1], '--exclude');
  assert.equal(plan[1].needsServer, true);
  assert.ok(plan[1].args.includes('--no-file-parallelism'));
  assert.equal(plan[1].args.filter((suite) => suite === spinner).length, 1);
});

describe('bounded documentation readiness', () => {
  it('wires every documentation readiness owner to the same bounded helper', () => {
    const runner = readFileSync('scripts/test/run-runtime-tests.mjs', 'utf8');
    assert.match(runner, /const READY_TIMEOUT_MS = 180_000/);
    assert.match(runner, /waitForServerReadiness\(url, \{\s*timeoutMs: READY_TIMEOUT_MS/);
    for (const file of [
      'browser-harness.ts',
      'demo-base-controls.browser.test.ts',
      'demo-brutalist-controls.browser.test.ts',
    ]) {
      const source = readFileSync(`apps/www/src/content/docs/zh-cn/${file}`, 'utf8');
      assert.match(source, /waitForServerReadiness\(url, \{\s*timeoutMs: 120_000/);
      assert.match(source, /\[browser-harness\] readiness failed:/);
      assert.doesNotMatch(source, /AbortSignal\.timeout\(2_000\)/);
    }
    // The process-owning runner retains its existing finally cleanup. Helper
    // tests below prove request/timer cleanup; this is only a wiring guard.
    assert.match(runner, /finally \{\s*await stopServer\(\)/);
  });

  // Execute the production helper with a deterministic clock and HTTP
  // transport. No socket or browser is started by these negative controls.
  function fixture(t, replies) {
    let now = 0;
    let nextId = 0;
    const timers = new Map();
    t.mock.method(Date, 'now', () => now);
    t.mock.method(globalThis, 'setTimeout', (callback, delay = 0) => {
      const id = ++nextId;
      timers.set(id, { at: now + delay, callback });
      return id;
    });
    t.mock.method(globalThis, 'clearTimeout', (id) => timers.delete(id));
    const flush = async () => {
      for (let i = 0; i < 20; i += 1) await Promise.resolve();
    };
    const advance = async (duration) => {
      const target = now + duration;
      await flush();
      while (true) {
        const entry = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!entry) break;
        const [id, timer] = entry;
        now = timer.at;
        timers.delete(id);
        timer.callback();
        await flush();
      }
      now = target;
      await flush();
    };
    const server = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null });
    const requests = [];
    const active = new Set();
    const cancelledBodies = [];
    const reports = [];
    t.mock.method(globalThis, 'fetch', (_url, { signal }) => {
      const reply = replies[Math.min(requests.length, replies.length - 1)];
      const request = { signal, at: now, aborted: false };
      requests.push(request);
      active.add(request);
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', aborted);
          active.delete(request);
        };
        const aborted = () => {
          request.aborted = true;
          cleanup();
          reject(signal.reason);
        };
        signal.addEventListener('abort', aborted, { once: true });
        if (reply.delay !== null) {
          timer = setTimeout(() => {
            cleanup();
            if (reply.error) return reject(reply.error);
            resolve({
              ok: reply.status === 200,
              status: reply.status,
              statusText: reply.status === 200 ? 'OK' : 'Service Unavailable',
              body: {
                cancel: async () => {
                  cancelledBodies.push(reply.status);
                  if (reply.hangingBody) await new Promise(() => {});
                },
              },
            });
          }, reply.delay);
        }
      });
    });
    const run = (timeoutMs = 120_000) =>
      waitForServerReadiness('http://documentation.test/ready/', {
        timeoutMs,
        server,
        readOutput: () => 'current server output',
        report: (message) => reports.push(message),
      }).then(
        () => 'ready',
        (error) => error
      );
    const assertClean = () => {
      assert.equal(timers.size, 0, 'no deadline, transport, or retry timer remains');
      assert.equal(active.size, 0, 'no active simulated request remains');
      assert.equal(server.listenerCount('exit'), 0);
      assert.equal(server.listenerCount('error'), 0);
      for (const { signal } of requests) assert.equal(getEventListeners(signal, 'abort').length, 0);
    };
    return { advance, server, requests, cancelledBodies, reports, run, assertClean };
  }

  for (const timeoutMs of [120_000, 180_000]) {
    it(`accepts a 3.6s HTTP 200 within the unchanged ${timeoutMs}ms budget`, async (t) => {
      const f = fixture(t, [{ delay: 3_600, status: 200 }]);
      const result = f.run(timeoutMs);
      await f.advance(3_600);
      assert.equal(await result, 'ready');
      assert.equal(f.requests.length, 1);
      assert.deepEqual(f.cancelledBodies, [200]);
      assert.match(f.reports[0], /attempt=1 requestMs=3600 totalMs=3600 HTTP 200 OK/);
      f.assertClean();
    });

    it(`aborts a hanging request at exactly ${timeoutMs}ms without more requests`, async (t) => {
      const f = fixture(t, [{ delay: null }]);
      let outcome;
      const result = f.run(timeoutMs).then((value) => {
        outcome = value;
        return value;
      });
      await f.advance(timeoutMs - 1);
      assert.equal(outcome, undefined);
      await f.advance(1);
      assert.match((await result).message, /Last readiness result: TimeoutError/);
      assert.equal(f.requests[0].aborted, true);
      assert.match(f.reports[0], new RegExp(`requestMs=${timeoutMs} totalMs=${timeoutMs}`));
      f.assertClean();
      await f.advance(timeoutMs);
      assert.equal(f.requests.length, 1);
    });
  }

  it('records a slow HTTP 503 and retries without resetting the total budget', async (t) => {
    const f = fixture(t, [
      { delay: 3_600, status: 503 },
      { delay: 3_600, status: 200 },
    ]);
    const result = f.run();
    await f.advance(7_450);
    assert.equal(await result, 'ready');
    assert.deepEqual(
      f.requests.map((request) => request.at),
      [0, 3_850]
    );
    assert.deepEqual(f.cancelledBodies, [503, 200]);
    assert.match(f.reports[0], /requestMs=3600 totalMs=3600 HTTP 503 Service Unavailable/);
    assert.match(f.reports[1], /requestMs=3600 totalMs=7450 HTTP 200 OK/);
    f.assertClean();
  });

  it('bounds the final retry delay and retains the last slow HTTP status', async (t) => {
    const f = fixture(t, [{ delay: 119_950, status: 503 }]);
    const result = f.run();
    await f.advance(120_000);
    assert.match((await result).message, /HTTP 503 Service Unavailable/);
    assert.equal(f.requests.length, 1);
    assert.match(f.reports[0], /requestMs=119950 totalMs=119950 HTTP 503/);
    f.assertClean();
  });

  it('bounds repeated HTTP failures and starts no request after the deadline', async (t) => {
    const f = fixture(t, [{ delay: 0, status: 503 }]);
    const result = f.run();
    await f.advance(120_000);
    assert.match((await result).message, /HTTP 503 Service Unavailable/);
    assert.equal(f.requests.length, 480);
    assert.equal(f.reports.length, 480);
    assert.equal(f.requests.at(-1).at, 119_750);
    f.assertClean();
    await f.advance(120_000);
    assert.equal(f.requests.length, 480);
  });

  it('gives a retried hanging request only the remaining total time', async (t) => {
    const f = fixture(t, [{ delay: 119_000, status: 503 }, { delay: null }]);
    const result = f.run();
    await f.advance(120_000);
    assert.match((await result).message, /TimeoutError/);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].aborted, true);
    assert.match(f.reports[1], /requestMs=750 totalMs=120000 TimeoutError/);
    f.assertClean();
  });

  it('does not accept a response arriving at the total deadline', async (t) => {
    const f = fixture(t, [{ delay: 120_000, status: 200 }]);
    const result = f.run();
    await f.advance(120_000);
    assert.match((await result).message, /Timed out waiting/);
    assert.equal(f.requests[0].aborted, true);
    assert.deepEqual(f.cancelledBodies, []);
    f.assertClean();
  });

  it('bounds a stalled response-body release instead of reporting readiness', async (t) => {
    const f = fixture(t, [{ delay: 3_600, status: 200, hangingBody: true }]);
    const result = f.run();
    await f.advance(120_000);
    assert.match((await result).message, /TimeoutError/);
    assert.deepEqual(f.cancelledBodies, [200]);
    f.assertClean();
  });

  for (const [code, signal] of [
    [1, null],
    [null, 'SIGKILL'],
    [0, null],
  ]) {
    it(`aborts pending readiness immediately on child exit ${code}/${signal}`, async (t) => {
      const f = fixture(t, [{ delay: null }]);
      const result = f.run();
      await f.advance(100);
      f.server.emit('exit', code, signal);
      await f.advance(0);
      assert.match((await result).message, /Documentation dev server exited early/);
      assert.match((await result).message, /current server output/);
      assert.equal(f.requests[0].aborted, true);
      assert.match(f.reports[0], /requestMs=100 totalMs=100/);
      f.assertClean();
    });
  }

  it('rejects an already exited child without opening a request', async (t) => {
    const f = fixture(t, [{ delay: null }]);
    f.server.exitCode = 1;
    assert.match((await f.run()).message, /exitCode=1/);
    assert.equal(f.requests.length, 0);
    f.assertClean();
  });

  it('aborts and cleans listeners on a child error during a retry delay', async (t) => {
    const f = fixture(t, [{ delay: 100, status: 503 }]);
    const result = f.run();
    await f.advance(150);
    f.server.emit('error', new Error('spawn failure'));
    await f.advance(0);
    assert.match((await result).message, /spawn failure/);
    assert.equal(f.requests.length, 1);
    f.assertClean();
  });

  it('keeps transport error causes in timed attempt diagnostics', async (t) => {
    const failure = new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') });
    const f = fixture(t, [{ delay: 100, error: failure }]);
    const result = f.run(200);
    await f.advance(200);
    assert.match((await result).message, /TypeError: fetch failed; cause=Error: ECONNREFUSED/);
    assert.match(f.reports[0], /requestMs=100 totalMs=100 TypeError: fetch failed/);
    f.assertClean();
  });
});
