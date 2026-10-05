import { describe, expect, it, vi } from 'vitest';
import { definePrototype, type Prototype } from '@proto.ui/core';
import { asFocusEntry, asFocusable } from '@proto.ui/hooks';

type Mounted = {
  root: HTMLElement;
  getExposes(): any;
  act(callback: () => void): Promise<void>;
  unmount(): Promise<void>;
};

// Real framework/Adapter/Focus, with only host rejection and frame delivery
// controlled. HC-FOCUS-TARGET-0001-C and C-AS-FOCUSABLE-0001-G require both
// bounded same-intent replay and a fresh budget for a newer explicit intent.
export function focusIntentRetryConformance(
  adapter: string,
  mount: (proto: Prototype<any, any>) => Promise<Mounted>
) {
  describe(`${adapter}: stable focus intent retry identity`, () => {
    for (const kind of ['entry', 'native', 'programmatic'] as const) {
      it.each(['omitted', 'reused'] as const)(
        `${kind} renews only explicit intent with %s options`,
        async (optionsMode) => {
          const sharedOptions =
            optionsMode === 'reused' ? Object.freeze({ preventScroll: true }) : undefined;
          const proto = definePrototype({
            name: `retry-${adapter}-${kind}-${optionsMode}`,
            setup(def) {
              const target = asFocusable();
              def.expose.state('focused', target.focused);
              const entry = asFocusEntry();
              entry.configure({ strategy: 'descendant-first', fallback: 'none' });
              def.expose.method('request', () => {
                if (kind === 'entry') entry.focus(sharedOptions);
                else if (kind === 'native') target.focusSelf(sharedOptions);
                else target.focus(sharedOptions);
              });
              return (r) => r.el('button', 'Requested descendant');
            },
          });
          const mounted = await mount(proto);
          const frames: FrameRequestCallback[] = [];
          const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            frames.push(callback);
            return frames.length;
          });
          const target = kind === 'entry' ? mounted.root.querySelector('button')! : mounted.root;
          const nativeFocus = target.focus.bind(target);
          let rejected = true;
          let rejectNext = false;
          let throwNext = false;
          const attempts: boolean[] = [];
          const focus = vi.spyOn(target, 'focus').mockImplementation((options) => {
            if (throwNext) {
              throwNext = false;
              throw new Error('controlled native focus failure');
            }
            const reject = rejected || rejectNext;
            rejectNext = false;
            attempts.push(!reject);
            if (!reject) nativeFocus(options);
          });
          const flushFrames = async () => {
            for (let round = 0; frames.length && round < 12; round++) {
              const callbacks = frames.splice(0);
              await mounted.act(() => callbacks.forEach((callback) => callback(performance.now())));
            }
            expect(frames).toHaveLength(0);
          };
          try {
            await mounted.act(() => mounted.getExposes().request());
            await flushFrames();
            expect(attempts).toEqual([false, false, false, false]);
            expect(document.activeElement).not.toBe(target);
            attempts.length = 0;
            const beforeThrow = focus.mock.calls.length;
            throwNext = true;
            await expect(mounted.act(() => mounted.getExposes().request())).rejects.toThrow(
              'controlled native focus failure'
            );
            expect(focus).toHaveBeenCalledTimes(beforeThrow + 1);
            expect(mounted.getExposes().focused.get()).toBe(false);
            expect(frames).toHaveLength(0);
            expect(document.activeElement).not.toBe(target);
            rejected = false;
            rejectNext = true;
            await mounted.act(() => mounted.getExposes().request());
            await flushFrames();
            expect(attempts).toEqual([false, true]);
            expect(document.activeElement).toBe(target);
            await mounted.act(() => target.blur());
            attempts.length = 0;
            rejected = true;
            await mounted.act(() => mounted.getExposes().request());
            await flushFrames();
            expect(attempts).toEqual([false, false, false, false]);
            // Supersede before queued work delivers. Old callbacks cannot extend
            // the newer intent's initial attempt plus three retries.
            attempts.length = 0;
            await mounted.act(() => {
              mounted.getExposes().request();
              mounted.getExposes().request();
            });
            await flushFrames();
            expect(attempts).toEqual([false, false, false, false, false]);
          } finally {
            focus.mockRestore();
            raf.mockRestore();
            await mounted.unmount();
          }
        }
      );
    }

    it.each(['entry', 'native', 'programmatic'] as const)(
      'preserves an exhausted %s layout budget across ordinary same-view commits',
      async (kind) => {
        let run: any;
        const proto = definePrototype({
          name: `retry-${adapter}-ordinary-commit-${kind}`,
          setup(def) {
            const target = asFocusable();
            const entry = asFocusEntry();
            entry.configure({ strategy: 'descendant-first', fallback: 'none' });
            def.lifecycle.onCreated((value) => {
              run = value;
            });
            def.expose.method('request', () => {
              if (kind === 'entry') entry.focus();
              else if (kind === 'native') target.focusSelf();
              else target.focus();
            });
            def.expose.method('update', () => run.update());
            return (r) => r.el('button', 'Rejected through unrelated commits');
          },
        });
        const mounted = await mount(proto);
        const root = mounted.root;
        const currentTarget = () =>
          kind === 'entry' ? mounted.root.querySelector('button')! : mounted.root;
        const frames: FrameRequestCallback[] = [];
        const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
          frames.push(callback);
          return frames.length;
        });
        const focus = HTMLElement.prototype.focus;
        let attempts = 0;
        let accept = false;
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
          this: HTMLElement,
          options?: FocusOptions
        ) {
          if (this !== currentTarget()) {
            focus.call(this, options);
            return;
          }
          attempts++;
          if (accept) focus.call(this, options);
        });
        const flushFrames = async () => {
          for (let round = 0; frames.length && round < 12; round++) {
            const callbacks = frames.splice(0);
            await mounted.act(() => callbacks.forEach((callback) => callback(performance.now())));
          }
          expect(frames).toHaveLength(0);
        };
        try {
          await mounted.act(() => mounted.getExposes().request());
          await flushFrames();
          expect(attempts).toBe(4);
          for (let update = 0; update < 3; update++) {
            await mounted.act(() => mounted.getExposes().update());
            expect(mounted.root).toBe(root);
            // A commit can make a direct readiness attempt. It cannot replenish
            // the three-frame budget for the same pending intent/view epoch.
            expect(frames).toHaveLength(0);
          }
          attempts = 0;
          await mounted.act(() => mounted.getExposes().request());
          await flushFrames();
          expect(attempts).toBe(4);
          accept = true;
          await mounted.act(() => mounted.getExposes().request());
          expect(document.activeElement).toBe(currentTarget());
        } finally {
          focusSpy.mockRestore();
          raf.mockRestore();
          await mounted.unmount();
        }
      }
    );

    it.each(['entry', 'native', 'programmatic'] as const)(
      'ignores old-view frames after a retained replacement and a newer %s intent',
      async (kind) => {
        let run: any;
        const proto = definePrototype({
          name: `retry-${adapter}-retained-${kind}`,
          setup(def) {
            const target = asFocusable();
            def.expose.state('focused', target.focused);
            const entry = asFocusEntry();
            entry.configure({ strategy: 'descendant-first', fallback: 'none' });
            def.lifecycle.onCreated((value) => {
              run = value;
            });
            def.expose.method('request', () => {
              if (kind === 'entry') entry.focus();
              else if (kind === 'native') target.focusSelf();
              else target.focus();
            });
            def.expose('view', {
              hide: () => run.lifecycle.setPresent(false),
              show: () => run.lifecycle.setPresent(true),
            });
            return (r) => r.el('button', 'Replacement target');
          },
        });
        const mounted = await mount(proto);
        const currentTarget = () =>
          kind === 'entry' ? mounted.root.querySelector('button')! : mounted.root;
        const frames: FrameRequestCallback[] = [];
        const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
          frames.push(callback);
          return frames.length;
        });
        const oldFocus = vi.spyOn(currentTarget(), 'focus').mockImplementation(() => {});
        let nextFocus: ReturnType<typeof vi.spyOn> | undefined;
        try {
          await mounted.act(() => mounted.getExposes().request());
          expect(frames.length).toBeGreaterThan(0);
          await mounted.act(() => mounted.getExposes().view.hide());
          oldFocus.mockRestore();
          await mounted.act(() => mounted.getExposes().view.show());
          await mounted.act(() => {});
          const replacement = currentTarget();
          await mounted.act(() => replacement.blur());
          nextFocus = vi.spyOn(replacement, 'focus').mockImplementation(() => {});
          await mounted.act(() => mounted.getExposes().request());
          for (let round = 0; frames.length && round < 16; round++) {
            const callbacks = frames.splice(0);
            await mounted.act(() => callbacks.forEach((callback) => callback(performance.now())));
          }
          expect({ attempts: nextFocus.mock.calls.length, queued: frames.length }).toEqual({
            attempts: 4,
            queued: 0,
          });
        } finally {
          oldFocus.mockRestore();
          nextFocus?.mockRestore();
          raf.mockRestore();
          await mounted.unmount();
        }
      }
    );

    it('keeps descendant rejection bounded while the independent root stays focused', async () => {
      const proto = definePrototype({
        name: `retry-${adapter}-dual-role-root`,
        setup(def) {
          const target = asFocusable();
          const entry = asFocusEntry();
          entry.configure({ strategy: 'descendant-first', fallback: 'none' });
          def.expose.method('focusRoot', () => target.focus());
          def.expose.method('enter', () => entry.focus());
          return (r) => r.el('button', 'Rejected descendant');
        },
      });
      const mounted = await mount(proto);
      await mounted.act(() => mounted.getExposes().focusRoot());
      expect(document.activeElement).toBe(mounted.root);
      const frames: FrameRequestCallback[] = [];
      const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      const focus = vi
        .spyOn(mounted.root.querySelector('button')!, 'focus')
        .mockImplementation(() => {});
      try {
        await mounted.act(() => mounted.getExposes().enter());
        for (let round = 0; frames.length && round < 12; round++) {
          const callbacks = frames.splice(0);
          await mounted.act(() => callbacks.forEach((callback) => callback(performance.now())));
        }
        expect({ attempts: focus.mock.calls.length, queued: frames.length }).toEqual({
          attempts: 4,
          queued: 0,
        });
        expect(document.activeElement).toBe(mounted.root);
      } finally {
        focus.mockRestore();
        raf.mockRestore();
        await mounted.unmount();
      }
    });
  });
}
