import { describe, expect, it } from 'vitest';
import { definePrototype, type FocusRequestOptions } from '@proto.ui/core';
import { asFocusEntry, asFocusable, asFocusScope } from '@proto.ui/hooks';
import { createRuntimeSession } from '@proto.ui/runtime';
import { EVENT_ROOT_TARGET_CAP, EVENT_GLOBAL_TARGET_CAP } from '@proto.ui/module-event';
import {
  FOCUS_ROOT_TARGET_CAP,
  FOCUS_REQUEST_FOCUS_CAP,
  FOCUS_BLUR_CAP,
  FOCUS_TARGET_READY_CAP,
  FOCUS_INSTANCE_TOKEN_CAP,
  FOCUS_PARENT_CAP,
  FOCUS_RESOLVE_ENTRY_TARGET_CAP,
  FOCUS_RUN_IN_CALLBACK_CAP,
  type FocusPort,
} from '@proto.ui/module-focus';

type Kind = 'programmatic' | 'native' | 'entry';
let identity = 10000;
async function fixture(haveRequestCap = true, declareScope = false) {
  let scope: ReturnType<typeof asFocusScope> | undefined;
  let parentToken: unknown = null;
  let parentObserver: (() => void) | undefined;
  let entry!: ReturnType<typeof asFocusEntry>;
  let focusable!: ReturnType<typeof asFocusable>;
  const root = document.createElement('div');
  root.tabIndex = 0;
  const child = document.createElement('button');
  root.append(child);
  document.body.append(root);
  let target: HTMLElement | null = root;
  let resolved: HTMLElement | null = child;
  let rootImpl: (() => HTMLElement | null) | undefined;
  let eligibleObserver: (next: boolean) => void = () => {};
  let observer: (next: boolean) => void = () => {};
  let resolveImpl: (() => HTMLElement | null) | undefined;
  let attachFocus: () => void;
  const token = {};
  const listeners = new Set<() => void>();
  const attempts: Array<{
    target: HTMLElement;
    options: FocusRequestOptions | undefined;
    kind: Kind;
  }> = [];
  let impl: (
    el: HTMLElement,
    options: FocusRequestOptions | undefined,
    kind: Kind
  ) => boolean = () => false;
  const proto = definePrototype({
    name: `transition-attack-${++identity}`,
    setup() {
      if (declareScope) {
        scope = asFocusScope();
        scope.configure({ entry: 'manual' });
      }
      entry = asFocusEntry();
      entry.configure({ strategy: 'descendant-first', fallback: 'none' });
      focusable = asFocusable();
      focusable.focusable.watch((_ctx, event) => {
        if (event.type === 'next') eligibleObserver(event.next);
      });
      focusable.focused.watch((_ctx, event) => {
        if (event.type === 'next') observer(event.next);
      });
      return (r) => r.el('div');
    },
  });
  let session: ReturnType<typeof createRuntimeSession>;
  session = createRuntimeSession(proto, {
    prototypeName: proto.name,
    getRawProps: () => ({}),
    schedule: (fn) => fn(),
    commit: (_children, signal) => signal?.done(),
    onRuntimeReady(wiring) {
      wiring.attach('event', [
        [EVENT_ROOT_TARGET_CAP, () => root],
        [EVENT_GLOBAL_TARGET_CAP, () => window],
      ]);
      attachFocus = () =>
        wiring.attach(
          'focus',
          [
            [FOCUS_INSTANCE_TOKEN_CAP, token],
            [
              FOCUS_PARENT_CAP,
              (instance: unknown) => {
                parentObserver?.();
                return instance === token ? parentToken : null;
              },
            ],
            [FOCUS_ROOT_TARGET_CAP, () => (rootImpl ? rootImpl() : target)],
            [FOCUS_BLUR_CAP, (el: HTMLElement) => el.blur()],
            [FOCUS_RESOLVE_ENTRY_TARGET_CAP, () => (resolveImpl ? resolveImpl() : resolved)],
            [
              FOCUS_REQUEST_FOCUS_CAP,
              (el: HTMLElement, options: FocusRequestOptions | undefined, kind: Kind) => {
                attempts.push({ target: el, options, kind });
                return impl(el, options, kind);
              },
            ],
            [
              FOCUS_TARGET_READY_CAP,
              (fn: () => void) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
              },
            ],
            [FOCUS_RUN_IN_CALLBACK_CAP, (fn: () => void) => session.invokeInCallbackScope(fn)],
          ].filter(([cap]) => haveRequestCap || cap !== FOCUS_REQUEST_FOCUS_CAP) as any
        );
      attachFocus();
    },
  });
  await session.mount();
  return {
    root,
    child,
    entry,
    focusable,
    scope,
    token,
    session,
    attempts,
    setParent(v: unknown) {
      parentToken = v;
    },
    setParentObserver(v: typeof parentObserver) {
      parentObserver = v;
    },
    port: session.caps.getPort<FocusPort>('focus')!,
    setRootImpl(v: typeof rootImpl) {
      rootImpl = v;
    },
    setEligibleObserver(v: typeof eligibleObserver) {
      eligibleObserver = v;
    },
    setObserver(v: typeof observer) {
      observer = v;
    },
    setResolveImpl(v: typeof resolveImpl) {
      resolveImpl = v;
    },
    setRequestCap(v: boolean) {
      haveRequestCap = v;
      attachFocus();
    },
    setTarget(v: HTMLElement | null) {
      target = v;
    },
    setResolved(v: HTMLElement | null) {
      resolved = v;
    },
    setImpl(v: typeof impl) {
      impl = v;
    },
    ready() {
      for (const fn of [...listeners]) fn();
    },
    request(kind: Kind, options: FocusRequestOptions) {
      if (kind === 'entry') entry.focus(options);
      else if (kind === 'native') focusable.focusSelf(options);
      else focusable.focus(options);
    },
    async cleanup() {
      await session.dispose();
      root.remove();
    },
  };
}

// Controlled host getters explicitly inject synchronous effects; ordinary native-browser evidence is not claimed.
describe('first-repair adjacent preflight boundaries', () => {
  for (const oldKind of ['programmatic', 'native'] as const) {
    for (const action of ['new-target', 'blur'] as const) {
      it(`${oldKind} Center root preflight cannot revive old request after ${action}`, async () => {
        const f = await fixture();
        try {
          let armed = true;
          f.setImpl(() => true);
          f.setRootImpl(() => {
            if (armed) {
              armed = false;
              if (action === 'blur') f.focusable.blur();
              else f.focusable.focus({ reason: 'pointer' });
            }
            return f.root;
          });
          f.request(oldKind, { reason: 'keyboard' });
          expect(f.attempts.map((x) => x.options)).toEqual(
            action === 'blur' ? [] : [{ reason: 'pointer' }]
          );
          expect(f.port.getFacts()).toMatchObject(
            action === 'blur'
              ? { focused: false, active: false, focusVisible: false }
              : { focused: true, active: true, focusVisible: false }
          );
        } finally {
          await f.cleanup();
        }
      });
    }
    it(`${oldKind} first unresolved entry cannot roll back same-role cancellation`, async () => {
      const f = await fixture();
      try {
        let armed = true;
        f.setImpl(() => {
          if (armed) {
            armed = false;
            f.setResolveImpl(() => {
              f.focusable.setDisabled(true);
              f.focusable.setDisabled(false);
              return null;
            });
            f.entry.focus({ reason: 'pointer' });
            f.setResolveImpl(undefined);
          }
          return false;
        });
        f.request(oldKind, { reason: 'keyboard' });
        f.setImpl(() => true);
        f.ready();
        expect(f.attempts).toHaveLength(1);
        expect(f.port.getFacts()).toMatchObject({
          focused: false,
          active: false,
          focusVisible: false,
        });
      } finally {
        await f.cleanup();
      }
    });
  }
  for (const next of ['programmatic', 'native', 'entry'] as const) {
    it(`fulfill root preflight preserves newer ${next} pending`, async () => {
      const f = await fixture();
      try {
        f.focusable.focus({ reason: 'keyboard' });
        let reads = 0;
        f.setRootImpl(() => {
          reads++;
          if (reads === 3) f.request(next, { reason: 'pointer' });
          return f.root;
        });
        f.ready();
        f.setRootImpl(undefined);
        f.setImpl(() => true);
        f.ready();
        expect(f.attempts.at(-1)?.options).toEqual({ reason: 'pointer' });
        expect(f.attempts.at(-1)?.kind).toBe(next);
      } finally {
        await f.cleanup();
      }
    });
  }
  for (const pending of [false, true]) {
    it(`focusable-state watcher re-enable plus ${pending ? 'pending' : 'accepted'} focus survives stale disable`, async () => {
      const f = await fixture();
      try {
        f.setImpl((el) => {
          if (pending) return false;
          el.focus();
          return el.ownerDocument.activeElement === el;
        });
        f.setEligibleObserver((next) => {
          if (!next) {
            f.focusable.setDisabled(false);
            f.focusable.focus({ reason: 'keyboard' });
          }
        });
        f.focusable.setDisabled(true);
        f.setImpl((el) => {
          el.focus();
          return true;
        });
        f.ready();
        expect(f.focusable.focusable.get()).toBe(true);
        expect(document.activeElement).toBe(f.root);
        expect(f.port.getFacts()).toMatchObject({
          focused: true,
          active: true,
          focusVisible: true,
        });
      } finally {
        await f.cleanup();
      }
    });
  }
});

describe('Center policy epoch controls', () => {
  it('rejected nested out-of-scope request must not cancel legitimate accepted owner cleanup', async () => {
    const scope = await fixture(true, true),
      old = await fixture(),
      next = await fixture(),
      outside = await fixture();
    try {
      old.setParent(scope.token);
      next.setParent(scope.token);
      scope.scope!.activate();
      old.setImpl((el) => {
        el.focus();
        return true;
      });
      old.focusable.focus({ reason: 'pointer' });
      expect(old.focusable.focused.get()).toBe(true);
      next.setImpl((el) => {
        el.focus();
        outside.focusable.focus({ reason: 'keyboard' });
        return el.ownerDocument.activeElement === el;
      });
      next.focusable.focus({ reason: 'keyboard' });
      expect(outside.attempts).toHaveLength(0);
      expect(document.activeElement).toBe(next.root);
      expect([
        old.focusable.focused.get(),
        next.focusable.focused.get(),
        outside.focusable.focused.get(),
      ]).toEqual([false, true, false]);
    } finally {
      await outside.cleanup();
      await next.cleanup();
      await old.cleanup();
      await scope.cleanup();
    }
  });
  it('policy parent lookup reentry cannot apply the stale outer intent', async () => {
    const scope = await fixture(true, true),
      f = await fixture();
    try {
      f.setParent(scope.token);
      scope.scope!.activate();
      f.setImpl(() => true);
      let armed = true;
      f.setParentObserver(() => {
        if (armed) {
          armed = false;
          f.focusable.focus({ reason: 'pointer' });
        }
      });
      f.focusable.focus({ reason: 'keyboard' });
      expect(f.attempts.map((x) => x.options)).toEqual([{ reason: 'pointer' }]);
    } finally {
      await f.cleanup();
      await scope.cleanup();
    }
  });
});
