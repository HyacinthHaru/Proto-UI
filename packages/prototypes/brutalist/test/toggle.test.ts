import { describe, expect, it } from 'vitest';
import type { A11ySemanticObjectSnapshot } from '@proto.ui/core';
import type { RuntimeHost } from '@proto.ui/runtime';
import { executeWithHost } from '@proto.ui/runtime';
import {
  FOCUS_REQUEST_FOCUS_CAP,
  FOCUS_ROOT_TARGET_CAP,
  FOCUS_SET_FOCUSABLE_CAP,
} from '@proto.ui/module-focus';
import {
  EVENT_EMIT_CAP,
  EVENT_GLOBAL_TARGET_CAP,
  EVENT_ROOT_TARGET_CAP,
} from '@proto.ui/module-event';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import { A11Y_PROJECT_CAP } from '@proto.ui/module-a11y';
import toggle from '../src/toggle';

describe('prototypes/brutalist: toggle', () => {
  it('maps active disabled and size state to Neo-Brutalist tokens', () => {
    let rawProps: Record<string, unknown> = {
      size: 'default',
      defaultActive: false,
      disabled: false,
    };
    const rootTarget = new EventTarget();
    const globalTarget = new EventTarget();
    const activeChanges: Array<{ active: boolean }> = [];
    const a11ySnapshots: A11ySemanticObjectSnapshot[] = [];

    const host: RuntimeHost<any> = {
      prototypeName: 'x-brutalist-toggle-style',
      getRawProps() {
        return rawProps as any;
      },
      commit(_children, signal) {
        signal?.done();
      },
      schedule(task) {
        task();
      },
      onRuntimeReady(wiring) {
        wiring.attach('event', [
          [EVENT_ROOT_TARGET_CAP, () => rootTarget],
          [EVENT_GLOBAL_TARGET_CAP, () => globalTarget],
          [
            EVENT_EMIT_CAP,
            (key: string, payload: unknown) => {
              if (key === 'activeChange') activeChanges.push(payload as { active: boolean });
            },
          ],
        ]);
        wiring.attach('focus', [
          [FOCUS_ROOT_TARGET_CAP, () => rootTarget],
          [FOCUS_SET_FOCUSABLE_CAP, () => undefined],
          [FOCUS_REQUEST_FOCUS_CAP, () => undefined],
        ]);
        wiring.attach('as-trigger', [
          [AS_TRIGGER_INSTANCE_CAP, rootTarget],
          [AS_TRIGGER_PARENT_CAP, () => null],
          [AS_TRIGGER_GET_PROTO_CAP, () => null],
        ]);
        wiring.attach('a11y', [
          [
            A11Y_PROJECT_CAP,
            (snapshot: A11ySemanticObjectSnapshot) => a11ySnapshots.push(snapshot),
          ],
        ]);
      },
    };

    const { controller } = executeWithHost(toggle as any, host as any);

    expect(toggle.name).toBe('brutalist-toggle');
    expect((toggle as any).__asHooks).toContainEqual(
      expect.objectContaining({ name: 'as-toggle', mode: 'once' })
    );

    let tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('rounded-none');
    expect(tokens).toContain('border-2');
    expect(tokens).toContain('shadow-[3px_3px_0_0_#000]');
    expect(tokens).toContain('h-10');

    rootTarget.dispatchEvent(new CustomEvent('press.commit'));
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-main');
    expect(tokens).toContain('text-main-foreground');
    expect(activeChanges).toEqual([{ active: true }]);
    expect(a11ySnapshots.at(-1)).toMatchObject({
      role: 'button',
      states: { pressed: true, disabled: false },
    });

    rawProps = { size: 'sm', defaultActive: false, disabled: true };
    controller.applyRawProps(rawProps as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('h-9');
    expect(tokens).toContain('opacity-50');
  });
});
