import { describe, expect, it, vi } from 'vitest';
import { cap as createCap } from '@proto.ui/core';
import { createDeferredOwnerDisposal, createViewEpochOwner } from '../src';

describe('adapter-base: view epoch owner', () => {
  it('rebinds view epochs without recreating or disposing the Proto session', async () => {
    const owner = createViewEpochOwner<any>({ prototypeName: 'x-view-owner' });
    const calls: string[] = [];
    const session = {
      viewIntent: {
        getSnapshot: () => ({ present: true, version: 0 }),
        subscribe: () => () => {},
      },
      mount: vi.fn(async () => calls.push('mount')),
      unmount: vi.fn(async () => calls.push('unmount')),
      dispose: vi.fn(async () => calls.push('dispose')),
    } as any;
    const createSession = vi.fn(() => session);

    owner.attachView({
      modules: { event: () => [] },
      disposeView: () => calls.push('view:1.dispose'),
      createSession,
    });
    await owner.detachView();

    owner.attachView({
      modules: { event: () => [] },
      disposeView: () => calls.push('view:2.dispose'),
      createSession,
    });

    expect(createSession).toHaveBeenCalledOnce();
    expect(session.mount).toHaveBeenCalledOnce();
    expect(calls).toEqual(['unmount', 'view:1.dispose', 'mount']);

    await owner.dispose();
    expect(calls).toEqual(['unmount', 'view:1.dispose', 'mount', 'dispose', 'view:2.dispose']);
  });

  for (const cleanupThrows of [false, true])
    it(`rolls back a synchronous remount failure and accepts a retry (cleanupThrows=${cleanupThrows})`, async () => {
      const owner = createViewEpochOwner<any>({ prototypeName: 'failed-remount' });
      const active = new Map<string, unknown>();
      const ownerCap = createCap<string>('test/owner');
      const viewCap = createCap<string>('test/view');
      const failure = new Error('first material frame failed');
      const session = {
        viewIntent: {
          getSnapshot: () => ({ present: true, version: 0 }),
          subscribe: () => () => {},
        },
        mount: vi.fn(),
        unmount: vi.fn(async () => {}),
        dispose: vi.fn(async () => {}),
      } as any;
      const createSession = (wiring: any) => {
        wiring.onRuntimeReady({
          attach: (name: string, entries: unknown) => {
            active.set(name, entries);
            return true;
          },
          reset: (name: string) => {
            active.delete(name);
          },
        });
        return session;
      };
      owner.initialize({ modules: { feedback: () => [[ownerCap, 'owner']] }, createSession });
      owner.attachView({
        modules: { feedback: () => [[viewCap, 'first']] },
        disposeView: vi.fn(),
        createSession,
      });
      await owner.detachView();
      session.mount.mockImplementationOnce(() => {
        throw failure;
      });
      const release = vi.fn(() => {
        if (cleanupThrows) throw new Error('cleanup failed');
      });
      expect(() =>
        owner.attachView({
          modules: { feedback: () => [[viewCap, 'failed']] },
          disposeView: release,
          createSession,
        })
      ).toThrow(failure);
      expect(owner.hasView).toBe(false);
      expect(release).toHaveBeenCalledOnce();
      expect(active.get('feedback')).toEqual([[ownerCap, 'owner']]);
      const retry = vi.fn();
      owner.attachView({
        modules: { feedback: () => [[viewCap, 'retry']] },
        disposeView: retry,
        createSession,
      });
      expect(owner.hasView).toBe(true);
      expect(active.get('feedback')).toEqual([[viewCap, 'retry']]);
      expect(session.mount).toHaveBeenCalledTimes(3);
      await owner.dispose();
      expect(retry).toHaveBeenCalledOnce();
    });

  for (const reentry of ['unmount', 'disposer'] as const)
    it(`preserves a replacement attached during failed-view ${reentry}`, async () => {
      const owner = createViewEpochOwner<any>({ prototypeName: 'reentrant-rollback' });
      const active = new Map<string, unknown>();
      const cap = createCap<string>('test/cap');
      const failure = new Error('failed first frame');
      const session = {
        viewIntent: {
          getSnapshot: () => ({ present: true, version: 0 }),
          subscribe: () => () => {},
        },
        mount: vi.fn().mockImplementationOnce(() => {
          throw failure;
        }),
        unmount: vi.fn(async () => {}),
        dispose: vi.fn(async () => {}),
      } as any;
      const createSession = (wiring: any) => {
        wiring.onRuntimeReady({
          attach: (name: string, entries: unknown) => {
            active.set(name, entries);
            return true;
          },
          reset: (name: string) => {
            active.delete(name);
          },
        });
        return session;
      };
      owner.initialize({ modules: { feedback: () => [[cap, 'owner']] }, createSession });
      const replacementRelease = vi.fn();
      const replace = () =>
        owner.attachView({
          modules: { feedback: () => [[cap, 'replacement']] },
          disposeView: replacementRelease,
          createSession,
        });
      if (reentry === 'unmount')
        session.unmount.mockImplementationOnce(async () => {
          replace();
        });
      const failedRelease = vi.fn(() => {
        if (reentry === 'disposer') replace();
      });
      expect(() =>
        owner.attachView({
          modules: { feedback: () => [[cap, 'failed']] },
          disposeView: failedRelease,
          createSession,
        })
      ).toThrow(failure);
      expect(owner.hasView).toBe(true);
      expect(failedRelease).toHaveBeenCalledOnce();
      expect(replacementRelease).not.toHaveBeenCalled();
      expect(active.get('feedback')).toEqual([[cap, 'replacement']]);
      await owner.dispose();
      expect(replacementRelease).toHaveBeenCalledOnce();
    });

  it('preserves a newer lease when synchronous mount reuses the same disposer', async () => {
    const owner = createViewEpochOwner<any>({ prototypeName: 'same-disposer-lease' });
    const cap = createCap<string>('test/reused-disposer');
    const active = new Map<string, unknown>();
    const failure = new Error('old mount failure');
    const session = {
      viewIntent: { getSnapshot: () => ({ present: true, version: 0 }), subscribe: () => () => {} },
      mount: vi.fn(),
      unmount: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
    } as any;
    const createSession = (wiring: any) => {
      wiring.onRuntimeReady({
        attach: (name: string, entries: unknown) => {
          active.set(name, entries);
          return true;
        },
        reset: (name: string) => {
          active.delete(name);
        },
      });
      return session;
    };
    owner.initialize({ modules: { feedback: () => [[cap, 'owner']] }, createSession });
    const release = vi.fn();
    session.mount.mockImplementationOnce(() => {
      owner.attachView({
        modules: { feedback: () => [[cap, 'new']] },
        disposeView: release,
        createSession,
      });
      throw failure;
    });
    expect(() =>
      owner.attachView({
        modules: { feedback: () => [[cap, 'old']] },
        disposeView: release,
        createSession,
      })
    ).toThrow(failure);
    expect(owner.hasView).toBe(true);
    expect(active.get('feedback')).toEqual([[cap, 'new']]);
    expect(release).toHaveBeenCalledOnce();
    await owner.dispose();
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('initializes one detached session and forwards versioned view intent before any view exists', async () => {
    const owner = createViewEpochOwner<any>({ prototypeName: 'x-detached-owner' });
    const intentListeners = new Set<(snapshot: { present: boolean; version: number }) => void>();
    let snapshot = { present: false, version: 1 };
    const calls: string[] = [];
    const session = {
      viewIntent: {
        getSnapshot: () => snapshot,
        subscribe(listener: (next: typeof snapshot) => void) {
          intentListeners.add(listener);
          return () => intentListeners.delete(listener);
        },
      },
      mount: vi.fn(async () => calls.push('mount')),
      unmount: vi.fn(async () => calls.push('unmount')),
      dispose: vi.fn(async () => calls.push('dispose')),
    } as any;
    const onViewIntent = vi.fn();

    owner.initialize({
      modules: {},
      createSession: () => session,
      onViewIntent,
    });

    expect(owner.session).toBe(session);
    expect(owner.hasView).toBe(false);
    expect(owner.viewIntent).toEqual({ present: false, version: 1 });
    expect(onViewIntent).toHaveBeenLastCalledWith({ present: false, version: 1 });
    expect(session.mount).not.toHaveBeenCalled();

    snapshot = { present: true, version: 2 };
    for (const listener of intentListeners) listener(snapshot);
    expect(owner.viewIntent).toEqual({ present: true, version: 2 });

    owner.attachView({
      modules: { event: () => [] },
      disposeView: () => calls.push('view.dispose'),
      createSession: () => {
        throw new Error('must reuse detached session');
      },
    });
    expect(session.mount).toHaveBeenCalledOnce();

    await owner.dispose();
    expect(intentListeners.size).toBe(0);
    expect(calls).toEqual(['mount', 'dispose', 'view.dispose']);
  });

  it('defers terminal owner disposal and cancels it when ownership is retained', async () => {
    const dispose = vi.fn();
    const scheduler = createDeferredOwnerDisposal(dispose);

    scheduler.release();
    scheduler.retain();
    await Promise.resolve();
    expect(dispose).not.toHaveBeenCalled();

    scheduler.release();
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('rolls back failed detached initialization so the owner remains retryable', () => {
    const owner = createViewEpochOwner<any>({ prototypeName: 'x-retry-owner' });
    const createSession = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('setup failed');
      })
      .mockImplementationOnce(() => ({
        viewIntent: {
          getSnapshot: () => ({ present: true, version: 1 }),
          subscribe: () => () => {},
        },
        mount: vi.fn(),
        unmount: vi.fn(),
        dispose: vi.fn(),
      }));

    expect(() =>
      owner.initialize({
        modules: {},
        createSession,
      })
    ).toThrow('setup failed');
    expect(owner.session).toBeNull();
    expect(owner.viewIntent).toBeNull();

    expect(() =>
      owner.initialize({
        modules: {},
        createSession,
      })
    ).not.toThrow();
    expect(owner.session).not.toBeNull();
    expect(createSession).toHaveBeenCalledTimes(2);
  });
});
