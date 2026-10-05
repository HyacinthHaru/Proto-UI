import { describe, expect, it } from 'vitest';
import { definePrototype, type FocusEntryConfig, type FocusRequestOptions } from '@proto.ui/core';
import { asFocusEntry, asFocusable } from '@proto.ui/hooks';
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
import { resolveWebFocusEntryTarget } from '../../../adapters/base/src/platform/focus-entry';

let identity = 0;
async function fixture(dual = false) {
  let entry!: ReturnType<typeof asFocusEntry>;
  let focusable: ReturnType<typeof asFocusable> | undefined;
  const initialRoot = document.createElement('div');
  initialRoot.tabIndex = 0;
  const first = document.createElement('button');
  first.textContent = 'old';
  initialRoot.append(first);
  document.body.append(initialRoot);
  let currentRoot: HTMLElement | null = initialRoot;
  let accept = false;
  const listeners = new Set<() => void>();
  const attempts: Array<{ target: HTMLElement; options: FocusRequestOptions | undefined }> = [];
  const applied: Array<{ target: HTMLElement; options: FocusRequestOptions | undefined }> = [];
  const blurred: HTMLElement[] = [];
  const proto = definePrototype({
    name: `entry-pending-${++identity}`,
    setup() {
      entry = asFocusEntry();
      entry.configure({ strategy: 'descendant-first', fallback: 'none' });
      if (dual) focusable = asFocusable();
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
        [EVENT_ROOT_TARGET_CAP, () => initialRoot],
        [EVENT_GLOBAL_TARGET_CAP, () => window],
      ]);
      wiring.attach('focus', [
        [FOCUS_INSTANCE_TOKEN_CAP, {}],
        [FOCUS_PARENT_CAP, () => null],
        [FOCUS_ROOT_TARGET_CAP, () => currentRoot],
        [
          FOCUS_BLUR_CAP,
          (target: HTMLElement) => {
            blurred.push(target);
            target.blur();
          },
        ],
        [
          FOCUS_RESOLVE_ENTRY_TARGET_CAP,
          (root: HTMLElement, config: FocusEntryConfig) =>
            resolveWebFocusEntryTarget(root, config, (el) => el.tagName === 'BUTTON'),
        ],
        [
          FOCUS_REQUEST_FOCUS_CAP,
          (target: HTMLElement, options?: FocusRequestOptions) => {
            attempts.push({ target, options });
            if (!accept) return false;
            applied.push({ target, options });
            target.focus();
            return true;
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
      ]);
    },
  });
  await session.mount();
  const ready = () => {
    for (const fn of [...listeners]) fn();
  };
  return {
    entry,
    focusable,
    session,
    initialRoot,
    first,
    attempts,
    applied,
    blurred,
    listeners,
    ready,
    setAccept: (value: boolean) => (accept = value),
    setRoot: (root: HTMLElement | null) => (currentRoot = root),
    port: session.caps.getPort<FocusPort>('focus')!,
    async cleanup() {
      await session.dispose();
      initialRoot.remove();
      currentRoot?.remove();
    },
  };
}

describe('entry pending lifecycle boundaries', () => {
  it.each([
    ['target', 'target disable', false],
    ['target', 'entry disable', true],
    ['target', 'explicit blur', false],
    ['target-self', 'target disable', false],
    ['target-self', 'entry disable', true],
    ['target-self', 'explicit blur', false],
    ['entry', 'target disable', true],
    ['entry', 'entry disable', false],
    ['entry', 'explicit blur', false],
  ] as const)(
    'pending %s followed by %s preserves intent: %s',
    async (request, cancel, preserved) => {
      const f = await fixture(true);
      try {
        const options = { reason: 'keyboard', preventScroll: true } as const;
        if (request === 'entry') f.entry.focus(options);
        else if (request === 'target-self') f.focusable!.focusSelf(options);
        else f.focusable!.focus(options);
        expect(f.attempts).toHaveLength(1);
        expect(f.applied).toHaveLength(0);

        if (cancel === 'target disable') f.focusable!.setDisabled(true);
        else if (cancel === 'entry disable') f.entry.setDisabled(true);
        else f.focusable!.blur();
        if (!preserved) {
          // Re-enable before readiness so rejection cannot hide a stale slot.
          f.focusable!.setDisabled(false);
          f.entry.setDisabled(false);
        }
        f.setAccept(true);
        f.ready();
        expect(f.applied).toEqual(
          preserved ? [{ target: request === 'entry' ? f.first : f.initialRoot, options }] : []
        );
        if (preserved) {
          expect(document.activeElement).toBe(request === 'entry' ? f.first : f.initialRoot);
        } else {
          // Re-enabling eligibility cannot recreate a cancelled request.
          f.focusable!.setDisabled(false);
          f.entry.setDisabled(false);
          f.ready();
          expect(f.applied).toHaveLength(0);
        }
        if (request === 'entry') {
          expect(f.port.getFacts()).toMatchObject({
            focused: false,
            focusVisible: false,
            active: false,
          });
          f.ready();
          expect(f.applied).toHaveLength(preserved ? 1 : 0);
        }
      } finally {
        await f.cleanup();
      }
    }
  );

  it.each(['preserve', 'entry disable', 'explicit blur', 'new entry'] as const)(
    'target disable respects synchronous native blur observers: %s',
    async (action) => {
      const f = await fixture(true);
      try {
        f.setAccept(true);
        f.focusable!.focus({ reason: 'keyboard' });
        expect(document.activeElement).toBe(f.initialRoot);
        expect(f.focusable!.focused.get()).toBe(true);
        f.setAccept(false);
        f.entry.focus({ reason: 'keyboard', preventScroll: true });

        let blurEvents = 0;
        f.initialRoot.addEventListener(
          'blur',
          () => {
            blurEvents++;
            if (action === 'entry disable') f.entry.setDisabled(true);
            else if (action === 'explicit blur') f.focusable!.blur();
            else if (action === 'new entry')
              f.entry.focus({ reason: 'pointer', preventScroll: false });
          },
          { once: true }
        );
        f.focusable!.setDisabled(true);
        expect(blurEvents).toBe(1);
        expect(f.blurred[0]).toBe(f.initialRoot);
        expect(document.activeElement).not.toBe(f.initialRoot);
        expect(f.port.getFacts()).toMatchObject({
          focused: false,
          focusVisible: false,
          active: false,
        });

        const replacement = document.createElement('button');
        f.first.replaceWith(replacement);
        // Cancellation must survive re-enable before the first replay attempt.
        f.entry.setDisabled(false);
        f.setAccept(true);
        f.ready();
        f.ready();
        const replays = f.applied.slice(1);
        expect(replays).toEqual(
          action === 'preserve' || action === 'new entry'
            ? [
                {
                  target: replacement,
                  options:
                    action === 'new entry'
                      ? { reason: 'pointer', preventScroll: false }
                      : { reason: 'keyboard', preventScroll: true },
                },
              ]
            : []
        );
        expect(f.focusable!.focused.get()).toBe(false);
      } finally {
        await f.cleanup();
      }
    }
  );

  it('retries only the latest rejected entry intent and does not fabricate region facts', async () => {
    const f = await fixture();
    try {
      f.entry.focus({ reason: 'keyboard', preventScroll: true });
      f.entry.focus({ reason: 'pointer', preventScroll: false });
      expect(f.applied).toHaveLength(0);
      f.setAccept(true);
      f.ready();
      expect(f.applied).toEqual([
        { target: f.first, options: { reason: 'pointer', preventScroll: false } },
      ]);
      expect(f.port.getFacts()).toMatchObject({
        focused: false,
        focusVisible: false,
        active: false,
        hasFocused: false,
      });
      f.ready();
      expect(f.applied).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  });
  it('disabling entry cancels rejected intent, and reenable alone cannot resurrect it', async () => {
    const f = await fixture();
    try {
      f.entry.focus();
      f.entry.setDisabled(true);
      f.setAccept(true);
      f.ready();
      f.entry.setDisabled(false);
      f.ready();
      expect(f.applied).toHaveLength(0);
      f.entry.focus();
      expect(f.applied).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  });
  it('reresolves replacement descendants rather than focusing the rejected old node', async () => {
    const f = await fixture();
    try {
      f.entry.focus({ preventScroll: true });
      const replacement = document.createElement('button');
      replacement.textContent = 'new';
      f.first.replaceWith(replacement);
      f.setAccept(true);
      f.ready();
      expect(f.applied).toEqual([{ target: replacement, options: { preventScroll: true } }]);
      expect(document.activeElement).toBe(replacement);
    } finally {
      await f.cleanup();
    }
  });
  it('retained detach preserves rejected entry intent until a replacement view mounts', async () => {
    const f = await fixture();
    try {
      f.entry.focus({ reason: 'keyboard' });
      await f.session.unmount();
      f.setRoot(null);
      f.ready();
      expect(f.applied).toHaveLength(0);
      const replacementRoot = document.createElement('div');
      const replacement = document.createElement('button');
      replacement.textContent = 'new epoch';
      replacementRoot.append(replacement);
      document.body.append(replacementRoot);
      f.setRoot(replacementRoot);
      f.setAccept(true);
      await f.session.mount();
      f.ready();
      expect(f.applied).toEqual([{ target: replacement, options: { reason: 'keyboard' } }]);
    } finally {
      await f.cleanup();
    }
  });
  it('terminal disposal removes readiness subscription and never replays rejected entry', async () => {
    const f = await fixture();
    try {
      f.entry.focus();
      expect(f.listeners.size).toBe(1);
      await f.session.dispose();
      expect(f.listeners.size).toBe(0);
      f.setAccept(true);
      f.ready();
      expect(f.applied).toHaveLength(0);
    } finally {
      await f.cleanup();
    }
  });
  it('a later no-target policy result ends earlier rejected entry intent', async () => {
    const f = await fixture();
    try {
      f.entry.focus();
      f.first.remove();
      f.entry.focus();
      f.initialRoot.append(f.first);
      f.setAccept(true);
      f.ready();
      expect(f.applied).toHaveLength(0);
    } finally {
      await f.cleanup();
    }
  });
  it('entry disable does not cancel a pending target request on a dual-role instance', async () => {
    const f = await fixture(true);
    try {
      f.focusable!.focus({ reason: 'keyboard' });
      f.entry.setDisabled(true);
      f.setAccept(true);
      f.ready();
      expect(f.applied.map((x) => x.target)).toEqual([f.initialRoot]);
      expect(f.focusable!.focused.get()).toBe(true);
    } finally {
      await f.cleanup();
    }
  });
  it('a newer entry request replaces pending target acquisition on a dual-role instance', async () => {
    const f = await fixture(true);
    try {
      f.focusable!.focus({ reason: 'keyboard' });
      f.entry.focus({ reason: 'pointer' });
      f.setAccept(true);
      f.ready();
      expect(f.applied.map((x) => x.target)).toEqual([f.first]);
      expect(f.focusable!.focused.get()).toBe(false);
    } finally {
      await f.cleanup();
    }
  });
});
it('a newer target request replaces rejected entry acquisition on a dual-role instance', async () => {
  const f = await fixture(true);
  try {
    f.entry.focus({ reason: 'pointer' });
    f.focusable!.focus({ reason: 'keyboard' });
    f.setAccept(true);
    f.ready();
    expect(f.applied.map((x) => x.target)).toEqual([f.initialRoot]);
    expect(f.focusable!.focused.get()).toBe(true);
  } finally {
    await f.cleanup();
  }
});
it('explicit blur cancels a rejected entry acquisition on a dual-role instance', async () => {
  const f = await fixture(true);
  try {
    f.entry.focus();
    f.focusable!.blur();
    f.setAccept(true);
    f.ready();
    expect(f.applied).toHaveLength(0);
  } finally {
    await f.cleanup();
  }
});
it('a newer entry request during retained detach supersedes the previous rejected entry options', async () => {
  const f = await fixture();
  try {
    f.entry.focus({ reason: 'keyboard', preventScroll: true });
    await f.session.unmount();
    f.setRoot(null);
    f.entry.focus({ reason: 'pointer', preventScroll: false });
    f.setRoot(f.initialRoot);
    f.setAccept(true);
    await f.session.mount();
    f.ready();
    expect(f.applied).toEqual([
      { target: f.first, options: { reason: 'pointer', preventScroll: false } },
    ]);
  } finally {
    await f.cleanup();
  }
});
it('does not introduce a pending entry for a first request with no current root', async () => {
  const f = await fixture();
  try {
    f.setRoot(null);
    f.entry.focus({ reason: 'keyboard' });
    f.setRoot(f.initialRoot);
    f.setAccept(true);
    f.ready();
    expect(f.applied).toHaveLength(0);
  } finally {
    await f.cleanup();
  }
});
