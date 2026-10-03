import type { Locator } from 'playwright-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeSelectTrigger, startServer } from './browser-harness';

/** Resolve the real selector against DOM fixtures without launching a browser. */
function locatorFor(root: HTMLElement): Locator {
  return {
    locator(selector: string) {
      return { first: () => root.querySelector(selector) };
    },
  } as unknown as Locator;
}

describe('documentation runtime control locator', () => {
  it.each(['shadcn', 'brutalist'])(
    'uses the actual %s runtime Select through its shared accessible role',
    (family) => {
      const previewer = document.createElement('div');
      previewer.innerHTML = `
        <wc-${family}-select-root data-language-select-root>
          <wc-${family}-select-trigger role="combobox" data-control="language"></wc-${family}-select-trigger>
        </wc-${family}-select-root>
        <wc-${family}-select-root data-adapter-select-root>
          <wc-${family}-select-trigger role="combobox" data-control="runtime"></wc-${family}-select-trigger>
        </wc-${family}-select-root>`;
      const trigger = runtimeSelectTrigger(locatorFor(previewer)) as unknown as HTMLElement;
      expect(trigger?.dataset.control).toBe('runtime');
      expect(trigger?.localName).toBe(`wc-${family}-select-trigger`);
    }
  );

  it('keeps fixed-family runtime controls separate from other projection Selects', () => {
    const previewer = document.createElement('div');
    previewer.innerHTML = `
      <div data-projection-control="component"><div role="combobox" data-control="component"></div></div>
      <div data-projection-control="runtime"><div role="combobox" data-control="runtime"></div></div>`;
    const trigger = runtimeSelectTrigger(locatorFor(previewer)) as unknown as HTMLElement;
    expect(trigger?.dataset.control).toBe('runtime');
  });
});

describe('documentation server readiness diagnostics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('accepts the observed 3.6s HTTP 200 response within the existing total budget', async () => {
    vi.useFakeTimers();
    vi.stubEnv('PROTO_UI_BROWSER_BASE_URL', 'http://documentation.test');
    // Native AbortSignal.timeout does not use Vitest's fake clock. Model its
    // real deadline so the old 2s abort remains a discriminating negative.
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((delay) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), delay);
      return controller.signal;
    });
    const cancel = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn(
      (_url, { signal }: RequestInit) =>
        new Promise((resolve, reject) => {
          const finish = () => {
            signal?.removeEventListener('abort', abort);
            clearTimeout(timer);
          };
          const abort = () => {
            finish();
            reject(signal?.reason);
          };
          const timer = setTimeout(() => {
            finish();
            resolve({ ok: true, status: 200, statusText: 'OK', body: { cancel } });
          }, 3_600);
          signal?.addEventListener('abort', abort, { once: true });
        })
    );
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = startServer('/ready/').catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(125_000);
    expect(await result).toBe('http://documentation.test');
    expect(fetch).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('reports the last HTTP status immediately before rejecting the hook', async () => {
    vi.useFakeTimers();
    vi.stubEnv('PROTO_UI_BROWSER_BASE_URL', 'http://documentation.test');
    const cancel = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        body: { cancel },
      })
    );
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = startServer('/ready/').catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await result).toMatchObject({
      message: expect.stringContaining('HTTP 503 Service Unavailable'),
    });
    expect(output).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining(
        '[browser-harness] readiness failed: Timed out waiting for http://documentation.test/ready/'
      )
    );
    expect(cancel).toHaveBeenCalled();
  });

  it('retains the latest connection error and cause instead of a prior HTTP response', async () => {
    vi.useFakeTimers();
    vi.stubEnv('PROTO_UI_BROWSER_BASE_URL', 'http://documentation.test');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockRejectedValue(
          new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 127.0.0.1:1234') })
        )
    );
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = startServer('/ready/').catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(120_000);
    const error = await result;
    expect(error).toMatchObject({
      message: expect.stringContaining(
        'TypeError: fetch failed; cause=Error: connect ECONNREFUSED'
      ),
    });
    expect(output).toHaveBeenCalledOnce();
  });

  it('releases an unused successful readiness response and does not report failure', async () => {
    vi.stubEnv('PROTO_UI_BROWSER_BASE_URL', 'http://documentation.test');
    const cancel = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: { cancel } })
    );
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startServer('/ready/')).toBe('http://documentation.test');
    expect(cancel).toHaveBeenCalledOnce();
    expect(output).not.toHaveBeenCalled();
  });
});
