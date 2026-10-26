// Both values must be serialized by getComputedStyle(...).boxShadow.
// The independent expected probe uses the requested theme color and 3px spread,
// never a color or geometry read from the actual control.
export function containsExpectedRingShadow(actualShadow, expectedRingShadow) {
  if (
    typeof actualShadow !== 'string' ||
    typeof expectedRingShadow !== 'string' ||
    !expectedRingShadow ||
    expectedRingShadow === 'none'
  )
    return false;
  const layers = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < actualShadow.length; i++) {
    const ch = actualShadow[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      if (--depth < 0) return false;
    } else if (ch === ',' && depth === 0) {
      layers.push(actualShadow.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) return false;
  layers.push(actualShadow.slice(start).trim());
  return layers.some((layer) => layer === expectedRingShadow);
}

// Self-contained: Playwright evaluates this function in the editor's browser realm.
// Diagnostic reads only; never finish, cancel, pause or otherwise change animations.
export function installTextareaPaintDiagnostics(editor) {
  const now = () => editor.ownerDocument.defaultView.performance.now();
  const relevant = (property) =>
    property === 'box-shadow' || /^border(?:-(?:top|right|bottom|left))?-color$/.test(property);
  const eventLimit = 64;
  const animationLimit = 8;
  const events = [];
  let eventCount = 0;
  const listener = (event) => {
    if (event.target !== editor || event.pseudoElement || !relevant(event.propertyName)) return;
    events.push({
      sequence: ++eventCount,
      browserTimeMs: now(),
      type: event.type,
      property: event.propertyName,
      elapsedTimeSeconds: event.elapsedTime,
    });
    if (events.length > eventLimit) events.shift();
  };
  const types = ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel'];
  types.forEach((type) => editor.addEventListener(type, listener));
  editor.__puiPaintDiagnostics = {
    snapshot() {
      const browserTimeMs = now();
      const animations = [];
      let relevantAnimationCount = 0;
      let animationReadError = null;
      // Undefined means unsupported, not proof that no transition is running.
      const animationApiAvailable = typeof editor.getAnimations === 'function';
      try {
        if (animationApiAvailable) {
          for (const animation of editor.getAnimations()) {
            if (!relevant(animation.transitionProperty)) continue;
            relevantAnimationCount++;
            if (animations.length >= animationLimit) continue;
            const timing = animation.effect?.getComputedTiming();
            const scalar = (value) =>
              value == null || typeof value === 'number' ? value ?? null : String(value);
            animations.push({
              property: animation.transitionProperty,
              playState: animation.playState,
              pending: animation.pending,
              currentTimeMs: scalar(animation.currentTime),
              startTimeMs: scalar(animation.startTime),
              playbackRate: animation.playbackRate,
              timing: timing ? {
                localTime: scalar(timing.localTime),
                progress: timing.progress,
                currentIteration: timing.currentIteration,
                delay: timing.delay,
                duration: scalar(timing.duration),
                activeDuration: scalar(timing.activeDuration),
                endTime: scalar(timing.endTime),
                fill: timing.fill,
              } : null,
            });
          }
        }
      } catch (error) {
        animationReadError = String(error);
      }
      return {
        browserTimeMs,
        animationApiAvailable,
        animationReadError,
        animations,
        relevantAnimationCount,
        omittedAnimations: Math.max(0, relevantAnimationCount - animationLimit),
        events: events.map((event) => ({ ...event })),
        eventCount,
        omittedEvents: Math.max(0, eventCount - eventLimit),
        limits: { eventLimit, animationLimit },
      };
    },
    dispose() {
      types.forEach((type) => editor.removeEventListener(type, listener));
      delete editor.__puiPaintDiagnostics;
    },
  };
}

// Keep the first 31 samples and the latest sample if a polling burst exceeds 32.
// Counters disclose omitted middle samples; the acceptance predicate never reads this trace.
export function appendTextareaPaintSample(attempt, sample) {
  attempt.sampleCount = (attempt.sampleCount ?? 0) + 1;
  attempt.samples ??= [];
  if (attempt.samples.length < 32) attempt.samples.push(sample);
  else attempt.samples[31] = sample;
  attempt.omittedSamples = Math.max(0, attempt.sampleCount - 32);
}

// Self-contained browser callback: no imported or module-closure references.
export function sampleTextareaPaint(e, expected) {
  const browserSampleStartedMs = performance.now();
  const c = getComputedStyle(e),
    actual = document.createElement('div'),
    oracle = document.createElement('div');
  actual.style.color = c.getPropertyValue('--pui-ring-color');
  oracle.style.color = expected.ring || 'transparent';
  oracle.style.borderColor = expected.border;
  oracle.style.boxShadow = `0 0 0 3px ${expected.ring || 'transparent'}`;
  document.body.append(actual, oracle);
  const result = {
    kind: expected.kind,
    focused: document.activeElement === e,
    nativeFocus: e.matches(':focus-visible'),
    invalid: e.getAttribute('aria-invalid'),
    disabled: e.disabled,
    readOnly: e.readOnly,
    border: c.borderColor,
    expectedBorder: getComputedStyle(oracle).borderColor,
    ringColor: getComputedStyle(actual).color,
    expectedRing: getComputedStyle(oracle).color,
    expectedRingShadow: getComputedStyle(oracle).boxShadow,
    ringWidth: c.getPropertyValue('--pui-ring-width').trim(),
    shadow: c.boxShadow,
    opacity: c.opacity,
  };
  // Capture original actual/expected values first. Diagnostics may be absent on a
  // replaced editor or throw; neither condition may erase the original paint.
  result.diagnostic = { browserSampleStartedMs, status: 'missing', error: null };
  try {
    const tracer = e.__puiPaintDiagnostics;
    if (tracer && typeof tracer.snapshot === 'function') {
      result.diagnostic = {
        ...tracer.snapshot(),
        browserSampleStartedMs,
        status: 'recorded',
        error: null,
        tokens: e.getAttribute('data-pui-style'),
        ringColorVariable: c.getPropertyValue('--pui-ring-color'),
        ringShadowVariable: c.getPropertyValue('--pui-ring-shadow'),
        transitionProperty: c.transitionProperty,
        transitionDuration: c.transitionDuration,
        transitionDelay: c.transitionDelay,
      };
    }
  } catch (error) {
    result.diagnostic = {
      browserSampleStartedMs, status: 'read-failed', error: String(error),
    };
  }
  actual.remove();
  oracle.remove();
  return result;
}

// Self-contained, read-only browser callback. Unlike sampleTextareaPaint, this
// creates no probe nodes and reads no new expected values after the verdict.
export function readTextareaPostFailurePhase(kind) {
  const browserStartedMs = performance.now();
  const record = window.textareaEvidence?.records.find((entry) => entry.kind === kind);
  const editor = record?.editor();
  if (!editor) return {
    status: 'missing', reason: 'failed-attempt editor unavailable',
    browserStartedMs, browserFinishedMs: performance.now(),
  };
  const c = getComputedStyle(editor);
  const paint = {
    kind, connected: editor.isConnected,
    focused: document.activeElement === editor,
    nativeFocus: editor.matches(':focus-visible'),
    invalid: editor.getAttribute('aria-invalid'),
    disabled: editor.disabled, readOnly: editor.readOnly,
    border: c.borderColor, shadow: c.boxShadow, opacity: c.opacity,
    ringWidth: c.getPropertyValue('--pui-ring-width').trim(),
    ringColorVariable: c.getPropertyValue('--pui-ring-color'),
    tokens: editor.getAttribute('data-pui-style'),
  };
  let diagnostic = { status: 'missing', error: null };
  try {
    const tracer = editor.__puiPaintDiagnostics;
    if (tracer && typeof tracer.snapshot === 'function') {
      diagnostic = { ...tracer.snapshot(), status: 'recorded', error: null };
    }
  } catch (error) {
    diagnostic = { status: 'read-failed', error: String(error) };
  }
  return {
    status: 'recorded', browserStartedMs, browserFinishedMs: performance.now(),
    identity: 'reacquired fixture editor; identity with failed sample is not established',
    paint, diagnostic,
  };
}

// Post-verdict collection only. No retries/waits, comparison or acceptance return.
// Each optional operation is isolated so it cannot suppress the next operation.
export async function collectTextareaFailureEvidence(primary, operations, primaryPersistence) {
  const postFailureDiagnostics = [];
  const phase = async (name) => {
    const hostStartedAtMs = Date.now();
    let result;
    if (primaryPersistence?.status !== 'persisted') {
      result = { status: 'skipped', reason: 'primary receipt not persisted' };
    } else {
      try {
        result = { status: 'recorded', value: await operations.readPhase() };
      } catch (error) {
        result = { status: 'read-failed', error: String(error) };
      }
    }
    postFailureDiagnostics.push({
      phase: name, hostStartedAtMs, hostFinishedAtMs: Date.now(), ...result,
      acceptance: 'not evaluated; original failure retained',
    });
  };
  await phase('catch-entry-before-screenshot');
  let readiness;
  try {
    readiness = await operations.readReadiness();
  } catch (error) {
    readiness = { error: String(error) };
  }
  let failureScreenshot;
  try {
    failureScreenshot = await operations.screenshot();
  } catch (error) {
    failureScreenshot = { error: String(error) };
  }
  await phase('after-screenshot-attempt');
  return { ...primary, primaryPersistence, readiness, failureScreenshot, postFailureDiagnostics };
}

export async function persistTextareaFailure(value, operations) {
  try {
    await operations.writePending(JSON.stringify(value, null, 2));
  } catch (error) {
    return { status: 'write-failed', error: String(error) };
  }
  try {
    await operations.renamePending();
  } catch (error) {
    return { status: 'rename-failed', error: String(error) };
  }
  return { status: 'persisted' };
}

// Always attempt both existing cleanup operations. Preserve any primary thrown
// value, including undefined/null; a successful run must still fail on cleanup.
export async function cleanupTextareaEvidence(primary, operations) {
  const failures = [];
  for (const [stage, operation] of [
    ['browser-close', operations.closeBrowser], ['server-close', operations.closeServer],
  ]) {
    try { await operation(); }
    catch (error) { failures.push({ stage, error }); }
  }
  if (failures.length) {
    try {
      await operations.recordErrors(failures.map(({ stage, error }) => ({ stage, error: String(error) })));
    } catch (error) {
      failures.push({ stage: 'cleanup-error-record', error });
      console.error('Could not record Textarea cleanup errors:', error);
    }
  }
  if (primary.failed) throw primary.error;
  if (failures.length) throw failures[0].error;
}
