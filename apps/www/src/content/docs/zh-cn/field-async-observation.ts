import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Browser, CDPSession, Page } from 'playwright-core';

type Attempt = {
  attempt: number;
  startedAt: number;
  state: 'pending' | 'resolved' | 'rejected';
  settledAt?: number;
  value?: string | null;
  error?: string;
};

/** Optional Chromium trace and Node-side observations of the original getter. */
export function createFieldAsyncObservation(browser: Browser, page: Page, name: string) {
  const directory = process.env.PROTO_UI_FIELD_ASYNC_TRACE_DIR;
  if (!directory) return;
  const attempts: Attempt[] = [];
  const clockMarkers: unknown[] = [];
  const diagnosticErrors: string[] = [];
  const nodeTimeOrigin = performance.timeOrigin;
  const categories = [
    '-*',
    'devtools.timeline',
    'disabled-by-default-devtools.timeline.stack',
    'blink.user_timing',
  ];
  let client: CDPSession | undefined;
  let tracing = false;
  let failure: unknown;
  const snapshot = () => ({
    nodeTimeOrigin,
    observedAt: performance.now(),
    attempts: attempts.map((entry) => ({ ...entry })),
  });
  const clockMarker = async (stage: string) => {
    if (!client) return;
    const syncId = `field-async-${name}-${stage}`;
    const before = performance.now();
    try {
      await client.send('Tracing.recordClockSyncMarker', { syncId });
      clockMarkers.push({ syncId, nodeBefore: before, nodeAfter: performance.now() });
    } catch (error) {
      diagnosticErrors.push(`clock ${stage}: ${String(error)}`);
    }
  };
  return {
    async start() {
      try {
        await mkdir(directory, { recursive: true });
        await browser.startTracing(page, { screenshots: false, categories });
        tracing = true;
        client = await page.context().newCDPSession(page);
        await clockMarker('start');
      } catch (error) {
        diagnosticErrors.push(`start: ${String(error)}`);
      }
    },
    observe(getter: () => Promise<string | null>): Promise<string | null> {
      const entry: Attempt = {
        attempt: attempts.length + 1,
        startedAt: performance.now(),
        state: 'pending',
      };
      attempts.push(entry);
      try {
        const pending = getter();
        // Return the original promise. The side branch only records settlement.
        void pending.then(
          (value) => {
            entry.value = value;
            entry.state = 'resolved';
            entry.settledAt = performance.now();
          },
          (error) => {
            entry.error = String(error);
            entry.state = 'rejected';
            entry.settledAt = performance.now();
          }
        );
        return pending;
      } catch (error) {
        entry.error = String(error);
        entry.state = 'rejected';
        entry.settledAt = performance.now();
        throw error;
      }
    },
    markFailure(error: unknown) {
      failure = { error: String(error), ...snapshot() };
    },
    async finish() {
      const endBeforeTraceStop = snapshot();
      try {
        if (tracing) {
          await clockMarker('end');
          const trace = await browser.stopTracing();
          tracing = false;
          await writeFile(path.join(directory, name + '.trace.json'), trace);
        }
      } catch (error) {
        diagnosticErrors.push(`stop: ${String(error)}`);
      } finally {
        await client?.detach().catch((error) => {
          diagnosticErrors.push(`detach: ${String(error)}`);
        });
      }
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, name + '.node.json'),
        JSON.stringify(
          {
            name,
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            chrome: browser.version(),
            categories,
            clockMarkers,
            failure,
            endBeforeTraceStop,
            endAfterTraceStop: snapshot(),
            diagnosticErrors,
          },
          null,
          2
        ) + '\n'
      );
    },
  };
}
