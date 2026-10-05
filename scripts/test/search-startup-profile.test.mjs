import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  SEARCH_PROFILE,
  SEARCH_SCENARIOS,
  searchScenario,
  allowedLocalUrl,
  bounded,
  installSearchPhaseMarks,
  mainReadyRoutes,
  recordReadiness,
  runSearchProfile,
  safeCpuProfile,
  safeError,
  safeTimelineEvent,
  safeUrl,
  sourceIdentity,
  createProfileCapture,
} from './search-startup-profile.mjs';

const origin = 'http://127.0.0.1:4321';
const fastWait = (promise, label) => bounded(promise, label, 20);
async function startProfile(cdp, directory, origin) {
  const capture = createProfileCapture(cdp, directory, origin, fastWait);
  await capture.start();
  return capture.stop;
}

const temp = () => mkdtempSync(path.join(os.tmpdir(), 'search-profile-test-'));
const read = (directory, file) => JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
const source = readFileSync(new URL('./search-startup-profile.mjs', import.meta.url), 'utf8');

test('locks the failing case, original oracle import and actual budget boundary', () => {
  assert.deepEqual(searchScenario('shadcn-dark-1440').viewport, { width: 1440, height: 960 });
  assert.equal(SEARCH_PROFILE.readinessBudgetMs, 1000);
  assert.equal(searchScenario('shadcn-dark-1440').theme, 'dark');
  assert.equal(SEARCH_PROFILE.route, '/zh-cn/ui-libraries/shadcn/button/');
  assert.match(source, /loadModule\(path.join\(appRoot, oraclePath\)\)/);
  assert.ok(!source.includes('1280'));
  assert.match(source, /waitUntil: 'networkidle'/);
  assert.match(source, /identifySource\(appRoot, appSha\)/);
});

test('binds two independent scenes to their actual failed checkouts without mixing dimensions', () => {
  assert.deepEqual(Object.keys(SEARCH_SCENARIOS), ['shadcn-dark-1440', 'shadcn-light-390']);
  const dark = searchScenario('shadcn-dark-1440');
  const light = searchScenario('shadcn-light-390');
  assert.equal(dark.appSha, '7669713a853211bb36995039d3c16569799c3e88');
  assert.equal(light.appSha, '9e183f7a7d69e61d17d62d92e3ccdacd00196833');
  assert.deepEqual(light.viewport, { width: 390, height: 960 });
  assert.equal(light.theme, 'light');
  assert.equal(light.originalFailure.stageElapsedMs, 1149);
  assert.equal(light.originalFailure.job, '111736429219');
  assert.notEqual(dark.originalFailure.run, light.originalFailure.run);
  assert.throws(() => searchScenario('shadcn-dark-390'), /explicitly bound/);
  assert.throws(() => searchScenario('__proto__'), /explicitly bound/);
  assert.match(source, /assert.equal\(appSha, scenario.appSha/);
  assert.match(source, /viewport: scenario.viewport/);
  assert.match(source, /colorScheme: scenario.theme/);
  assert.match(source, /JSON.stringify\(scenario.theme\)/);
  const workflow = readFileSync(
    new URL('../../.github/workflows/search-startup-profile.yml', import.meta.url),
    'utf8'
  );
  const ids = [...workflow.matchAll(/- id: (shadcn-[a-z]+-\d+)/g)].map((match) => match[1]);
  assert.deepEqual(ids, Object.keys(SEARCH_SCENARIOS));
  for (const [id, scene] of Object.entries(SEARCH_SCENARIOS)) {
    assert.ok(workflow.includes(`- id: ${id}\n            app_sha: '${scene.appSha}'`));
  }
  assert.match(workflow, /mode: \[unprofiled, profiled\]/);
  assert.match(workflow, /search-profile-\$\{\{ matrix.scenario.id \}\}-\$\{\{ matrix.mode \}\}/);
  assert.match(workflow, /CASE_ID: \$\{\{ matrix.scenario.id \}\}/);
});

test('uses inert main-CI warmup routes and rejects changed or executable shapes', () => {
  const actual = readFileSync(new URL('./run-runtime-tests.mjs', import.meta.url), 'utf8');
  const routes = mainReadyRoutes(actual);
  assert.ok(routes.includes(SEARCH_PROFILE.route));
  assert.ok(routes.length > 20);
  assert.throws(() => mainReadyRoutes('const READY_ROUTES = [evil()];'));
  assert.throws(() => mainReadyRoutes("const READY_ROUTES = ['https://outside.invalid/'];"));
  assert.throws(() => mainReadyRoutes('const routes = [];'));
});

test('permits only the exact local app origin, including WebSocket transport', () => {
  assert.equal(allowedLocalUrl(`${origin}/module.js?version=1`, origin), true);
  assert.equal(allowedLocalUrl('ws://127.0.0.1:4321/', origin, true), true);
  for (const url of [
    'http://127.0.0.1:99/',
    'https://outside.invalid/',
    'data:text/html,x',
    'http://user:secret@127.0.0.1:4321/',
    '/relative',
  ])
    assert.equal(allowedLocalUrl(url, origin), false);
});

test('strips URL credentials, queries and fragments, including nested diagnostic frames', () => {
  assert.equal(safeUrl(`${origin}/module.ts?token=secret#fragment`, origin), `${origin}/module.ts`);
  assert.equal(safeUrl('https://outside.invalid/private?token=secret', origin), '[non-local-url]');
  assert.equal(safeUrl('file:///private/path', origin), '[non-local-url]');
  assert.equal(safeUrl('data:text/javascript,private', origin), '[non-local-url]');
  assert.ok(!safeError(`Failed ${origin}/a?token=secret#fragment`, origin).includes('secret'));
  const cpu = safeCpuProfile(
    {
      startTime: 1,
      endTime: 2,
      samples: [1],
      timeDeltas: [10],
      nodes: [
        {
          id: 1,
          hitCount: 1,
          children: [],
          callFrame: {
            functionName: 'loadPrototypes',
            url: `${origin}/source.ts?token=secret#fragment`,
            lineNumber: 7,
            columnNumber: 3,
          },
          privateData: 'omitted',
        },
      ],
      privateData: 'omitted',
    },
    origin
  );
  assert.equal(cpu.nodes[0].callFrame.url, `${origin}/source.ts`);
  assert.deepEqual(cpu.samples, [1]);
  assert.ok(!JSON.stringify(cpu).match(/secret|fragment|privateData|omitted/));
});

test('timeline retains JS/layout/GC timing but drops arbitrary payload and foreign user marks', () => {
  for (const name of ['EvaluateScript', 'FunctionCall', 'Layout', 'UpdateLayoutTree', 'MinorGC']) {
    const result = safeTimelineEvent(
      {
        name,
        cat: 'devtools.timeline,v8',
        ph: 'X',
        pid: 1,
        tid: 2,
        ts: 100,
        dur: 90,
        args: {
          data: {
            url: `${origin}/source.ts?token=secret`,
            requestHeaders: { Authorization: 'secret' },
            scriptSource: 'omitted',
            stackTrace: [
              {
                functionName: 'renderDemo',
                url: `${origin}/render.ts?token=secret`,
                lineNumber: 1,
                columnNumber: 2,
              },
            ],
          },
        },
      },
      origin
    );
    assert.equal(result.name, name);
    assert.equal(result.dur, 90);
    assert.ok(!JSON.stringify(result).match(/secret|Authorization|scriptSource|omitted/));
  }
  assert.equal(
    safeTimelineEvent({ cat: 'blink.user_timing', name: 'private-user-mark' }, origin),
    null
  );
  assert.equal(
    safeTimelineEvent(
      { cat: 'blink.user_timing', name: 'pui-search:atomic-active-observed', ts: 1 },
      origin
    ).ts,
    1
  );
});

test('serialized phase marks are observer delivery only, deduplicated and atomic', () => {
  const marks = [];
  const state = { defined: false, mounts: [], commands: [], hosts: [] };
  let originalCalls = 0;
  const trace = {
    record() {
      originalCalls++;
    },
    snapshot: () => ({ events: [{ state }] }),
  };
  runInNewContext(`(${installSearchPhaseMarks.toString()})();`, {
    window: { __puiSearchStartup: trace },
    performance: { mark: (name) => marks.push(name) },
  });
  trace.record('root-found');
  state.defined = true;
  state.mounts = [{}, {}, {}];
  state.commands = [{ command: 'open' }];
  state.hosts = [{ projectionGenerationState: 'staging' }];
  trace.record('defined');
  assert.ok(!marks.includes('pui-search:atomic-active-observed'));
  state.view = 'ready';
  state.hosts = Array.from({ length: 3 }, () => ({ projectionGenerationState: 'active' }));
  trace.record('mutation');
  trace.record('mutation');
  assert.equal(originalCalls, 4);
  assert.equal(marks.filter((name) => name === 'pui-search:atomic-active-observed').length, 1);
  assert.ok(marks.includes('pui-search:definition-observed'));
});

test('persists unchanged deadline failure before returning, never retries or accepts late readiness', async () => {
  let calls = 0;
  const records = [];
  const result = await recordReadiness(
    {
      evaluate: async (fn, args) => {
        calls++;
        assert.equal(args.startedAt, 2000);
        assert.equal(records[0][0], 'initial-ready-boundary');
        return fn(args);
      },
    },
    {
      readSearchReadyWithinBudget: ({ startedAt }) => ({
        startedAt,
        deadline: startedAt + 1000,
        observedReadyAt: 3040,
        currentDisabled: 'false',
        completedAt: 3041,
      }),
      searchReadinessWasOnTime: (evidence) => evidence.observedReadyAt <= evidence.deadline,
    },
    (...args) => records.push(args),
    () => 2000
  );
  assert.equal(calls, 1);
  assert.equal(result.onTime, false);
  assert.equal(records[1][0], 'initial-ready-result');
  assert.equal(records[1][1].onTime, false);
});

test('a rejected readiness read is propagated, not replaced with a passing result', async () => {
  const records = [];
  await assert.rejects(
    recordReadiness({ evaluate: () => Promise.reject(new Error('page gone')) }, {}, (...args) =>
      records.push(args)
    ),
    /page gone/
  );
  assert.deepEqual(
    records.map(([stage]) => stage),
    ['initial-ready-boundary']
  );
});

test('all diagnostic operations have finite timeout failures', async () => {
  await assert.rejects(
    bounded(new Promise(() => {}), 'test operation', 5),
    /exceeded diagnostic bound/
  );
  assert.equal(await bounded(Promise.resolve(3), 'resolved', 5), 3);
});

test('CPU and timeline artifacts are sanitized and retained with no screenshot or network payload', async () => {
  const directory = temp();
  try {
    const cdp = new EventEmitter();
    const commands = [];
    cdp.send = async (command, args) => {
      commands.push([command, args]);
      if (command === 'Profiler.stop')
        return {
          profile: {
            startTime: 1,
            endTime: 2,
            nodes: [
              { id: 1, callFrame: { url: `${origin}/a?token=secret`, functionName: 'renderDemo' } },
            ],
            samples: [1],
            timeDeltas: [1000],
          },
        };
      if (command === 'Tracing.end') queueMicrotask(() => cdp.emit('Tracing.tracingComplete'));
      return {};
    };
    const stop = await startProfile(cdp, directory, origin);
    cdp.emit('Tracing.dataCollected', {
      value: [
        { name: 'Layout', cat: 'devtools.timeline', ts: 2, dur: 9, args: { secret: 'omit' } },
      ],
    });
    assert.ok(readFileSync(path.join(directory, 'timeline.ndjson'), 'utf8').includes('Layout'));
    const metadata = await stop();
    assert.equal(metadata.truncated, false);
    assert.equal(metadata.eventCount, 1);
    assert.equal(read(directory, 'timeline.json').traceEvents[0].dur, 9);
    assert.ok(!readFileSync(path.join(directory, 'startup.cpuprofile'), 'utf8').includes('secret'));
    assert.equal(
      commands.find(([name]) => name === 'Profiler.setSamplingInterval')[1].interval,
      1000
    );
    assert.ok(
      !commands.find(([name]) => name === 'Tracing.start')[1].categories.includes('screenshot')
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('timeline cap is explicit evidence debt rather than unbounded buffering', async () => {
  const directory = temp();
  try {
    const cdp = new EventEmitter();
    cdp.send = async (command) => {
      if (command === 'Profiler.stop') return { profile: { nodes: [] } };
      if (command === 'Tracing.end') queueMicrotask(() => cdp.emit('Tracing.tracingComplete'));
      return {};
    };
    const stop = await startProfile(cdp, directory, origin);
    cdp.emit('Tracing.dataCollected', {
      value: Array.from({ length: SEARCH_PROFILE.maxTraceEvents + 1 }, () => ({
        name: 'Layout',
        ts: 1,
      })),
    });
    const metadata = await stop();
    assert.equal(metadata.eventCount, SEARCH_PROFILE.maxTraceEvents);
    assert.equal(metadata.dropped, 1);
    assert.equal(metadata.truncated, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('requires two exact clean SHAs and rejects a dirty probe masquerading as original source', async () => {
  const root = temp();
  try {
    const appRoot = path.join(root, 'app');
    const probeRoot = path.join(root, 'probe');
    const directory = path.join(root, 'evidence');
    for (const repo of [appRoot, probeRoot]) {
      mkdirSync(repo);
      execFileSync('git', ['init', '-q', repo]);
      execFileSync(
        'git',
        [
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          'commit',
          '--allow-empty',
          '-qm',
          'Test source',
        ],
        { cwd: repo }
      );
    }
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: appRoot,
      encoding: 'utf8',
    }).trim();
    assert.deepEqual(sourceIdentity(appRoot, sha), { sha, dirty: false });
    assert.throws(() => sourceIdentity(appRoot, 'a'.repeat(40)), /does not match/);
    assert.throws(() => sourceIdentity(appRoot, 'main'), /exact lowercase source SHA/);
    writeFileSync(path.join(appRoot, 'injected-source.ts'), 'dirty');
    const report = await runSearchProfile({
      appRoot,
      probeRoot,
      directory,
      mode: 'profiled',
      caseId: 'shadcn-dark-1440',
      appSha: sha,
      probeSha: sha,
    });
    assert.equal(report.outcome, 'failure');
    assert.ok(read(directory, 'boundary.json').originalFailure);
    assert.ok(
      read(directory, 'result.json').failures.some((failure) =>
        failure.includes('Checkout must be clean')
      )
    );
    assert.equal(read(directory, 'progress.json').stage, 'failure');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('workflow is narrowly opt-in, read-only, paired once, timeout-bounded and uploads failures', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/search-startup-profile.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request.number == 777/);
  assert.match(workflow, /head.repo.full_name == github.repository/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /^\s+[a-z-]+: write$/m);
  assert.match(workflow, /mode: \[unprofiled, profiled\]/);
  assert.match(workflow, /fail-fast: false/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(workflow, /if: always\(\)/);
  assert.ok(!workflow.includes('continue-on-error'));
  assert.match(workflow, /persist-credentials: false/);
});

test('the actual original observer and candidate marks serialize together without runtime helpers', async () => {
  // Node 24 strips this standalone helper's types; no Vite/browser/socket starts.
  const oracle = await import('../../apps/www/src/content/docs/zh-cn/site-search-evidence.ts');
  const marks = [];
  const storage = [];
  const window = {};
  const content = `localStorage.setItem('starlight-theme', 'dark');\n(${oracle.installSearchStartupTrace.toString()})();\n(${installSearchPhaseMarks.toString()})();`;
  const context = {
    window,
    document: { querySelector: () => null },
    customElements: { get: () => undefined, whenDefined: () => new Promise(() => {}) },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    localStorage: { setItem: (...args) => storage.push(args) },
    performance: { mark: (name) => marks.push(name), now: () => 0, timeOrigin: 1 },
  };
  runInNewContext(content, context);
  assert.deepEqual(storage, [['starlight-theme', 'dark']]);
  assert.equal(window.__puiSearchStartup.snapshot().stopped, false);
  assert.deepEqual(marks, ['pui-search:probe-installed']);
  assert.equal(window.__puiSearchStartup.snapshot().eventCount, 0);
});

test('failed timeline completion preserves already captured CPU and incremental timing evidence', async () => {
  const directory = temp();
  try {
    const cdp = new EventEmitter();
    cdp.send = async (command) => {
      if (command === 'Profiler.stop')
        return { profile: { nodes: [], samples: [1], timeDeltas: [1000] } };
      if (command === 'Tracing.end') throw new Error('target closed');
      return {};
    };
    const stop = await startProfile(cdp, directory, origin);
    cdp.emit('Tracing.dataCollected', { value: [{ name: 'Layout', ts: 1, dur: 20 }] });
    const partial = await stop();
    assert.equal(partial.complete, false);
    assert.ok(
      partial.failures.some(
        (failure) => failure.phase === 'timeline end' && failure.error.includes('target closed')
      )
    );
    assert.equal(partial.cpu.persisted, true);
    assert.equal(partial.timeline.eof, false);
    assert.deepEqual(read(directory, 'startup.cpuprofile').samples, [1]);
    assert.ok(readFileSync(path.join(directory, 'timeline.ndjson'), 'utf8').includes('Layout'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fakeCdp({ cpuStop, traceStart, traceEnd, missingEof = false } = {}) {
  const cdp = new EventEmitter();
  cdp.commands = [];
  cdp.send = async (command, args) => {
    cdp.commands.push([command, args]);
    if (command === 'Profiler.stop') {
      if (cpuStop === 'throws') throw new Error('CPU stop rejected');
      if (cpuStop === 'timeout') return new Promise(() => {});
      return {
        profile: {
          nodes: [
            {
              id: 1,
              callFrame: { functionName: 'renderDemo', url: `${origin}/source.ts?token=excluded` },
            },
          ],
          samples: [1],
          timeDeltas: [1000],
        },
      };
    }
    if (command === 'Tracing.start') {
      if (traceStart === 'throws') throw new Error('Trace start rejected');
      cdp.emit('Tracing.dataCollected', { value: [{ name: 'Layout', ts: 100, dur: 30 }] });
    }
    if (command === 'Tracing.end') {
      if (!missingEof) queueMicrotask(() => cdp.emit('Tracing.tracingComplete'));
      if (traceEnd === 'throws') throw new Error('Trace end rejected');
    }
    return {};
  };
  return cdp;
}

for (const cpuStop of ['throws', 'timeout']) {
  test(`CPU stop ${cpuStop} does not suppress timeline end/EOF; stop is idempotent`, async () => {
    const directory = temp();
    try {
      const cdp = fakeCdp({ cpuStop });
      const capture = createProfileCapture(cdp, directory, origin, fastWait);
      assert.equal(read(directory, 'profile-status.json').cpu.startAttempted, false);
      await capture.start();
      const first = capture.stop();
      assert.equal(capture.stop(), first);
      const partial = await first;
      assert.equal(await capture.stop(), partial);
      assert.equal(partial.complete, false);
      assert.equal(partial.cpu.persisted, false);
      assert.equal(partial.timeline.ended, true);
      assert.equal(partial.timeline.eof, true);
      assert.equal(partial.timeline.persisted, true);
      assert.equal(read(directory, 'timeline.json').metadata.complete, false);
      assert.equal(read(directory, 'profile-status.json').complete, false);
      assert.ok(partial.failures.some((failure) => failure.phase === 'CPU stop/persist'));
      assert.equal(cdp.commands.filter(([name]) => name === 'Profiler.stop').length, 1);
      assert.equal(cdp.commands.filter(([name]) => name === 'Tracing.end').length, 1);
      assert.equal(cdp.listenerCount('Tracing.dataCollected'), 0);
      assert.equal(cdp.listenerCount('Tracing.tracingComplete'), 0);
      assert.equal(existsSync(path.join(directory, 'startup.cpuprofile')), false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('Trace start rejection after CPU start still stops and persists CPU during cleanup', async () => {
  const directory = temp();
  try {
    const cdp = fakeCdp({ traceStart: 'throws' });
    const capture = createProfileCapture(cdp, directory, origin, fastWait);
    await assert.rejects(capture.start(), /Trace start rejected/);
    const partial = await capture.stop();
    assert.equal(partial.cpu.started, true);
    assert.equal(partial.cpu.stopped, true);
    assert.equal(partial.cpu.persisted, true);
    assert.equal(partial.timeline.started, false);
    assert.equal(partial.complete, false);
    assert.ok(partial.failures.some((failure) => failure.phase === 'capture start'));
    assert.equal(read(directory, 'startup.cpuprofile').samples.length, 1);
    assert.equal(read(directory, 'timeline.json').metadata.complete, false);
    assert.equal(cdp.commands.filter(([name]) => name === 'Profiler.stop').length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CPU success plus missing timeline EOF preserves partial files without replaying cleanup', async () => {
  const directory = temp();
  try {
    const cdp = fakeCdp({ missingEof: true });
    const capture = createProfileCapture(cdp, directory, origin, fastWait);
    await capture.start();
    const partial = await capture.stop();
    assert.equal(await capture.stop(), partial);
    assert.equal(partial.cpu.persisted, true);
    assert.equal(partial.timeline.ended, true);
    assert.equal(partial.timeline.eof, false);
    assert.equal(partial.complete, false);
    assert.ok(partial.failures.some((failure) => failure.phase === 'timeline EOF'));
    assert.equal(read(directory, 'timeline.json').metadata.timeline.eof, false);
    assert.ok(readFileSync(path.join(directory, 'timeline.ndjson'), 'utf8').includes('Layout'));
    assert.equal(cdp.commands.filter(([name]) => name === 'Profiler.stop').length, 1);
    assert.equal(cdp.commands.filter(([name]) => name === 'Tracing.end').length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Tracing.end rejection still observes independent EOF and retains its own failure', async () => {
  const directory = temp();
  try {
    const cdp = fakeCdp({ traceEnd: 'throws' });
    const capture = createProfileCapture(cdp, directory, origin, fastWait);
    await capture.start();
    const partial = await capture.stop();
    assert.equal(partial.cpu.persisted, true);
    assert.equal(partial.timeline.ended, false);
    assert.equal(partial.timeline.eof, true);
    assert.equal(partial.complete, false);
    assert.ok(partial.failures.some((failure) => failure.phase === 'timeline end'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function fakeVisit(directory, { mode = 'profiled', readyAt = 900, ...cdpOptions } = {}) {
  const oracle = await import('../../apps/www/src/content/docs/zh-cn/site-search-evidence.ts');
  const calls = [];
  const cdp = fakeCdp(cdpOptions);
  const page = new EventEmitter();
  page.setDefaultTimeout = () => {};
  page.setDefaultNavigationTimeout = () => {};
  page.addInitScript = async (script) => {
    calls.push(['init', script.content]);
  };
  page.goto = async (url, options) => {
    calls.push(['visit', url, options]);
    return { ok: () => true };
  };
  page.waitForFunction = async () => {
    calls.push(['late-observation']);
  };
  page.evaluate = async (fn, args) => {
    if (args?.startedAt !== undefined) {
      assert.equal(fn, oracle.readSearchReadyWithinBudget);
      calls.push(['readiness', args.startedAt]);
      return {
        startedAt: args.startedAt,
        deadline: args.startedAt + 1000,
        observedReadyAt: args.startedAt + readyAt,
        completedAt: args.startedAt + readyAt,
        currentDisabled: 'false',
      };
    }
    calls.push(['snapshot']);
    return {
      startup: { resources: [] },
      navigation: [],
      resources: [],
      resourceCount: 0,
      marks: [],
    };
  };
  const context = {
    route: async () => {},
    routeWebSocket: async () => {},
    newPage: async () => page,
    newCDPSession: async () => cdp,
    close: async () => {
      calls.push(['context-close']);
    },
  };
  const browser = {
    version: () => 'fake-chromium-control-flow-only',
    newContext: async (options) => {
      calls.push(['context', options]);
      return context;
    },
    close: async () => {
      calls.push(['browser-close']);
    },
  };
  const harness = {
    startServer: async () => {
      calls.push(['server-start']);
      return origin;
    },
    launchBrowser: async () => browser,
    stopServer: async () => {
      calls.push(['server-stop']);
    },
  };
  const caseId = 'shadcn-light-390';
  const report = await runSearchProfile(
    {
      appRoot: '/fake/app',
      probeRoot: '/fake/probe',
      appSha: searchScenario(caseId).appSha,
      probeSha: 'a'.repeat(40),
      directory,
      mode,
      caseId,
    },
    {
      identifySource: (_root, sha) => ({ sha, dirty: false }),
      digestFile: () => 'b'.repeat(64),
      readSource: () => readFileSync(new URL('./run-runtime-tests.mjs', import.meta.url), 'utf8'),
      enterDirectory: () => {},
      loadModule: async (file) => {
        if (file.endsWith('site-search-evidence.ts')) return oracle;
        assert.ok(file.endsWith('browser-harness.ts'));
        return harness;
      },
      createCapture: (cdp, directory, origin) =>
        createProfileCapture(cdp, directory, origin, fastWait),
    }
  );
  return { report, calls, cdp };
}

for (const mode of ['unprofiled', 'profiled']) {
  test(`full runner ${mode} fake-browser path makes one visit and performs all cleanup`, async () => {
    const directory = temp();
    try {
      const { report, calls, cdp } = await fakeVisit(directory, { mode });
      assert.equal(report.outcome, 'captured');
      assert.equal(report.readiness.onTime, true);
      assert.equal(calls.filter(([name]) => name === 'visit').length, 1);
      assert.equal(calls.find(([name]) => name === 'visit')[2].waitUntil, 'networkidle');
      assert.deepEqual(calls.find(([name]) => name === 'context')[1].viewport, {
        width: 390,
        height: 960,
      });
      assert.equal(calls.find(([name]) => name === 'context')[1].colorScheme, 'light');
      for (const name of ['context-close', 'browser-close', 'server-stop'])
        assert.equal(calls.filter(([label]) => label === name).length, 1);
      assert.equal(
        cdp.commands.filter(([name]) => name === 'Profiler.stop').length,
        mode === 'profiled' ? 1 : 0
      );
      assert.equal(
        cdp.commands.filter(([name]) => name === 'Tracing.end').length,
        mode === 'profiled' ? 1 : 0
      );
      if (mode === 'profiled') assert.equal(read(directory, 'profile-status.json').complete, true);
      assert.equal(read(directory, 'result.json').outcome, 'captured');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

for (const partial of [
  { cpuStop: 'throws' },
  { cpuStop: 'timeout' },
  { cpuStop: 'throws', missingEof: true },
  { missingEof: true },
  { traceStart: 'throws' },
]) {
  test(`full runner persists original/partial outcomes and cleanup: ${JSON.stringify(partial)}`, async () => {
    const directory = temp();
    try {
      const { report, calls, cdp } = await fakeVisit(directory, { ...partial, readyAt: 1149 });
      assert.equal(report.outcome, 'failure');
      assert.equal(report.profile.complete, false);
      if (!partial.traceStart) {
        assert.equal(report.readiness.onTime, false);
        assert.equal(
          read(directory, 'readiness.json').evidence.observedReadyAt -
            report.readiness.evidence.deadline,
          149
        );
        assert.ok(report.failures.includes('Original 1000ms initial-ready deadline failed'));
        assert.equal(calls.filter(([name]) => name === 'visit').length, 1);
        assert.ok(existsSync(path.join(directory, 'observation.json')));
      } else {
        assert.equal(calls.filter(([name]) => name === 'visit').length, 0);
        assert.equal(report.profile.cpu.persisted, true);
        assert.ok(report.failures.some((failure) => failure.includes('Trace start rejected')));
      }
      for (const name of ['context-close', 'browser-close', 'server-stop'])
        assert.equal(calls.filter(([label]) => label === name).length, 1);
      assert.equal(cdp.commands.filter(([name]) => name === 'Profiler.stop').length, 1);
      assert.equal(cdp.commands.filter(([name]) => name === 'Tracing.end').length, 1);
      assert.equal(read(directory, 'result.json').profile.complete, false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('CPU persistence failure retains a completed timeline and explicit partial status', async () => {
  const directory = temp();
  try {
    mkdirSync(path.join(directory, 'startup.cpuprofile'));
    const capture = createProfileCapture(fakeCdp(), directory, origin, fastWait);
    await capture.start();
    const partial = await capture.stop();
    assert.equal(partial.cpu.stopped, true);
    assert.equal(partial.cpu.persisted, false);
    assert.equal(partial.timeline.eof, true);
    assert.equal(partial.timeline.persisted, true);
    assert.equal(partial.complete, false);
    assert.ok(partial.failures.some((failure) => failure.phase === 'CPU stop/persist'));
    assert.equal(read(directory, 'timeline.json').traceEvents[0].name, 'Layout');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
