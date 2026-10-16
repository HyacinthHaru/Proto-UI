import { expect, it, vi } from 'vitest';
import {
  readBoundedTrace,
  readUniqueFocus,
  sanitizeTimingTrace,
} from './collapsible-focus-path-probe';

it.each([0, 2])('rejects %i Trigger matches without pretending unique identity', (count) => {
  const matches = Array.from({ length: count }, () => document.createElement('button'));
  expect(() => readUniqueFocus(matches)).toThrow(`Expected one Trigger, found ${count}`);
});

it('reads exact current focus and pointer identity without moving focus', () => {
  const host = document.createElement('div') as HTMLDivElement & {
    __puiCollapsibleLastPointerTarget?: Element | null;
  };
  host.dataset.previewerId = 'probe';
  const trigger = document.createElement('button');
  const foreign = document.createElement('button');
  host.append(trigger, foreign);
  document.body.append(host);
  host.__puiCollapsibleLastPointerTarget = trigger;
  try {
    foreign.focus();
    expect(readUniqueFocus([trigger])).toMatchObject({
      connected: true,
      focused: false,
      expectedIsPointerTarget: true,
      activeIsPointerTarget: false,
    });
    expect(document.activeElement).toBe(foreign);
    trigger.focus();
    expect(readUniqueFocus([trigger])).toMatchObject({
      connected: true,
      focused: true,
      expectedIsPointerTarget: true,
      activeIsPointerTarget: true,
    });
    trigger.remove();
    expect(readUniqueFocus([trigger])).toMatchObject({ connected: false, focused: false });
  } finally {
    host.remove();
  }
});

it('reads a complete trace including base64 chunks within a byte limit', async () => {
  const chunks = [
    { data: '{', eof: false },
    { data: Buffer.from('}').toString('base64'), base64Encoded: true, eof: true },
  ];
  const trace = await readBoundedTrace(async () => chunks.shift()!, 2);
  expect(trace.toString()).toBe('{}');
});

it('refuses oversized traces instead of returning a partial artifact', async () => {
  let reads = 0;
  await expect(
    readBoundedTrace(async () => {
      reads++;
      return { data: 'oversize', eof: true };
    }, 2)
  ).rejects.toThrow('no partial trace saved');
  expect(reads).toBe(1);
});

it('bounds even an endless empty trace stream', async () => {
  let reads = 0;
  await expect(
    readBoundedTrace(async () => {
      reads++;
      return { data: '', eof: false };
    })
  ).rejects.toThrow('129 reads');
  expect(reads).toBe(129);
});

it('propagates a failed stream read without synthesizing a trace', async () => {
  const error = new Error('stream unavailable');
  await expect(
    readBoundedTrace(async () => {
      throw error;
    })
  ).rejects.toBe(error);
});

it('rejects a non-loopback target before creating a browser context', async () => {
  const { probeCollapsibleFocusPaths } = await import('./collapsible-focus-path-probe');
  await expect(
    probeCollapsibleFocusPaths({
      browser: {
        newContext() {
          throw new Error('Must not create context');
        },
      } as never,
      url: 'https://example.com/',
      directory: '/unused',
      sourceSha: 'test',
      runtime: 'wc',
      order: 'AB',
      prepare: async () => {
        throw new Error('Must not prepare');
      },
      verifyExpanded: async () => {},
    })
  ).rejects.toThrow('loopback');
});

it.each(['AB', 'BA'] as const)(
  'keeps %s sampling finite and exports only a bounded trace',
  async (order) => {
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { EventEmitter } = await import('node:events');
    const { probeCollapsibleFocusPaths } = await import('./collapsible-focus-path-probe');
    const directory = await mkdtemp(join(tmpdir(), 'pui-focus-probe-'));
    const calls: string[] = [];
    const commands: Array<{ method: string; args?: unknown }> = [];
    const session = new EventEmitter() as InstanceType<typeof EventEmitter> & {
      send(method: string, args?: unknown): Promise<unknown>;
      detach(): Promise<void>;
    };
    session.send = async (method, args) => {
      commands.push({ method, args });
      if (method === 'Tracing.end')
        queueMicrotask(() =>
          session.emit('Tracing.tracingComplete', {
            stream: 'trace',
            dataLossOccurred: false,
          })
        );
      return method === 'IO.read' ? { data: '{"traceEvents":[]}', eof: true } : {};
    };
    session.detach = async () => {
      calls.push('detach');
    };
    const button = {
      click: async () => {
        calls.push('click');
      },
      evaluate: async () => {
        calls.push('A');
        return { connected: true, focused: true };
      },
      evaluateAll: async () => {
        calls.push('B');
        return { connected: true, focused: true };
      },
      elementHandle: async () => {
        calls.push('C-acquire');
        return {
          evaluate: async () => {
            calls.push('C-evaluate');
            return { connected: true, focused: true };
          },
          dispose: async () => {},
        };
      },
    };
    const browser = {
      newContext: async () => {
        calls.push('new-context');
        return {
          route: async () => {},
          routeWebSocket: async () => {},
          newPage: async () => ({ setDefaultTimeout() {}, goto: async () => {} }),
          close: async () => {
            calls.push('close');
          },
        };
      },
      newBrowserCDPSession: async () => session,
    };
    try {
      await probeCollapsibleFocusPaths({
        browser: browser as never,
        url: 'http://127.0.0.1:4321/test',
        directory,
        sourceSha: 'test',
        runtime: 'wc',
        order,
        prepare: async () => button as never,
        verifyExpanded: async () => {},
      });
      expect(calls).toEqual([
        'new-context',
        'click',
        ...order,
        'C-acquire',
        'C-evaluate',
        'close',
        'detach',
      ]);
      const manifest = JSON.parse(
        await readFile(join(directory, `focus-path-wc-${order}.json`), 'utf8')
      );
      expect(manifest.errors).toEqual([]);
      expect(manifest.traceSaved).toBe(true);
      expect(await readFile(join(directory, `focus-path-wc-${order}.trace.json`), 'utf8')).toBe(
        '{"traceEvents":[],"displayTimeUnit":"ms"}'
      );
      expect(commands.find((command) => command.method === 'Tracing.start')?.args).toMatchObject({
        transferMode: 'ReturnAsStream',
        traceConfig: {
          traceBufferSizeInKb: 2048,
          enableSampling: false,
          enableArgumentFilter: true,
          includedCategories: ['devtools.timeline', 'blink.user_timing'],
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);

it('ends a preparation timeout by closing its context without starting trace or sampling', async () => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { probeCollapsibleFocusPaths } = await import('./collapsible-focus-path-probe');
  const directory = await mkdtemp(join(tmpdir(), 'pui-focus-probe-timeout-'));
  const close = vi.fn(async () => {});
  const trace = vi.fn(async () => {
    throw new Error('Trace must not start');
  });
  const browser = {
    newContext: async () => ({
      route: async () => {},
      routeWebSocket: async () => {},
      newPage: async () => ({ setDefaultTimeout() {}, goto: async () => {} }),
      close,
    }),
    newBrowserCDPSession: trace,
  };
  vi.useFakeTimers();
  try {
    const outcome = probeCollapsibleFocusPaths({
      browser: browser as never,
      url: 'http://127.0.0.1:4321/test',
      directory,
      sourceSha: 'test',
      runtime: 'vue',
      order: 'AB',
      prepare: () => new Promise(() => {}),
      verifyExpanded: async () => {},
    }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(45_001);
    expect(String(await outcome)).toContain('45000ms exceeded');
    expect(close).toHaveBeenCalledTimes(1);
    expect(trace).not.toHaveBeenCalled();
    const manifest = JSON.parse(await readFile(join(directory, 'focus-path-vue-AB.json'), 'utf8'));
    expect(manifest.traceSaved).toBe(false);
    expect(manifest.records.map((record: { label: string }) => record.label)).toEqual([
      'navigation',
    ]);
  } finally {
    vi.useRealTimers();
    await rm(directory, { recursive: true, force: true });
  }
});

it('exports timing fields only and removes network, screenshots, bodies and arbitrary arguments', () => {
  const raw = Buffer.from(
    JSON.stringify({
      secret: 'top-level secret',
      traceEvents: [
        {
          name: 'ResourceSendRequest',
          args: { url: 'https://private.invalid/token', body: 'secret' },
        },
        { name: 'Screenshot', args: { snapshot: 'private pixels' } },
        {
          name: 'Layout',
          ts: 12,
          dur: 3,
          pid: 1,
          tid: 2,
          ph: 'X',
          cat: 'private-category',
          args: { body: 'secret' },
        },
        { name: 'clock_sync', ph: 'c', args: { sync_id: 'focus-path-vue-AB-A', secret: 'hidden' } },
      ],
    })
  );
  const safe = sanitizeTimingTrace(raw).toString();
  for (const rejected of [
    'private',
    'secret',
    'Screenshot',
    'ResourceSendRequest',
    'body',
    'snapshot',
  ])
    expect(safe).not.toContain(rejected);
  const events = JSON.parse(safe).traceEvents;
  expect(events).toHaveLength(2);
  expect(events[0]).toMatchObject({ name: 'Layout', ts: 12, dur: 3, ph: 'X' });
  expect(events[1].args).toEqual({ sync_id: 'focus-path-vue-AB-A' });
});

it.each(['context', 'session', 'trace-start'] as const)(
  'cleans up a late %s after the foreground deadline',
  async (pendingKind) => {
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { probeCollapsibleFocusPaths } = await import('./collapsible-focus-path-probe');
    const directory = await mkdtemp(join(tmpdir(), 'pui-focus-late-'));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const context = {
      route: async () => {},
      routeWebSocket: async () => {},
      newPage: async () => ({ setDefaultTimeout() {}, goto: async () => {} }),
      close: async () => {
        calls.push('close');
      },
    };
    const session = {
      send: async (method: string) => {
        calls.push(method);
        if (method === 'Tracing.start' && pendingKind === 'trace-start') await gate;
        return {};
      },
      detach: async () => {
        calls.push('detach');
      },
    };
    const browser = {
      newContext: async () => {
        if (pendingKind === 'context') await gate;
        return context;
      },
      newBrowserCDPSession: async () => {
        if (pendingKind === 'session') await gate;
        return session;
      },
    };
    vi.useFakeTimers();
    try {
      const outcome = probeCollapsibleFocusPaths({
        browser: browser as never,
        url: 'http://127.0.0.1:4321/test',
        directory,
        sourceSha: 'test',
        runtime: 'wc',
        order: 'AB',
        prepare: async () =>
          ({
            click() {
              throw new Error('Must not click after deadline');
            },
          }) as never,
        verifyExpanded: async () => {},
      }).catch((error) => error);
      await vi.advanceTimersByTimeAsync(77_001);
      expect(String(await outcome)).toContain('75000ms exceeded');
      const before = JSON.parse(await readFile(join(directory, 'focus-path-wc-AB.json'), 'utf8'));
      expect(before.traceSaved).toBe(false);
      expect(calls).not.toContain('detach');
      if (pendingKind !== 'context') {
        await expect(
          probeCollapsibleFocusPaths({
            browser: browser as never,
            url: 'http://127.0.0.1:4321/test',
            directory,
            sourceSha: 'test',
            runtime: 'vue',
            order: 'BA',
            prepare: async () => {
              throw new Error('Must not prepare another probe');
            },
            verifyExpanded: async () => {},
          })
        ).rejects.toThrow('browser quarantined');
        expect(before.browserQuarantined).toBe(true);
      }
      release();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls.filter((call) => call === 'close')).toHaveLength(1);
      expect(calls.filter((call) => call === 'detach')).toHaveLength(
        pendingKind === 'context' ? 0 : 1
      );
      expect(calls.filter((call) => call === 'Tracing.end')).toHaveLength(
        pendingKind === 'trace-start' ? 1 : 0
      );
      if (pendingKind !== 'trace-start') expect(calls).not.toContain('Tracing.start');
      const after = JSON.parse(await readFile(join(directory, 'focus-path-wc-AB.json'), 'utf8'));
      expect(after).toEqual(before);
    } finally {
      vi.useRealTimers();
      await rm(directory, { recursive: true, force: true });
    }
  }
);
