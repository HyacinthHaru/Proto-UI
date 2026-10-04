// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Page } from 'playwright-core';
import { describe, expect, it, vi } from 'vitest';
import { shouldProfileSearch, startSearchCpuProfile } from './site-search-cpu-profile';

describe('bounded Search CPU diagnostic', () => {
  it('is off by default and accepts only the explicit first-case switch', async () => {
    expect(shouldProfileSearch(undefined, 'shadcn-dark-390')).toBe(false);
    expect(shouldProfileSearch('true', 'shadcn-dark-390')).toBe(false);
    expect(shouldProfileSearch('1', 'shadcn-light-1440')).toBe(false);
    expect(shouldProfileSearch('1', 'brutalist-light-390')).toBe(false);
    expect(shouldProfileSearch('1', 'shadcn-dark-390')).toBe(true);
    const page = { context: vi.fn() } as unknown as Page;
    expect(
      await startSearchCpuProfile({
        page,
        id: 'other',
        enabled: '1',
        directory: '',
        source: { sha: 'test', dirty: false },
      })
    ).toBeUndefined();
    expect(page.context).not.toHaveBeenCalled();
  });

  it('writes one source-bound profile and overhead warning, and stops once', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'search-cpu-'));
    const profile = { nodes: [], samples: [], timeDeltas: [], startTime: 10, endTime: 20 };
    const send = vi.fn(async (method: string) =>
      method === 'Profiler.stop'
        ? { profile }
        : method === 'Performance.getMetrics'
          ? { metrics: [{ name: 'Timestamp', value: 1 }] }
          : {}
    );
    const detach = vi.fn(async () => {});
    const page = {
      context: () => ({ newCDPSession: async () => ({ send, detach }) }),
      evaluate: async () => ({ timeOrigin: 100, now: 30 }),
      url: () => 'http://127.0.0.1/public/',
      viewportSize: () => ({ width: 390, height: 960 }),
    } as unknown as Page;
    try {
      const handle = await startSearchCpuProfile({
        page,
        id: 'shadcn-dark-390',
        enabled: '1',
        directory,
        source: { sha: 'abc', dirty: false },
      });
      await Promise.all([handle!.stop('original assertion failed'), handle!.stop('cleanup')]);
      expect(send.mock.calls.filter(([name]) => name === 'Profiler.stop')).toHaveLength(1);
      expect(detach).toHaveBeenCalledOnce();
      expect(
        JSON.parse(
          await readFile(path.join(directory, 'shadcn-dark-390-startup.cpuprofile'), 'utf8')
        )
      ).toEqual(profile);
      const metadata = JSON.parse(
        await readFile(path.join(directory, 'shadcn-dark-390-startup-profile.json'), 'utf8')
      );
      expect(metadata.source).toEqual({ sha: 'abc', dirty: false });
      expect(metadata.reason).toBe('original assertion failed');
      expect(metadata.caveat).toContain('unquantified overhead');
      expect(metadata.condition).toContain('unchanged 1000ms');
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
