import { describe, expect, it } from 'vitest';
import type { RuntimeHost } from '@proto.ui/runtime';
import { executeWithHost } from '@proto.ui/runtime';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import { RULE_META_GET_CAP } from '@proto.ui/module-rule-meta';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import button from '../src/button';

function createButtonHost(
  rawPropsRef: { current: Record<string, unknown> },
  colorScheme = 'light'
) {
  const rootTarget = new EventTarget();
  const globalTarget = new EventTarget();
  const host: RuntimeHost<any> = {
    prototypeName: 'x-brutalist-button',
    getRawProps() {
      return rawPropsRef.current as any;
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
      ]);
      wiring.attach('as-trigger', [
        [AS_TRIGGER_INSTANCE_CAP, rootTarget],
        [AS_TRIGGER_PARENT_CAP, () => null],
        [AS_TRIGGER_GET_PROTO_CAP, () => null],
      ]);
      wiring.attach('rule-meta', [
        [RULE_META_GET_CAP, (key: string) => (key === 'colorScheme' ? colorScheme : null)],
      ]);
    },
  };
  return { host, rootTarget };
}

describe('prototypes/brutalist: button', () => {
  it('maps variant and size props to Neo-Brutalist rule style tokens', () => {
    const rawPropsRef: { current: Record<string, unknown> } = {
      current: { variant: 'default', size: 'default', disabled: false },
    };
    const { host } = createButtonHost(rawPropsRef);
    const { controller } = executeWithHost(button as any, host as any);

    expect(button.name).toBe('brutalist-button');
    expect((button as any).__asHooks).toContainEqual(
      expect.objectContaining({ name: 'as-button', mode: 'once' })
    );

    let tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('rounded-none');
    expect(tokens).toContain('border-2');
    expect(tokens).toContain('border-black');
    expect(tokens).toContain('bg-main');
    expect(tokens).toContain('text-main-foreground');
    expect(tokens).toContain('shadow-[5px_5px_0_0_#000]');
    expect(tokens).toContain('h-10');

    rawPropsRef.current = { variant: 'destructive', size: 'lg', disabled: true };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-destructive');
    expect(tokens).toContain('h-12');
    expect(tokens).toContain('opacity-50');

    rawPropsRef.current = { variant: 'outline', size: 'icon', disabled: false };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-secondary-background');
    expect(tokens).toContain('size-10');

    rawPropsRef.current = {};
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-main');
    expect(tokens).toContain('h-10');
    expect(tokens).not.toContain('opacity-50');
  });

  it('derives hover focus press and disabled styling from Base Button state handles', () => {
    const rawPropsRef = { current: { variant: 'default', size: 'default', disabled: false } };
    const { host, rootTarget } = createButtonHost(rawPropsRef);
    const { controller } = executeWithHost(button as any, host as any);

    rootTarget.dispatchEvent(new CustomEvent('pointer.enter'));
    let tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('shadow-[8px_8px_0_0_#000]');
    expect(tokens).toContain('-translate-x-0.5');
    expect(tokens).toContain('-translate-y-0.5');

    rootTarget.dispatchEvent(new CustomEvent('pointer.down'));
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('translate-x-[5px]');
    expect(tokens).toContain('translate-y-[5px]');
    expect(tokens).toContain('shadow-none');

    rawPropsRef.current = { variant: 'default', size: 'default', disabled: true };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('pointer-events-none');
    expect(tokens).toContain('opacity-50');
  });

  it('projects dark color-scheme visual deltas without changing protocol identity', () => {
    const rawPropsRef = { current: { variant: 'outline', size: 'default', disabled: false } };
    const { host } = createButtonHost(rawPropsRef, 'dark');
    const { controller } = executeWithHost(button as any, host as any);

    expect(button.name).toBe('brutalist-button');
    const tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('text-foreground');
    expect(tokens).toContain('ring-ring');
    expect(tokens).not.toContain('rounded-lg');
    expect(tokens).not.toContain('shadow-lg');
  });
});
