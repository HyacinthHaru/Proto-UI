import { expect, it, vi } from 'vitest';
it('mounts the actual four-framework capture app in one logical-owner factory per tree', async () => {
  const errors: unknown[] = [];
  const onError = (event: ErrorEvent) => errors.push(event.error);
  const onReject = (event: PromiseRejectionEvent) => errors.push(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onReject);
  document.body.innerHTML = '<main></main>';
  const flush = () => new Promise((resolve) => setTimeout(resolve, 30));
  try {
    // @ts-expect-error The native browser fixture is deliberately JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-evidence-app.mjs');
    await flush();
    const app = (window as any).textareaEvidence;
    expect(app.records.map((record: any) => record.kind)).toEqual(['wc', 'react', 'vue', 'vue2']);
    const editors = app.records.map((record: any) => record.editor());
    expect(editors.every(Boolean)).toBe(true);
    for (const editor of editors) {
      expect(editor.getAttribute('data-pui-style')).toContain('rounded-[var(--pui-radius-2xl)]');
      expect(editor.getAttribute('aria-labelledby')).toBeTruthy();
    }
    app.set('new-york', true);
    await vi.waitFor(
      () =>
        expect(
          app.records.map((r: any) => [r.kind, r.editor()?.getAttribute('aria-invalid')])
        ).toEqual(['wc', 'react', 'vue', 'vue2'].map((kind) => [kind, 'true'])),
      { timeout: 1000 }
    );
    for (const [index, record] of app.records.entries()) {
      expect(record.editor()).toBe(editors[index]);
      expect(record.editor().getAttribute('aria-invalid'), record.kind).toBe('true');
      expect(record.editor().getAttribute('data-pui-style')).toContain('rounded-md');
    }
    app.set('rhea', false);
    await vi.waitFor(
      () =>
        expect(
          app.records.map((r: any) => [r.kind, r.editor()?.getAttribute('aria-invalid')])
        ).toEqual(['wc', 'react', 'vue', 'vue2'].map((kind) => [kind, 'false'])),
      { timeout: 1000 }
    );
    for (const [index, record] of app.records.entries()) {
      expect(record.editor()).toBe(editors[index]);
      expect(record.editor().getAttribute('aria-invalid')).toBe('false');
    }
    expect(errors).toEqual([]);
  } finally {
    (window as any).textareaEvidence?.dispose();
    await flush();
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onReject);
    document.body.replaceChildren();
  }
});

it('compares ring paint using the same CSS property and rejects wrong color or geometry', async () => {
  const { containsExpectedRingShadow } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const colorProperty = 'oklab(0.715469 0.0000326335 0.0000143051 / 0.3)';
  const expectedShadow = 'oklab(0.715469 0.0000326336 0.0000143052 / 0.3) 0px 0px 0px 3px';
  const actual = `rgb(255, 255, 255) 0px 0px 0px 0px, ${expectedShadow}, rgba(0, 0, 0, 0) 0px 0px 0px 0px`;
  expect(actual.includes(colorProperty)).toBe(false); // Original native failure.
  expect(containsExpectedRingShadow(actual, expectedShadow)).toBe(true);
  expect(containsExpectedRingShadow(actual.replace('/ 0.3)', '/ 0.2)'), expectedShadow)).toBe(
    false
  );
  expect(containsExpectedRingShadow(actual.replace('0.715469', '0.577107'), expectedShadow)).toBe(
    false
  );
  expect(containsExpectedRingShadow(actual.replace('3px', '2px'), expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow('none', expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(`${expectedShadow} inset`, expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(`${expectedShadow} 1px`, expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(`inset ${expectedShadow}`, expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(`${actual})`, expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(`(${actual}`, expectedShadow)).toBe(false);
  expect(containsExpectedRingShadow(actual, '')).toBe(false);
  expect(containsExpectedRingShadow('none', 'none')).toBe(false);
});

it('retains bounded paint samples without treating near-equal paint as acceptance', async () => {
  const { appendTextareaPaintSample, containsExpectedRingShadow } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const attempt: any = {};
  for (let i = 0; i < 40; i++) appendTextareaPaintSample(attempt, { browserTimeMs: i });
  expect(attempt.sampleCount).toBe(40);
  expect(attempt.omittedSamples).toBe(8);
  expect(attempt.samples).toHaveLength(32);
  expect(attempt.samples.slice(0, 31).map((s: any) => s.browserTimeMs))
    .toEqual(Array.from({ length: 31 }, (_, i) => i));
  expect(attempt.samples[31].browserTimeMs).toBe(39);
  const expected = 'oklab(0.555523 0.0000253916 0.0000110865 / 0.3) 0px 0px 0px 3px';
  expect(containsExpectedRingShadow(expected.replace('253916', '253917'), expected)).toBe(false);
});

it('records only relevant bounded transition metadata without changing animation state', async () => {
  const { installTextareaPaintDiagnostics } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const editor = document.createElement('textarea') as any;
  const finish = vi.fn(), cancel = vi.fn(), pause = vi.fn(), play = vi.fn();
  const animation = {
    transitionProperty: 'box-shadow', playState: 'running', pending: false,
    currentTime: 199, startTime: 10, playbackRate: 1,
    effect: { getComputedTiming: () => ({
      localTime: 199, progress: 0.999, currentIteration: 0, delay: 0,
      duration: 200, activeDuration: 200, endTime: 200, fill: 'backwards',
    }) },
    finish, cancel, pause, play,
  };
  editor.getAnimations = () => [
    { ...animation, transitionProperty: 'opacity' },
    ...Array.from({ length: 10 }, () => animation),
  ];
  const dispatch = (propertyName: string, type = 'transitionrun', pseudoElement = '') => {
    editor.dispatchEvent(Object.assign(new Event(type), {
      propertyName, pseudoElement, elapsedTime: 0.2,
    }));
  };
  installTextareaPaintDiagnostics(editor);
  try {
    dispatch('opacity');
    dispatch('box-shadow', 'transitionend', '::before');
    for (let i = 0; i < 70; i++) dispatch('box-shadow');
    dispatch('border-top-color', 'transitioncancel');
    const snapshot = editor.__puiPaintDiagnostics.snapshot();
    expect(Number.isFinite(snapshot.browserTimeMs)).toBe(true);
    expect(snapshot.animations).toHaveLength(8);
    expect(snapshot.relevantAnimationCount).toBe(10);
    expect(snapshot.omittedAnimations).toBe(2);
    expect(snapshot.animations[0]).toMatchObject({
      property: 'box-shadow', playState: 'running', currentTimeMs: 199,
      timing: { progress: 0.999, endTime: 200 },
    });
    expect(snapshot.eventCount).toBe(71);
    expect(snapshot.events).toHaveLength(64);
    expect(snapshot.omittedEvents).toBe(7);
    expect(snapshot.events[0].sequence).toBe(8);
    expect(snapshot.events.at(-1)).toMatchObject({
      property: 'border-top-color', type: 'transitioncancel', sequence: 71,
    });
    expect([finish, cancel, pause, play].every((fn) => fn.mock.calls.length === 0)).toBe(true);
    editor.getAnimations = undefined;
    expect(editor.__puiPaintDiagnostics.snapshot()).toMatchObject({
      animationApiAvailable: false, animationReadError: null, animations: [],
    });
    editor.getAnimations = () => { throw new Error('diagnostic unavailable'); };
    expect(editor.__puiPaintDiagnostics.snapshot().animationReadError)
      .toContain('diagnostic unavailable');
  } finally {
    editor.__puiPaintDiagnostics.dispose();
  }
  expect(editor.__puiPaintDiagnostics).toBeUndefined();
});

it.each(['missing', 'snapshot-throws', 'lookup-throws'])(
  'preserves original paint and strict mismatch when diagnostics are %s',
  async (failure) => {
    const { sampleTextareaPaint, containsExpectedRingShadow } =
      // @ts-expect-error Native capture helpers intentionally use JavaScript.
      await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
    const editor = document.createElement('textarea') as any;
    editor.matches = () => false;
    const expectedShadow = 'oklab(0.555523 0.0000253916 0.0000110865 / 0.3) 0px 0px 0px 3px';
    const actualShadow = expectedShadow.replace('253916', '253917');
    const expectedStyle = {
      color: 'rgb(115, 115, 115)', borderColor: 'rgb(115, 115, 115)',
      boxShadow: expectedShadow,
    };
    const actualStyle = {
      ...expectedStyle, boxShadow: actualShadow, opacity: '1',
      getPropertyValue: (name: string) => name === '--pui-ring-width' ? '3px' : '#737373',
    };
    if (failure === 'snapshot-throws') {
      editor.__puiPaintDiagnostics = { snapshot() { throw new Error('snapshot failed'); } };
    } else if (failure === 'lookup-throws') {
      Object.defineProperty(editor, '__puiPaintDiagnostics', {
        get() { throw new Error('lookup failed'); },
      });
    }
    const originalGetComputedStyle = globalThis.getComputedStyle;
    const originalChildCount = document.body.childNodes.length;
    vi.stubGlobal('getComputedStyle', (element: Element) =>
      element === editor ? actualStyle : expectedStyle);
    try {
      const sampled = sampleTextareaPaint(editor, { kind: 'react', ring: '#737373', border: '#737373' });
      expect(sampled).toMatchObject({
        kind: 'react', shadow: actualShadow, expectedRingShadow: expectedShadow,
        ringColor: expectedStyle.color, expectedRing: expectedStyle.color,
        border: expectedStyle.borderColor, expectedBorder: expectedStyle.borderColor,
        ringWidth: '3px', opacity: '1',
      });
      expect(containsExpectedRingShadow(sampled.shadow, sampled.expectedRingShadow)).toBe(false);
      expect(sampled.diagnostic.browserSampleFinishedMs)
        .toBeGreaterThanOrEqual(sampled.diagnostic.browserSampleStartedMs);
      expect(sampled.diagnostic.status).toBe(failure === 'missing' ? 'missing' : 'read-failed');
      expect(sampled.diagnostic.error).toBe(failure === 'missing' ? null :
        failure === 'lookup-throws' ? 'Error: lookup failed' : 'Error: snapshot failed');
      expect(sampled.diagnostic).not.toHaveProperty('events');
      expect(sampled.diagnostic).not.toHaveProperty('animations');
      expect(document.body.childNodes.length).toBe(originalChildCount);
    } finally {
      vi.stubGlobal('getComputedStyle', originalGetComputedStyle);
    }
  }
);

it.each(['none', 'first-phase', 'readiness', 'screenshot', 'both-phases'])(
  'retains the primary failure and both phase attempts when optional failure is %s',
  async (failure) => {
    const { collectTextareaFailureEvidence } =
      // @ts-expect-error Native capture helpers intentionally use JavaScript.
      await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
    const observations = Object.freeze([{ paintAttempt: Object.freeze({ observed: 'original mismatch' }) }]);
    const primary = Object.freeze({ error: 'original endpoint failure', observations });
    const calls: string[] = [];
    let phaseCount = 0;
    const result = await collectTextareaFailureEvidence(primary, {
      readPhase: async () => {
        calls.push(`phase${++phaseCount}`);
        if (failure === 'both-phases' || (failure === 'first-phase' && phaseCount === 1))
          throw new Error('optional phase failed');
        // Even later agreement/completion must not replace the original verdict.
        return { status: 'recorded', paint: { shadow: 'later matching value' }, diagnostic: { events: ['transitionend'] } };
      },
      readReadiness: async () => {
        calls.push('readiness');
        if (failure === 'readiness') throw new Error('optional readiness failed');
        return { ready: true };
      },
      screenshot: async () => {
        calls.push('screenshot');
        if (failure === 'screenshot') throw new Error('optional screenshot failed');
        return { path: 'failure.png', sha256: 'fixture' };
      },
    }, { status: 'persisted' });
    expect(calls).toEqual(['phase1', 'readiness', 'screenshot', 'phase2']);
    expect(result.error).toBe(primary.error);
    expect(result.observations).toBe(observations);
    expect(result.postFailureDiagnostics).toHaveLength(2);
    expect(result.postFailureDiagnostics.map((entry: any) => entry.phase))
      .toEqual(['catch-entry-before-screenshot', 'after-screenshot-attempt']);
    for (const phase of result.postFailureDiagnostics) {
      expect(phase.acceptance).toBe('not evaluated; original failure retained');
      expect(phase.hostFinishedAtMs).toBeGreaterThanOrEqual(phase.hostStartedAtMs);
    }
    if (failure === 'both-phases') {
      expect(result.postFailureDiagnostics.every((entry: any) => entry.status === 'read-failed')).toBe(true);
      expect(result.failureScreenshot.path).toBe('failure.png');
    }
    if (failure === 'screenshot') expect(result.failureScreenshot.error).toContain('optional screenshot failed');
    if (failure === 'readiness') expect(result.readiness.error).toContain('optional readiness failed');
  }
);

it('post-verdict phase reads create no probes and preserve paint when the tracer fails', async () => {
  const { readTextareaPostFailurePhase } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const editor = document.createElement('textarea') as any;
  editor.matches = () => false;
  const snapshot = vi.fn(() => { throw new Error('tracer unavailable'); });
  editor.__puiPaintDiagnostics = { snapshot };
  const previousFixture = (window as any).textareaEvidence;
  const previousComputedStyle = globalThis.getComputedStyle;
  const originalChildren = [...document.body.childNodes];
  const createElement = vi.spyOn(document, 'createElement');
  (window as any).textareaEvidence = { records: [{ kind: 'react', editor: () => editor }] };
  vi.stubGlobal('getComputedStyle', () => ({
    borderColor: 'rgb(1, 2, 3)', boxShadow: 'original painted shadow', opacity: '1',
    getPropertyValue: () => '3px',
  }));
  try {
    const result = readTextareaPostFailurePhase('react');
    expect(result.paint.shadow).toBe('original painted shadow');
    expect(snapshot).toHaveBeenCalledWith(editor);
    expect(result.diagnostic).toEqual({ status: 'read-failed', error: 'Error: tracer unavailable' });
    expect([...document.body.childNodes]).toEqual(originalChildren);
    expect(readTextareaPostFailurePhase('missing').status).toBe('missing');
    expect(createElement).not.toHaveBeenCalled();
    expect(result.browserFinishedMs).toBeGreaterThanOrEqual(result.browserStartedMs);
  } finally {
    createElement.mockRestore();
    (window as any).textareaEvidence = previousFixture;
    vi.stubGlobal('getComputedStyle', previousComputedStyle);
  }
});

it('keeps the actual native sampler invocation at exactly callback plus expected argument', async () => {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const source = await readFile(resolve('scripts/prototypes/shadcn-textarea-evidence.mjs'), 'utf8');
  const invocation = source.match(/const sampled = await (page\.locator\([\s\S]*?\n        \));/);
  expect(invocation).not.toBeNull();
  // This inspects the executed collector call site, not a mock helper call.
  // Any added positional argument (including another function) fails this guard.
  expect(invocation![1].replace(/\s+/g, ' ')).toBe(
    'page.locator(`section[data-runtime="${kind}"] textarea`).evaluate( sampleTextareaPaint, { kind, border: expectedBorder, ring: expectedRing } )'
  );
  expect(source).toContain('runFailure = { failed: true, error };');
  expect(source).toMatch(/finally \{\s+await cleanupTextareaEvidence\(runFailure,/);
  expect(source).toContain('}, primaryPersistence);');
  expect(source).toContain('attempt.hostStartedAtMs = deadline - 240;');
  expect(source).toContain('attempt.hostDeadlineAtMs = deadline;');
  expect(source).toContain('const deadline = Date.now() + 240;');
  expect(source).toContain('const matched = await observeTextareaPaintOnGrid({');
  expect(source).toContain('start: deadline - 240, deadline,');
  expect(source).toContain('wait: (ms) => page.waitForTimeout(ms),');
  expect(source).toContain('matches: (sampled) => matchesTextareaPaint(sampled, expectedRing, wanted),');
  expect(source).toContain('record: (sampled, timing) => {');
  expect(source).toContain('attempt.observed = sampled;');
  expect(source).toContain('if (matched) return matched;');
});

it.each(['write', 'rename'])(
  'skips new phase reads on primary %s failure but retains original readiness/screenshot attempts',
  async (stage) => {
    const { persistTextareaFailure, collectTextareaFailureEvidence } =
      // @ts-expect-error Native capture helpers intentionally use JavaScript.
      await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
    const primary = Object.freeze({ error: 'primary failure', observations: Object.freeze(['original']) });
    const calls: string[] = [];
    const persistence = await persistTextareaFailure(primary, {
      writePending: async (contents: string) => {
        calls.push('write');
        expect(JSON.parse(contents)).toEqual(primary);
        if (stage === 'write') throw new Error('write failed');
      },
      renamePending: async () => { calls.push('rename'); throw new Error('rename failed'); },
    });
    expect(persistence.status).toBe(`${stage}-failed`);
    expect(calls).toEqual(stage === 'write' ? ['write'] : ['write', 'rename']);
    const readPhase = vi.fn();
    const result = await collectTextareaFailureEvidence(primary, {
      readPhase,
      readReadiness: async () => { calls.push('readiness'); return { ready: true }; },
      screenshot: async () => { calls.push('screenshot'); return { path: 'failure.png' }; },
    }, persistence);
    expect(readPhase).not.toHaveBeenCalled();
    expect(calls.slice(-2)).toEqual(['readiness', 'screenshot']);
    expect(result.error).toBe(primary.error);
    expect(result.observations).toBe(primary.observations);
    expect(result.primaryPersistence).toBe(persistence);
    expect(result.postFailureDiagnostics.map((phase: any) => phase.status)).toEqual(['skipped', 'skipped']);
    expect(result.failureScreenshot.path).toBe('failure.png');
  }
);

it.each([new Error('primary object'), 'primary string', null, undefined])(
  'preserves primary thrown value through failing cleanup: %s', async (error) => {
    const { cleanupTextareaEvidence } =
      // @ts-expect-error Native capture helpers intentionally use JavaScript.
      await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
    const calls: string[] = [];
    const recorded: any[] = [];
    let rejected = false, caught: unknown;
    try {
      await cleanupTextareaEvidence({ failed: true, error }, {
        closeBrowser: async () => { calls.push('browser'); throw new Error('browser cleanup'); },
        closeServer: async () => { calls.push('server'); throw new Error('server cleanup'); },
        recordErrors: async (errors: any[]) => { calls.push('record'); recorded.push(...errors); },
      });
    } catch (value) { rejected = true; caught = value; }
    expect(rejected).toBe(true);
    expect(caught).toBe(error);
    expect(calls).toEqual(['browser', 'server', 'record']);
    expect(recorded.map((entry) => entry.stage)).toEqual(['browser-close', 'server-close']);
  }
);

it('does not turn cleanup failure into success, including when its error record fails', async () => {
  const { cleanupTextareaEvidence } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const cleanupError = new Error('browser cleanup');
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(cleanupTextareaEvidence({ failed: false }, {
      closeBrowser: async () => { throw cleanupError; },
      closeServer: async () => {},
      recordErrors: async () => { throw new Error('record failure'); },
    })).rejects.toBe(cleanupError);
    expect(log).toHaveBeenCalled();
    await expect(cleanupTextareaEvidence({ failed: true, error: 'original' }, {
      closeBrowser: async () => { throw cleanupError; },
      closeServer: async () => {},
      recordErrors: async () => { throw new Error('record failure'); },
    })).rejects.toBe('original');
  } finally { log.mockRestore(); }
});

it('binds tracer identity to its installation and requested editor without changing paint', async () => {
  const { installTextareaPaintDiagnostics, sampleTextareaPaint } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const editor = document.createElement('textarea') as any;
  editor.matches = () => false; // Match the existing focused sampler fixture.
  const replacement = document.createElement('textarea');
  const originalCrypto = window.crypto;
  const uuid = vi.fn()
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000002');
  vi.stubGlobal('crypto', { randomUUID: uuid });
  try {
    installTextareaPaintDiagnostics(editor);
    const first = editor.__puiPaintDiagnostics.snapshot(editor);
    expect(first).toMatchObject({
      installationId: '00000000-0000-4000-8000-000000000001',
      requestedEditorMatches: true, identityError: null,
    });
    const sampled = sampleTextareaPaint(editor, { kind: 'react', border: '#000', ring: '#000' });
    expect(sampled.diagnostic).toMatchObject({
      installationId: first.installationId, requestedEditorMatches: true, status: 'recorded',
    });
    expect(sampled.diagnostic.browserSampleFinishedMs)
      .toBeGreaterThanOrEqual(sampled.diagnostic.browserSampleStartedMs);
    // A copied tracer cannot claim that the replacement is its bound editor.
    expect(editor.__puiPaintDiagnostics.snapshot(replacement).requestedEditorMatches).toBe(false);
    editor.__puiPaintDiagnostics.dispose();
    installTextareaPaintDiagnostics(editor);
    const second = editor.__puiPaintDiagnostics.snapshot(editor);
    expect(second.requestedEditorMatches).toBe(true);
    expect(second.installationId).not.toBe(first.installationId);
    editor.__puiPaintDiagnostics.dispose();
    uuid.mockImplementation(() => { throw new Error('identity unavailable'); });
    installTextareaPaintDiagnostics(editor);
    expect(editor.__puiPaintDiagnostics.snapshot(editor)).toMatchObject({
      installationId: null, requestedEditorMatches: true,
      identityError: 'Error: identity unavailable',
    }); // Bound reference alone cannot establish continuity without an ID.
  } finally {
    editor.__puiPaintDiagnostics?.dispose();
    vi.stubGlobal('crypto', originalCrypto);
  }
});

// Exercise the production scheduler and exact predicate, not a parallel model.
async function runGridFixture(options: {
  cost?: number; returns?: number[]; wakes?: number[]; matchAt?: number;
  paint?: Record<string, unknown>; readError?: unknown; initial?: number;
} = {}) {
  const { observeTextareaPaintOnGrid, matchesTextareaPaint } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  let clock = options.initial ?? 0;
  const dispatches: number[] = [], waits: number[] = [], retained: any[] = [];
  const operations: string[] = [];
  const wakes = [...(options.wakes ?? [])];
  const wanted = { focused: true, invalid: false, mode: 'normal', ringVisible: true };
  const exact = {
    border: 'border', expectedBorder: 'border', ringColor: 'ring', expectedRing: 'ring',
    shadow: 'rgb(1, 2, 3) 0px 0px 0px 3px', expectedRingShadow: 'rgb(1, 2, 3) 0px 0px 0px 3px',
    ringWidth: '3px', focused: true, nativeFocus: true, invalid: 'false',
    disabled: false, readOnly: false, opacity: '1',
  };
  const result = await observeTextareaPaintOnGrid({
    start: 0, deadline: 240, now: () => clock,
    wait: async (ms: number) => { operations.push('wait'); waits.push(ms); clock = wakes.shift() ?? clock + ms; },
    read: async () => {
      operations.push('read');
      dispatches.push(clock);
      clock = options.returns?.[dispatches.length - 1] ?? clock + (options.cost ?? 0);
      if ('readError' in options) throw options.readError;
      return { ...exact, shadow: clock >= (options.matchAt ?? Infinity) ? exact.shadow : 'wrong', ...options.paint };
    },
    record: (sample: unknown, timing: unknown) => { operations.push('record'); retained.push({ sample, timing }); },
    matches: (sample: unknown) => matchesTextareaPaint(sample, 'ring', wanted),
  });
  return { result, dispatches, waits, retained, operations };
}

it.each([
  ['immediate match', { cost: 1, matchAt: 1 }, [0], true],
  ['finite zero-cost grid', {}, Array.from({ length: 15 }, (_, k) => 16 * k), false],
  ['round-trip drift removed', { cost: 10, matchAt: 42 }, [0, 16, 32], true],
  ['skip missed slots', { returns: [50], matchAt: 64 }, [0, 64], true],
  ['exact next-slot boundary', { returns: [16], matchAt: 17, cost: 1 }, [0, 16], true],
  ['early wake', { wakes: [14, 16], matchAt: 16 }, [0, 16], true],
  ['repeated early wakes', { wakes: [12, 14, 15, 16], matchAt: 16 }, [0, 16], true],
  ['scheduled late wake', { wakes: [35], returns: [0, 40], matchAt: 48 }, [0, 35, 48], true],
  ['late final wake still eligible', { returns: [220, 239], wakes: [230], matchAt: 239 }, [0, 230], true],
  ['wake at deadline', { wakes: [240] }, [0], false],
  ['wake after deadline', { wakes: [250] }, [0], false],
  ['exact paint returned at deadline', { returns: [220, 240], matchAt: 240 }, [0, 224], false],
  ['exact paint returned late', { returns: [220, 241], matchAt: 241 }, [0, 224], false],
  ['wrong paint returned at deadline', { returns: [220, 240] }, [0, 224], false],
  ['wrong paint returned late', { returns: [220, 241] }, [0, 224], false],
  ['early dispatch late return', { returns: [250], matchAt: 250 }, [0], false],
  ['tail remains unobserved', { returns: [220, 225], matchAt: 230 }, [0, 224], false],
  ['completion after deadline', { matchAt: 241 }, Array.from({ length: 15 }, (_, k) => 16 * k), false],
  ['initial dispatch already expired', { initial: 240, matchAt: 0 }, [], false],
] as const)('absolute observation grid: %s', async (_name, options, expectedDispatches, accepted) => {
  const result = await runGridFixture(options as Parameters<typeof runGridFixture>[0]);
  expect(result.dispatches).toEqual(expectedDispatches);
  expect(Boolean(result.result)).toBe(accepted);
  expect(result.dispatches.length).toBeLessThanOrEqual(15);
  const ordinals = result.retained.map((entry) => entry.timing.slotOrdinal);
  expect(ordinals.every((ordinal, index) => index === 0 || ordinal > ordinals[index - 1])).toBe(true);
  expect(result.retained.every((entry) => entry.timing.hostDispatchAtMs >= entry.timing.scheduledAtMs)).toBe(true);
  if (result.retained.at(-1)?.timing.hostReturnedAtMs >= 240) {
    expect(result.result).toBeNull();
    expect(result.operations.at(-1)).toBe('record');
    expect(result.retained.at(-1).timing.hostReturnedAtMs).toBeGreaterThanOrEqual(240);
  }
  if (_name === 'repeated early wakes') expect(result.waits).toEqual([16, 4, 2, 1]);
  if (_name === 'tail remains unobserved') expect(result.waits).toEqual([4]);
});

it.each([
  { shadow: 'rgb(4, 5, 6) 0px 0px 0px 3px' },
  { shadow: 'rgba(1, 2, 3, 0.3) 0px 0px 0px 3px' },
  { shadow: 'rgb(1, 2, 3) 0px 0px 0px 2px' },
  { shadow: 'rgb(1, 2, 3) 0px 0px 0px 3px inset' },
  { border: 'wrong' }, { ringColor: 'wrong' }, { ringWidth: '2px' },
  { focused: false }, { nativeFocus: false }, { invalid: 'true' },
  { disabled: true }, { readOnly: true },
])('never schedules strict wrong paint/state into acceptance: %j', async (paint) => {
  const result = await runGridFixture({ matchAt: 0, paint });
  expect(result.result).toBeNull();
  expect(result.dispatches).toHaveLength(15);
});

it('retains disabled opacity and hidden-ring predicates in the real acceptance helper', async () => {
  const { matchesTextareaPaint } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const sample = {
    border: 'border', expectedBorder: 'border', focused: false, nativeFocus: false,
    invalid: 'false', disabled: true, readOnly: false, ringWidth: '0px', opacity: '0.5',
  };
  const wanted = { focused: false, invalid: false, mode: 'disabled', ringVisible: false };
  expect(matchesTextareaPaint(sample, '', wanted)).toBe(true);
  expect(matchesTextareaPaint({ ...sample, opacity: '1' }, '', wanted)).toBe(false);
  expect(matchesTextareaPaint({ ...sample, ringWidth: '3px' }, '', wanted)).toBe(false);
});

it.each([1, 250])('propagates evaluation rejection at %sms without retry', async (returnedAt) => {
  const { observeTextareaPaintOnGrid } =
    // @ts-expect-error Native capture helpers intentionally use JavaScript.
    await import('../../../../scripts/prototypes/shadcn-textarea-shadow-oracle.mjs');
  const error = new Error('original evaluation failed');
  let clock = 0;
  const read = vi.fn(async () => { clock = returnedAt; throw error; });
  const wait = vi.fn(), record = vi.fn(), matches = vi.fn();
  await expect(observeTextareaPaintOnGrid({
    start: 0, deadline: 240, now: () => clock, read, wait, record, matches,
  })).rejects.toBe(error);
  expect(read).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
  expect(record).not.toHaveBeenCalled();
  expect(matches).not.toHaveBeenCalled();
});
