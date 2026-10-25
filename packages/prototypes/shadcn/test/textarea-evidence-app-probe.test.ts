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
