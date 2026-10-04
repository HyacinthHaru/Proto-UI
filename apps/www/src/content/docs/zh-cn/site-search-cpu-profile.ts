import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright-core';

export const SEARCH_PROFILE_CASE = 'shadcn-dark-390';
export function shouldProfileSearch(enabled: string | undefined, id: string): boolean {
  return enabled === '1' && id === SEARCH_PROFILE_CASE;
}

export type SearchCpuProfile = { stop(reason: string): Promise<void> };

/** Opt-in diagnostic only. CDP sampling adds overhead: this run cannot prove
 * ordinary startup performance, and never changes the readiness assertion. */
export async function startSearchCpuProfile(options: {
  page: Page;
  enabled: string | undefined;
  id: string;
  directory: string;
  source: { sha: string; dirty: boolean };
}): Promise<SearchCpuProfile | undefined> {
  if (!shouldProfileSearch(options.enabled, options.id)) return;
  const session = await options.page.context().newCDPSession(options.page);
  try {
    await session.send('Performance.enable');
    await session.send('Profiler.enable');
    await session.send('Profiler.setSamplingInterval', { interval: 1000 });
    await session.send('Profiler.start');
  } catch (error) {
    await session.detach().catch(() => {});
    throw error;
  }
  const startedAt = new Date().toISOString();
  let stopped: Promise<void> | undefined;
  return {
    stop(reason) {
      stopped ??= (async () => {
        try {
          const { profile } = await session.send('Profiler.stop');
          const { metrics } = await session.send('Performance.getMetrics');
          const timing = await options.page.evaluate(() => ({
            timeOrigin: performance.timeOrigin,
            now: performance.now(),
            startup: (window as any).__puiSearchStartup?.snapshot() ?? null,
          }));
          await mkdir(options.directory, { recursive: true });
          await writeFile(
            path.join(options.directory, `${options.id}-startup.cpuprofile`),
            JSON.stringify(profile)
          );
          await writeFile(
            path.join(options.directory, `${options.id}-startup-profile.json`),
            JSON.stringify(
              {
                schemaVersion: 1,
                source: options.source,
                case: options.id,
                condition:
                  'Fresh public documentation page; Shadcn/dark/390; unchanged 1000ms readiness budget',
                startedAt,
                stoppedAt: new Date().toISOString(),
                reason,
                samplingIntervalMicroseconds: 1000,
                caveat:
                  'Diagnostic sampling and trace observation add unquantified overhead. Do not treat this run as ordinary performance-pass evidence. Failure capture may extend sampling past the original readiness deadline. The manual job runs this case alone, so preceding-case/server warmup differs from the original full shard.',
                url: options.page.url(),
                viewport: options.page.viewportSize(),
                timing,
                metrics,
              },
              null,
              2
            )
          );
        } finally {
          await session.detach().catch(() => {});
        }
      })();
      return stopped;
    },
  };
}
