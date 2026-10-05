// Candidate-owned, opt-in diagnostic. Importing this module starts no server/browser.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SEARCH_PROFILE = Object.freeze({
  route: '/zh-cn/ui-libraries/shadcn/button/',
  readinessBudgetMs: 1000,
  lateObservationMs: 10_000,
  operationTimeoutMs: 30_000,
  samplingIntervalUs: 1000,
  maxTraceEvents: 60_000,
  maxTraceBytes: 24 * 1024 * 1024,
});
export const SEARCH_PROFILE_PHASE_NAMES = Object.freeze([
  'pui-search:probe-installed',
  'pui-search:owners-observed',
  'pui-search:definition-observed',
  'pui-search:open-materialized-observed',
  'pui-search:close-materialized-observed',
  'pui-search:retry-materialized-observed',
  'pui-search:atomic-active-observed',
  'pui-search:capture-end',
]);
export const SEARCH_SCENARIOS = Object.freeze({
  'shadcn-dark-1440': Object.freeze({
    appSha: '7669713a853211bb36995039d3c16569799c3e88',
    viewport: Object.freeze({ width: 1440, height: 960 }),
    theme: 'dark',
    originalFailure: Object.freeze({
      run: '37299323767',
      job: '111728926821',
      artifact: '11342065747',
      stageElapsedMs: 1040,
    }),
  }),
  'shadcn-light-390': Object.freeze({
    appSha: '9e183f7a7d69e61d17d62d92e3ccdacd00196833',
    viewport: Object.freeze({ width: 390, height: 960 }),
    theme: 'light',
    originalFailure: Object.freeze({
      run: '37301908661',
      job: '111736429219',
      artifact: '11341649920',
      stageElapsedMs: 1149,
    }),
  }),
});
export function searchScenario(caseId) {
  assert.ok(Object.hasOwn(SEARCH_SCENARIOS, caseId), 'An explicitly bound Search case is required');
  return SEARCH_SCENARIOS[caseId];
}
const oraclePath = 'apps/www/src/content/docs/zh-cn/site-search-evidence.ts';
const harnessPath = 'apps/www/src/content/docs/zh-cn/browser-harness.ts';
const runnerPath = 'scripts/test/run-runtime-tests.mjs';
const sourceFiles = [
  oraclePath,
  harnessPath,
  runnerPath,
  'apps/www/src/content/docs/zh-cn/site-search-commands.browser.test.ts',
  'apps/www/src/components/override/Search.astro',
  'apps/www/src/components/site-search-commands.ts',
  'apps/www/src/components/PrototypePreviewer/projection-materializer.ts',
  'package.json',
  'pnpm-lock.yaml',
];

export function sourceIdentity(root, expectedSha) {
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'An exact lowercase source SHA is required');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const sha = git('rev-parse', 'HEAD');
  assert.equal(sha, expectedSha, 'Checkout does not match the requested source');
  assert.equal(git('status', '--porcelain', '--untracked-files=all'), '', 'Checkout must be clean');
  return { sha, dirty: false };
}
export function fileDigest(root, file) {
  return createHash('sha256')
    .update(readFileSync(path.join(root, file)))
    .digest('hex');
}
export function mainReadyRoutes(source) {
  // Read the original checkout's inert literal, never evaluate its runner twice.
  const match = source.match(/const READY_ROUTES = (\[[\s\S]*?\]);/);
  assert.ok(match, 'Original main-CI warmup routes are unavailable');
  assert.match(match[1], /^\[\s*(?:'\/[a-z0-9/-]+',?\s*)+\]$/);
  const routes = [...match[1].matchAll(/'(\/[^']*)'/g)].map((entry) => entry[1]);
  assert.ok(routes.includes(SEARCH_PROFILE.route));
  return routes;
}
export function allowedLocalUrl(value, origin, websocket = false) {
  try {
    const url = new URL(value);
    if (websocket) url.protocol = url.protocol === 'ws:' ? 'http:' : 'https:';
    return url.origin === origin && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function safeUrl(value, origin) {
  if (!value) return '';
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return '[non-local-url]';
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return '[invalid-url]';
  }
}
export function safeError(error, origin) {
  return String(error)
    .replace(/(?:https?|wss?|file|data):[^\s"'<>]+/g, (url) => safeUrl(url, origin))
    .slice(0, 1000);
}
export function safeCallFrame(frame, origin) {
  return {
    functionName: safeError(frame.functionName ?? '', origin),
    scriptId: frame.scriptId,
    url: safeUrl(frame.url, origin),
    lineNumber: frame.lineNumber,
    columnNumber: frame.columnNumber,
  };
}
export function safeCpuProfile(profile, origin) {
  return {
    startTime: profile.startTime,
    endTime: profile.endTime,
    samples: profile.samples,
    timeDeltas: profile.timeDeltas,
    nodes: profile.nodes.map((node) => ({
      id: node.id,
      callFrame: safeCallFrame(node.callFrame, origin),
      hitCount: node.hitCount,
      children: node.children,
      positionTicks: node.positionTicks,
    })),
  };
}
export function safeTimelineEvent(event, origin) {
  // Retain browser timing and public source locations only, never arbitrary
  // trace payloads (request headers, bodies, DOM, screenshots or script source).
  if (event.cat?.includes('user_timing') && !SEARCH_PROFILE_PHASE_NAMES.includes(event.name))
    return null;
  const result = {};
  for (const key of ['cat', 'name', 'ph', 'pid', 'tid', 'ts', 'dur', 'tts', 'tdur'])
    if (typeof event[key] === 'number' || typeof event[key] === 'string')
      result[key] = typeof event[key] === 'string' ? safeError(event[key], origin) : event[key];
  const data = {};
  for (const key of [
    'scriptId',
    'lineNumber',
    'columnNumber',
    'usedHeapSizeBefore',
    'usedHeapSizeAfter',
  ])
    if (typeof event.args?.data?.[key] === 'number') data[key] = event.args.data[key];
  if (typeof event.args?.data?.functionName === 'string')
    data.functionName = safeError(event.args.data.functionName, origin);
  for (const key of ['url', 'scriptName'])
    if (typeof event.args?.data?.[key] === 'string')
      data[key] = safeUrl(event.args.data[key], origin);
  if (Array.isArray(event.args?.data?.stackTrace))
    data.stackTrace = event.args.data.stackTrace
      .slice(0, 32)
      .map((frame) => safeCallFrame(frame, origin));
  result.args = { data };
  if (event.ph === 'M' && ['thread_name', 'process_name'].includes(event.name))
    result.args.name = safeError(event.args?.name ?? '', origin);
  return result;
}

/** Add observer-delivery marks, not invented function-entry timestamps. */
export function installSearchPhaseMarks() {
  performance.mark('pui-search:probe-installed');
  const trace = window.__puiSearchStartup;
  const original = trace.record;
  const seen = new Set();
  trace.record = (reason) => {
    original.call(trace, reason);
    const state = trace.snapshot().events.at(-1)?.state;
    const mark = (name, present) => {
      if (present && !seen.has(name)) {
        seen.add(name);
        performance.mark(`pui-search:${name}`);
      }
    };
    mark('definition-observed', state?.defined);
    mark('owners-observed', state?.mounts.length === 3);
    for (const command of ['open', 'close', 'retry'])
      mark(
        `${command}-materialized-observed`,
        state?.commands.some((entry) => entry.command === command)
      );
    mark(
      'atomic-active-observed',
      state?.view === 'ready' &&
        state?.hosts.length === 3 &&
        state.hosts.every((host) => host.projectionGenerationState === 'active')
    );
  };
}

export function bounded(promise, label, ms = SEARCH_PROFILE.operationTimeoutMs) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} exceeded diagnostic bound (${ms}ms)`)),
        ms
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function recordReadiness(page, oracle, save, now = Date.now) {
  // Same start boundary as the existing test: immediately after networkidle
  // and its response check. Disk/probe/IPC time is INCLUDED in this deadline.
  const startedAt = now();
  save('initial-ready-boundary', { startedAt, deadline: startedAt + 1000 });
  const evidence = await bounded(
    page.evaluate(oracle.readSearchReadyWithinBudget, { startedAt }),
    'initial readiness'
  );
  const onTime = oracle.searchReadinessWasOnTime(evidence);
  // Persist the real verdict before late observation, profiling stop or cleanup.
  save('initial-ready-result', { evidence, onTime });
  return { evidence, onTime };
}

/** Exclude only known scheduler wrappers; unknown semantic events stay eligible. */
export function isTimelineSchedulerNoise(event) {
  const categories = String(event.cat ?? '')
    .split(',')
    .filter(Boolean);
  if (categories.length && categories.every((category) => ['toplevel', 'mojom'].includes(category)))
    return true;
  return (
    event.name === 'RunTask' &&
    categories.length > 0 &&
    categories.every((category) =>
      ['disabled-by-default-devtools.timeline', 'toplevel'].includes(category)
    )
  );
}

/** Serialized into the page after the original verdict and bounded late observation. */
export function readProfileCoverage(knownPhaseNames) {
  performance.mark('pui-search:capture-end');
  return performance
    .getEntriesByType('mark')
    .filter((entry) => knownPhaseNames.includes(entry.name))
    .map((entry) => ({ name: entry.name, startTime: entry.startTime }));
}

export function validateTimelineCoverage(events, expectedMarks, cpuClock) {
  const issues = [];
  const expected = Array.isArray(expectedMarks) ? expectedMarks : [];
  const names = expected.map((mark) => mark.name);
  const validMarks =
    expected.length >= 2 &&
    expected.length <= 16 &&
    new Set(names).size === names.length &&
    names.includes('pui-search:probe-installed') &&
    names.includes('pui-search:capture-end') &&
    expected.every(
      (mark) =>
        typeof mark.name === 'string' &&
        SEARCH_PROFILE_PHASE_NAMES.includes(mark.name) &&
        Number.isFinite(mark.startTime) &&
        mark.startTime >= 0
    );
  if (!validMarks) return { complete: false, issues: ['Missing or invalid browser mark coverage'] };
  const matched = [];
  for (const mark of expected) {
    const candidates = events.filter(
      (event) =>
        event.name === mark.name && String(event.cat).split(',').includes('blink.user_timing')
    );
    if (candidates.length !== 1) {
      issues.push(`Missing or duplicate trace mark: ${mark.name}`);
      continue;
    }
    const event = candidates[0];
    if (
      !['I', 'R'].includes(event.ph) ||
      ![event.pid, event.tid, event.ts].every(Number.isFinite)
    ) {
      issues.push(`Invalid trace mark: ${mark.name}`);
      continue;
    }
    matched.push({ ...mark, pid: event.pid, tid: event.tid, ts: event.ts });
  }
  const renderer = matched[0] && { pid: matched[0].pid, tid: matched[0].tid };
  if (!renderer || matched.some((mark) => mark.pid !== renderer.pid || mark.tid !== renderer.tid))
    issues.push('Stage marks do not identify one renderer thread');
  if (
    renderer &&
    !events.some(
      (event) =>
        event.ph === 'M' &&
        event.name === 'thread_name' &&
        event.pid === renderer.pid &&
        event.tid === renderer.tid &&
        event.args?.name === 'CrRendererMain'
    )
  )
    issues.push('Renderer main-thread metadata is missing');
  const start = matched.find((mark) => mark.name === 'pui-search:probe-installed');
  const end = matched.find((mark) => mark.name === 'pui-search:capture-end');
  const rendererEvents = renderer
    ? events.filter(
        (event) =>
          event.pid === renderer.pid &&
          event.tid === renderer.tid &&
          event.ph === 'X' &&
          Number.isFinite(event.ts) &&
          Number.isFinite(event.dur) &&
          start &&
          end &&
          event.ts + event.dur >= start.ts &&
          event.ts <= end.ts
      )
    : [];
  const semanticKinds = {
    javascript: rendererEvents.some((event) =>
      ['FunctionCall', 'EvaluateScript', 'v8.run', 'v8.callFunction', 'v8.evaluateModule'].includes(
        event.name
      )
    ),
    render: rendererEvents.some((event) =>
      ['Layout', 'UpdateLayoutTree', 'RecalculateStyles'].includes(event.name)
    ),
  };
  if (!semanticKinds.javascript || !semanticKinds.render)
    issues.push('Renderer JavaScript/render timing coverage is missing');
  const offsets = matched.map((mark) => mark.ts - mark.startTime * 1000);
  const spreadUs = offsets.length ? Math.max(...offsets) - Math.min(...offsets) : null;
  if (spreadUs === null || spreadUs > 1000)
    issues.push('Browser/trace clock alignment exceeds 1000us diagnostic tolerance');

  if (!start || !end || end.startTime <= start.startTime || end.ts <= start.ts)
    issues.push('Missing or reversed capture boundaries');
  if (
    !cpuClock ||
    !Number.isFinite(cpuClock.startTime) ||
    !Number.isFinite(cpuClock.endTime) ||
    !start ||
    !end ||
    cpuClock.startTime > start.ts ||
    cpuClock.endTime < end.ts
  )
    issues.push('CPU clock does not enclose the renderer capture boundaries');
  return {
    complete: issues.length === 0,
    issues,
    renderer,
    semanticKinds,
    expectedMarkCount: expected.length,
    matchedMarkCount: matched.length,
    offsetSpreadUs: spreadUs,
    originMonotonicUs: offsets.length ? (Math.max(...offsets) + Math.min(...offsets)) / 2 : null,
    fromMs: start?.startTime ?? null,
    toMs: end?.startTime ?? null,
  };
}

export function createProfileCapture(cdp, directory, origin, wait = bounded) {
  let count = 0;
  let bytes = 0;
  let dropped = 0;
  let stopping;
  let startRequested = false;
  let received = 0;
  let schedulerExcluded = 0;
  let privacyExcluded = 0;
  let expectedMarks;
  let cpuClock;
  let coverage = { complete: false, issues: ['Capture has not been validated'] };
  const events = [];
  const failures = [];
  const cpu = {
    startAttempted: false,
    started: false,
    stopAttempted: false,
    stopped: false,
    persisted: false,
  };
  const timeline = {
    startAttempted: false,
    started: false,
    endAttempted: false,
    ended: false,
    eof: false,
    backendDataLoss: null,
    persisted: false,
  };
  const summary = () => ({
    startRequested,
    eventCount: count,
    bytes,
    dropped,
    truncated: dropped > 0,
    cpu: { ...cpu },
    timeline: { ...timeline },
    failures: [...failures],
    filter: { version: 1, received, schedulerExcluded, privacyExcluded },
    coverage,
    cpuClock,
    complete:
      cpu.persisted &&
      timeline.started &&
      timeline.eof &&
      timeline.persisted &&
      timeline.backendDataLoss === false &&
      coverage.complete &&
      failures.length === 0 &&
      dropped === 0,
  });
  const fail = (phase, error) => failures.push({ phase, error: safeError(error, origin) });
  const status = () => {
    try {
      writeFileSync(
        path.join(directory, 'profile-status.json'),
        JSON.stringify(summary(), null, 2)
      );
    } catch (error) {
      fail('status persist', error);
    }
  };
  const journal = path.join(directory, 'timeline.ndjson');
  writeFileSync(journal, '');
  const collect = ({ value }) => {
    for (const raw of value) {
      received++;
      if (isTimelineSchedulerNoise(raw)) {
        schedulerExcluded++;
        continue;
      }
      const event = safeTimelineEvent(raw, origin);
      if (!event) {
        privacyExcluded++;
        continue;
      }
      const text = `${JSON.stringify(event)}\n`;
      if (
        count >= SEARCH_PROFILE.maxTraceEvents ||
        bytes + Buffer.byteLength(text) > SEARCH_PROFILE.maxTraceBytes
      ) {
        dropped++;
        continue;
      }
      count++;
      bytes += Buffer.byteLength(text);
      events.push(event);
      try {
        appendFileSync(journal, text);
      } catch (error) {
        if (!failures.some((entry) => entry.phase === 'timeline journal'))
          fail('timeline journal', error);
      }
    }
  };
  let resolveEof;
  const eof = new Promise((resolve) => {
    resolveEof = resolve;
  });
  const complete = (event) => {
    if (timeline.eof) return;
    timeline.eof = true;
    timeline.backendDataLoss =
      typeof event?.dataLossOccurred === 'boolean' ? event.dataLossOccurred : null;
    if (timeline.backendDataLoss !== false)
      fail(
        'timeline backend data loss',
        timeline.backendDataLoss === true
          ? 'CDP reported lost trace data'
          : 'CDP data-loss status is unavailable'
      );
    resolveEof();
  };
  cdp.on('Tracing.dataCollected', collect);
  cdp.on('Tracing.tracingComplete', complete);
  // A cleanup handle and durable state exist before the first CDP await.
  status();
  const command = (name, args) =>
    wait(
      Promise.resolve().then(() => cdp.send(name, args)),
      name,
      10_000
    );
  const stopCpu = async () => {
    if (!cpu.startAttempted) return;
    cpu.stopAttempted = true;
    try {
      const { profile } = await command('Profiler.stop');
      cpu.stopped = true;
      cpuClock = { startTime: profile.startTime, endTime: profile.endTime };
      writeFileSync(
        path.join(directory, 'startup.cpuprofile'),
        JSON.stringify(safeCpuProfile(profile, origin))
      );
      cpu.persisted = true;
    } catch (error) {
      fail('CPU stop/persist', error);
    }
  };
  const stopTimeline = async () => {
    if (!timeline.startAttempted) return;
    timeline.endAttempted = true;
    try {
      await command('Tracing.end');
      timeline.ended = true;
    } catch (error) {
      fail('timeline end', error);
    }
    // EOF is a separate bounded operation even if Tracing.end rejects/times out.
    try {
      await wait(eof, 'timeline EOF', 10_000);
    } catch (error) {
      fail('timeline EOF', error);
    }
  };
  return {
    async start() {
      assert.ok(!startRequested && !stopping, 'A capture can start only once');
      startRequested = true;
      status();
      try {
        await command('Profiler.enable');
        await command('Profiler.setSamplingInterval', {
          interval: SEARCH_PROFILE.samplingIntervalUs,
        });
        cpu.startAttempted = true;
        status();
        await command('Profiler.start');
        cpu.started = true;
        timeline.startAttempted = true;
        status();
        await command('Tracing.start', {
          categories:
            'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline',
          transferMode: 'ReportEvents',
        });
        timeline.started = true;
        status();
      } catch (error) {
        fail('capture start', error);
        status();
        throw error;
      }
    },
    setCoverage(marks) {
      assert.ok(!stopping, 'Browser coverage must be recorded before stopping');
      if (
        !Array.isArray(marks) ||
        marks.some((mark) => !SEARCH_PROFILE_PHASE_NAMES.includes(mark?.name))
      ) {
        expectedMarks = undefined;
        fail('coverage input', 'Unrecognized Search phase mark');
        return;
      }
      expectedMarks = marks.map((mark) => ({ name: mark.name, startTime: mark.startTime }));
    },
    stop() {
      // Main-path completion and finally share one settled promise. A failed
      // channel cannot replay stop commands or suppress the other channel.
      stopping ??= (async () => {
        await Promise.all([stopCpu(), stopTimeline()]);
        cdp.off('Tracing.dataCollected', collect);
        cdp.off('Tracing.tracingComplete', complete);
        coverage = validateTimelineCoverage(events, expectedMarks, cpuClock);
        if (!coverage.complete) fail('timeline coverage', coverage.issues.join('; '));
        try {
          timeline.persisted = true;
          writeFileSync(
            path.join(directory, 'timeline.json'),
            JSON.stringify({ traceEvents: events, metadata: summary() })
          );
        } catch (error) {
          timeline.persisted = false;
          fail('timeline persist', error);
        }
        status();
        return summary();
      })();
      return stopping;
    },
  };
}

export async function runSearchProfile(
  { appRoot, probeRoot, appSha, probeSha, directory, mode, caseId },
  {
    // Programmatic test seam only; the CLI supplies none of these dependencies.
    identifySource = sourceIdentity,
    digestFile = fileDigest,
    readSource = readFileSync,
    enterDirectory = (root) => process.chdir(root),
    loadModule = (file) => import(pathToFileURL(file).href),
    createCapture = createProfileCapture,
  } = {}
) {
  assert.ok(['unprofiled', 'profiled'].includes(mode));
  const scenario = searchScenario(caseId);
  assert.notEqual(
    path.resolve(appRoot),
    path.resolve(probeRoot),
    'Use separate app/probe checkouts'
  );
  assert.equal(
    process.env.PROTO_UI_BROWSER_BASE_URL,
    undefined,
    'An external server is not allowed'
  );
  mkdirSync(directory, { recursive: true });
  const write = (file, value) =>
    writeFileSync(path.join(directory, `${file}.json`), `${JSON.stringify(value, null, 2)}\n`);
  const boundary = {
    schemaVersion: 1,
    requested: { appSha, probeSha },
    mode,
    execution: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      eventSha: process.env.GITHUB_SHA ?? null,
      workflowSha: process.env.GITHUB_WORKFLOW_SHA ?? null,
    },
    caseId,
    scope: { ...SEARCH_PROFILE, viewport: scenario.viewport, theme: scenario.theme },
    originalFailure: { ...scenario.originalFailure, checkoutSha: scenario.appSha },
    limitations: [
      'One visit only; no retry or acceptance override. This is not the full browser shard.',
      'Profiler and observer/network interception perturb execution; a sampled pass is not performance acceptance.',
      'Independent jobs/runners do not isolate profiling overhead; do not infer a causal timing improvement from their difference.',
      'Fresh browser/context and original main-CI route warmup; earlier Search matrix visits are not replayed.',
      'Observed phase marks are delivery boundaries, not internal loadPrototypes/renderDemo/nextPaint function entry marks.',
      'Timeline may be capped; query strings, fragments, non-local URLs and arbitrary payloads are omitted.',
    ],
  };
  write('boundary', boundary);
  let browser, context, stopServer, profileCapture;
  let origin = 'http://127.0.0.1';
  const report = { caseId, mode, outcome: 'incomplete', failures: [], blockedRequests: 0 };
  const save = (stage, data = {}) => {
    const value = { stage, at: new Date().toISOString(), ...data };
    appendFileSync(path.join(directory, 'progress.ndjson'), `${JSON.stringify(value)}\n`);
    write('progress', value);
  };
  try {
    boundary.app = identifySource(appRoot, appSha);
    assert.equal(appSha, scenario.appSha, 'Application SHA does not match the bound failure case');
    boundary.probe = identifySource(probeRoot, probeSha);
    boundary.appFiles = Object.fromEntries(
      sourceFiles.map((file) => [file, digestFile(appRoot, file)])
    );
    boundary.probeFileSha256 = digestFile(probeRoot, 'scripts/test/search-startup-profile.mjs');
    boundary.readyRoutes = mainReadyRoutes(readSource(path.join(appRoot, runnerPath), 'utf8'));
    write('boundary', boundary);
    enterDirectory(appRoot);
    const oracle = await loadModule(path.join(appRoot, oraclePath));
    const harness = await loadModule(path.join(appRoot, harnessPath));
    stopServer = harness.stopServer;
    save('server-start');
    origin = await bounded(harness.startServer(boundary.readyRoutes), 'server warmup', 180_000);
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    // The app's generators must not silently change the original source.
    boundary.appAfterWarmup = identifySource(appRoot, appSha);
    write('boundary', boundary);
    browser = await bounded(harness.launchBrowser(), 'browser launch');
    report.browserVersion = browser.version();
    context = await browser.newContext({
      viewport: scenario.viewport,
      colorScheme: scenario.theme,
      serviceWorkers: 'block',
    });
    await context.route('**/*', (route) => {
      if (allowedLocalUrl(route.request().url(), origin)) return route.continue();
      report.blockedRequests++;
      return route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', (socket) => {
      if (allowedLocalUrl(socket.url(), origin, true)) socket.connectToServer();
      else {
        report.blockedRequests++;
        socket.close();
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(SEARCH_PROFILE.operationTimeoutMs);
    page.setDefaultNavigationTimeout(SEARCH_PROFILE.operationTimeoutMs);
    const errors = [];
    page.on('pageerror', (error) => {
      if (errors.length < 20) errors.push(safeError(error, origin));
    });
    await page.addInitScript({
      content: `localStorage.setItem('starlight-theme', ${JSON.stringify(scenario.theme)});\n(${oracle.installSearchStartupTrace.toString()})();\n(${installSearchPhaseMarks.toString()})();`,
    });
    const cdp = await context.newCDPSession(page);
    if (mode === 'profiled') {
      profileCapture = createCapture(cdp, directory, origin);
      await profileCapture.start();
    }
    save('navigate');
    const response = await page.goto(`${origin}${SEARCH_PROFILE.route}`, {
      waitUntil: 'networkidle',
    });
    assert.ok(response?.ok(), 'Expected the existing Shadcn documentation route');
    report.readiness = await recordReadiness(page, oracle, save);
    write('readiness', report.readiness);
    if (!report.readiness.onTime)
      report.failures.push('Original 1000ms initial-ready deadline failed');
    // Capture late atomic activation for diagnosis only. Never replace readiness.
    report.lateObservation = { startedAt: Date.now(), budgetMs: SEARCH_PROFILE.lateObservationMs };
    save('late-observation');
    await page
      .waitForFunction(
        () => document.querySelector('site-search')?.getAttribute('data-search-view') === 'ready',
        undefined,
        { timeout: SEARCH_PROFILE.lateObservationMs }
      )
      .then(
        () => {
          report.lateObservation.ready = true;
        },
        () => {
          report.lateObservation.ready = false;
        }
      );
    report.lateObservation.completedAt = Date.now();
    save('late-observation-result', report.lateObservation);
    if (profileCapture) {
      profileCapture.setCoverage(
        await bounded(
          page.evaluate(readProfileCoverage, SEARCH_PROFILE_PHASE_NAMES),
          'capture coverage'
        )
      );
      report.profile = await profileCapture.stop();
    }
    const observed = await bounded(
      page.evaluate(
        (knownPhaseNames) => ({
          startup: window.__puiSearchStartup?.snapshot(),
          navigation: performance.getEntriesByType('navigation').map((entry) => entry.toJSON()),
          resources: performance
            .getEntriesByType('resource')
            .slice(0, 1500)
            .map((entry) => entry.toJSON()),
          resourceCount: performance.getEntriesByType('resource').length,
          marks: performance
            .getEntriesByType('mark')
            .filter((entry) => knownPhaseNames.includes(entry.name))
            .map((entry) => ({ name: entry.name, startTime: entry.startTime })),
        }),
        SEARCH_PROFILE_PHASE_NAMES
      ),
      'observer capture'
    );
    // Whitelist timing fields instead of publishing arbitrary PerformanceEntry data.
    const timing = (entry) =>
      Object.fromEntries(
        Object.entries(entry)
          .filter(
            ([key, value]) =>
              typeof value === 'number' || ['entryType', 'initiatorType'].includes(key)
          )
          .concat([['name', safeUrl(entry.name, origin)]])
      );
    observed.marks = observed.marks
      .filter(
        (mark) => SEARCH_PROFILE_PHASE_NAMES.includes(mark.name) && Number.isFinite(mark.startTime)
      )
      .map((mark) => ({ name: mark.name, startTime: mark.startTime }));
    observed.navigation = observed.navigation.map(timing);
    observed.resources = observed.resources.map(timing);
    if (observed.startup)
      observed.startup.resources = observed.startup.resources.map((entry) => ({
        ...entry,
        name: safeUrl(entry.name, origin),
      }));
    write('observation', { ...observed, errors });
    if (errors.length) report.failures.push('Page errors occurred; inspect observation.json');
    if (report.blockedRequests)
      report.failures.push(
        'Non-local requests were blocked; the local-only run is not equivalent to normal CI'
      );
    if (report.profile && !report.profile.complete)
      report.failures.push('CPU/timeline capture incomplete; inspect profile-status.json');
    report.outcome = report.failures.length ? 'failure' : 'captured';
  } catch (error) {
    report.failures.push(safeError(error, origin));
    report.outcome = 'failure';
    save('failure', { failures: report.failures });
  } finally {
    // Write the original outcome first, including failures before navigation.
    write('result', report);
    if (profileCapture) {
      report.profile = await profileCapture.stop();
      const incomplete = 'CPU/timeline capture incomplete; inspect profile-status.json';
      if (!report.profile.complete && !report.failures.includes(incomplete))
        report.failures.push(incomplete);
      if (report.failures.length) report.outcome = 'failure';
      write('result', report);
    }
    for (const [label, cleanup] of [
      ['context', context && (() => context.close())],
      ['browser', browser && (() => browser.close())],
      ['server', stopServer],
    ]) {
      if (!cleanup) continue;
      try {
        await bounded(cleanup(), `${label} cleanup`, 15_000);
      } catch (error) {
        report.failures.push(safeError(error, origin));
        report.outcome = 'failure';
        write('result', report);
      }
    }
    try {
      report.appAfter = identifySource(appRoot, appSha);
      report.probeAfter = identifySource(probeRoot, probeSha);
    } catch (error) {
      report.failures.push(safeError(error, origin));
      report.outcome = 'failure';
    }
    write('result', report);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [appRoot, directory, mode, caseId] = process.argv.slice(2);
  const probeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  // Imported app TypeScript is loaded with that checkout's locked tsx loader.
  const report = await runSearchProfile({
    appRoot,
    probeRoot,
    directory,
    mode,
    caseId,
    appSha: process.env.PROTO_UI_PROFILE_APP_SHA,
    probeSha: process.env.PROTO_UI_PROFILE_PROBE_SHA,
  });
  process.exit(report.outcome === 'captured' ? 0 : 1);
}
