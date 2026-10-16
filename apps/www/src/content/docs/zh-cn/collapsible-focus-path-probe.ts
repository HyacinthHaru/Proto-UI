import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Browser, BrowserContext, CDPSession, Locator, Page } from 'playwright-core';

export const TRACE_MAX_BYTES = 8 * 1024 * 1024;
export const PROBE_BUDGET_MS = 75_000;
// A global CDP trace with uncertain cleanup must never overlap a later probe.
// Only a fresh browser process (a new diagnostic invocation) clears this gate.
const quarantinedBrowsers = new WeakSet<Browser>();

// devtools.timeline can include resource events too. Export only timing events,
// never request URLs, headers, bodies, screenshots, script text, or arbitrary args.
export function sanitizeTimingTrace(raw: Buffer): Buffer {
  const parsed = JSON.parse(raw.toString('utf8')) as { traceEvents?: unknown[] };
  if (!Array.isArray(parsed.traceEvents)) throw new Error('Trace has no event array');
  const allowed = new Set([
    'RunTask',
    'ThreadControllerImpl::RunTask',
    'FunctionCall',
    'EvaluateScript',
    'UpdateLayoutTree',
    'RecalculateStyles',
    'Layout',
    'PrePaint',
    'Paint',
    'CompositeLayers',
    'UpdateLayerTree',
    'FireAnimationFrame',
    'RequestAnimationFrame',
    'TimerFire',
    'EventDispatch',
    'clock_sync',
  ]);
  const traceEvents = parsed.traceEvents.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const event = value as Record<string, unknown>;
    if (typeof event.name !== 'string' || !allowed.has(event.name)) return [];
    const safe: Record<string, unknown> = { name: event.name };
    for (const field of ['pid', 'tid', 'ts', 'dur', 'tts', 'tdur'])
      if (typeof event[field] === 'number' && Number.isFinite(event[field]))
        safe[field] = event[field];
    if (typeof event.ph === 'string' && /^[BEXiICcbensf]$/.test(event.ph)) safe.ph = event.ph;
    // Normalize categories rather than retaining unexpected strings from the page.
    safe.cat = 'devtools.timeline';
    const syncId = (event.args as { sync_id?: unknown } | undefined)?.sync_id;
    if (
      event.name === 'clock_sync' &&
      typeof syncId === 'string' &&
      /^focus-path-(wc|react|vue|vue2)-(AB|BA)-[ABC]$/.test(syncId)
    )
      safe.args = { sync_id: syncId };
    return [safe];
  });
  const output = Buffer.from(JSON.stringify({ traceEvents, displayTimeUnit: 'ms' }));
  if (output.length > TRACE_MAX_BYTES) throw new Error('Sanitized trace exceeds output size bound');
  return output;
}

// Serialized in the page: no layout reads, focus requests, or DOM writes.
export function readUniqueFocus(target: Element | Element[]) {
  const elements = Array.isArray(target) ? target : [target];
  if (elements.length !== 1) throw new Error(`Expected one Trigger, found ${elements.length}`);
  const element = elements[0]!;
  const pointerTarget = (
    element.closest('[data-previewer-id]') as
      | (HTMLElement & { __puiCollapsibleLastPointerTarget?: Element | null })
      | null
  )?.__puiCollapsibleLastPointerTarget;
  return {
    browserNow: performance.now(),
    browserTimeOrigin: performance.timeOrigin,
    connected: element.isConnected,
    focused: document.activeElement === element,
    expectedIsPointerTarget: pointerTarget ? pointerTarget === element : null,
    activeIsPointerTarget: pointerTarget ? document.activeElement === pointerTarget : null,
  };
}

export async function readBoundedTrace(
  read: () => Promise<{ data: string; base64Encoded?: boolean; eof?: boolean }>,
  maxBytes = TRACE_MAX_BYTES
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  // Bound even empty or malformed streams, in addition to the caller's deadline.
  for (let index = 0; index < 129; index += 1) {
    const chunk = await read();
    const buffer = Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8');
    bytes += buffer.length;
    if (bytes > maxBytes)
      throw new Error(`Trace exceeds ${maxBytes} bytes; no partial trace saved`);
    chunks.push(buffer);
    if (chunk.eof) return Buffer.concat(chunks);
  }
  throw new Error('Trace exceeds 129 reads; no partial trace saved');
}

async function bounded<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Diagnostic budget ${milliseconds}ms exceeded`)),
          milliseconds
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function probeCollapsibleFocusPaths(options: {
  browser: Browser;
  url: string;
  directory: string;
  sourceSha: string;
  runtime: string;
  order: 'AB' | 'BA';
  prepare(page: Page): Promise<Locator>;
  verifyExpanded(page: Page, button: Locator): Promise<void>;
}): Promise<void> {
  const url = new URL(options.url);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    throw new Error('Diagnostic only permits the loopback test server');
  if (quarantinedBrowsers.has(options.browser))
    throw new Error(
      'Diagnostic browser quarantined after uncertain CDP cleanup; remaining probes are unexecuted'
    );
  const name = `focus-path-${options.runtime}-${options.order}`;
  const records: unknown[] = [];
  const errors: string[] = [];
  let context: BrowserContext | undefined;
  let session: CDPSession | undefined;
  let tracing = false;
  let cancelled = false;
  let traceSaved = false;
  let traceStart: Promise<unknown> | undefined;
  let traceStopped = false;
  let sessionAcquiring = false;
  let startPending = false;
  let releaseSessionPromise: Promise<void> | undefined;
  const releaseSession = (cdp: CDPSession): Promise<void> => {
    // Do not detach while Tracing.start is pending: it may acquire a global
    // trace after the foreground deadline. Its settlement owns final cleanup.
    releaseSessionPromise ??= (async () => {
      if (traceStart) await traceStart.catch(() => {});
      if (tracing && !traceStopped) {
        traceStopped = true;
        await bounded(cdp.send('Tracing.end'), 1_000).catch((error) => {
          quarantinedBrowsers.add(options.browser);
          errors.push(`Trace cleanup incomplete: ${String(error)}`);
        });
      }
      await bounded(cdp.detach(), 1_000).catch((error) => {
        quarantinedBrowsers.add(options.browser);
        errors.push(`CDP detach incomplete: ${String(error)}`);
      });
    })();
    return releaseSessionPromise;
  };
  const startedAt = performance.now();
  const stage = async <T>(label: string, operation: () => Promise<T>): Promise<T> => {
    if (cancelled) throw new Error('Diagnostic already ended');
    const start = performance.now();
    const record: Record<string, unknown> = { label, startMs: start - startedAt };
    records.push(record);
    try {
      const result = await operation();
      if (cancelled) throw new Error('Diagnostic ended while operation was pending');
      record.result = result;
      return result;
    } catch (error) {
      record.error = String(error);
      throw error;
    } finally {
      record.endMs = performance.now() - startedAt;
    }
  };
  try {
    await bounded(
      (async () => {
        const acquiredContext = await options.browser.newContext({
          viewport: { width: 1280, height: 900 },
        });
        context = acquiredContext;
        if (cancelled) {
          await bounded(acquiredContext.close(), 5_000).catch(() => {});
          throw new Error('Context arrived after diagnostic deadline; closed');
        }
        await acquiredContext.route('**/*', (route) =>
          new URL(route.request().url()).origin === url.origin ? route.continue() : route.abort()
        );
        await acquiredContext.routeWebSocket('**/*', (socket) => {
          const target = new URL(socket.url());
          target.protocol = target.protocol === 'wss:' ? 'https:' : 'http:';
          if (target.origin === url.origin) socket.connectToServer();
          else socket.close();
        });
        const page = await acquiredContext.newPage();
        if (cancelled) throw new Error('Page arrived after diagnostic deadline');
        page.setDefaultTimeout(10_000);
        // Preparation has its own budget; it is outside measured A/B/C work.
        const button = await bounded(
          (async () => {
            await stage('navigation', () =>
              page.goto(url.href, { waitUntil: 'networkidle' }).then(() => undefined)
            );
            return options.prepare(page);
          })(),
          45_000
        );
        if (cancelled) throw new Error('Preparation completed after diagnostic deadline');
        sessionAcquiring = true;
        const acquiredSession = await options.browser.newBrowserCDPSession().finally(() => {
          sessionAcquiring = false;
        });
        session = acquiredSession;
        if (cancelled) {
          await releaseSession(acquiredSession);
          throw new Error('CDP session arrived after diagnostic deadline; detached');
        }
        startPending = true;
        traceStart = acquiredSession
          .send('Tracing.start', {
            transferMode: 'ReturnAsStream',
            traceConfig: {
              recordMode: 'recordContinuously',
              traceBufferSizeInKb: 2048,
              enableSampling: false,
              enableSystrace: false,
              enableArgumentFilter: true,
              includedCategories: ['devtools.timeline', 'blink.user_timing'],
            },
          })
          .then(() => {
            tracing = true;
          })
          .finally(() => {
            startPending = false;
          });
        await traceStart;
        if (cancelled) {
          await releaseSession(acquiredSession);
          throw new Error('Tracing started after diagnostic deadline; ended and detached');
        }
        await stage('pointer-click', () => button.click());
        await stage('expanded-content-controls', () => options.verifyExpanded(page, button));
        for (const method of options.order) {
          await session.send('Tracing.recordClockSyncMarker', { syncId: `${name}-${method}` });
          await stage(method === 'A' ? 'locator.evaluate' : 'locator.evaluateAll', () =>
            method === 'A' ? button.evaluate(readUniqueFocus) : button.evaluateAll(readUniqueFocus)
          );
        }
        await session.send('Tracing.recordClockSyncMarker', { syncId: `${name}-C` });
        // C deliberately separates lookup/visibility/adoption from handle evaluation.
        let handle: Awaited<ReturnType<Locator['elementHandle']>>;
        await stage('elementHandle.acquire', async () => {
          handle = await button.elementHandle();
          if (!handle) throw new Error('Trigger handle missing');
        });
        try {
          await stage('elementHandle.evaluate', () => handle!.evaluate(readUniqueFocus));
        } finally {
          await handle!.dispose();
        }
      })(),
      PROBE_BUDGET_MS
    );
  } catch (error) {
    cancelled = true;
    if (sessionAcquiring || startPending) quarantinedBrowsers.add(options.browser);
    errors.push(String(error));
  } finally {
    cancelled = true;
    // Closing the page aborts pending locator work; no retry after a deadline.
    if (context)
      await bounded(context.close(), 5_000).catch((error) => {
        quarantinedBrowsers.add(options.browser);
        errors.push(String(error));
      });
    if (session && tracing && !traceStopped) {
      const cdp = session;
      let stream: string | undefined;
      let reading = true;
      try {
        const safeTrace = await bounded(
          (async () => {
            const complete = new Promise<{ stream?: string; dataLossOccurred: boolean }>(
              (resolve) => cdp.once('Tracing.tracingComplete', resolve)
            );
            traceStopped = true;
            await cdp.send('Tracing.end');
            const result = await complete;
            if (!reading) return;
            stream = result.stream;
            if (result.dataLossOccurred) errors.push('Trace rolling buffer reports data loss');
            if (!stream) throw new Error('Trace stream missing');
            const trace = await readBoundedTrace(() => {
              if (!reading) throw new Error('Trace read deadline expired');
              return cdp.send('IO.read', { handle: stream!, size: 65_536 });
            });
            if (!reading) return;
            return sanitizeTimingTrace(trace);
          })(),
          10_000
        );
        // No file writes live inside the raced operation: a late read cannot
        // create or overwrite an artifact after its timeout was recorded.
        if (safeTrace) {
          await mkdir(options.directory, { recursive: true });
          await writeFile(path.join(options.directory, `${name}.trace.json`), safeTrace);
          traceSaved = true;
        }
      } catch (error) {
        quarantinedBrowsers.add(options.browser);
        errors.push(String(error));
      } finally {
        reading = false;
        if (stream) await bounded(cdp.send('IO.close', { handle: stream }), 1_000).catch(() => {});
      }
    }
    if (session)
      await bounded(releaseSession(session), 2_000).catch(() => {
        quarantinedBrowsers.add(options.browser);
        errors.push(
          'CDP release is waiting for an outstanding command; its late settlement owns end/detach cleanup'
        );
      });
    await mkdir(options.directory, { recursive: true });
    await writeFile(
      path.join(options.directory, `${name}.json`),
      JSON.stringify(
        {
          sourceSha: options.sourceSha,
          runtime: options.runtime,
          order: options.order,
          nodeTimeOrigin: performance.timeOrigin,
          nodeStartedAt: startedAt,
          scope:
            'Independent post-failure diagnostic; not evidence of the original 1000ms deadline or acceptance. Each order uses a fresh context; within-order reads and tracing may warm layout.',
          probeBudgetMs: PROBE_BUDGET_MS,
          preparationBudgetMs: 45_000,
          traceMaxBytes: TRACE_MAX_BYTES,
          traceScope:
            'Whitelisted task/script/layout/paint timings and own clock markers only; all other events and arguments discarded before writing.',
          traceSaved,
          browserQuarantined: quarantinedBrowsers.has(options.browser),
          records,
          errors,
        },
        null,
        2
      ) + '\n'
    );
  }
  if (errors.length) throw new Error(`Independent diagnostic incomplete: ${errors.join('; ')}`);
}
