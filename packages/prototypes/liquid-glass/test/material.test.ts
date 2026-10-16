import { describe, expect, it, vi } from 'vitest';
import type { StyleHandle } from '@proto.ui/core';
import { createRuntimeSession } from '@proto.ui/runtime';
import {
  EFFECTS_CAP,
  VISUAL_FEEDBACK_SINK_CAP,
  type VisualFeedbackFrame,
} from '@proto.ui/module-feedback';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import button from '../src/button';
async function fixture(props: Record<string, unknown> = {}, visual = true) {
  const frames: VisualFeedbackFrame[] = [],
    styles: StyleHandle[] = [],
    root = new EventTarget(),
    release = vi.fn();
  const session = createRuntimeSession(button, {
    prototypeName: button.name,
    getRawProps: () => props,
    schedule: (fn) => fn(),
    commit: (_children, signal) => signal?.done(),
    onRuntimeReady(wiring) {
      wiring.attach('event', [
        [EVENT_ROOT_TARGET_CAP, () => root],
        [EVENT_GLOBAL_TARGET_CAP, () => new EventTarget()],
      ]);
      wiring.attach('as-trigger', [
        [AS_TRIGGER_INSTANCE_CAP, root],
        [AS_TRIGGER_PARENT_CAP, () => null],
        [AS_TRIGGER_GET_PROTO_CAP, () => null],
      ]);
      wiring.attach('feedback', [
        [
          EFFECTS_CAP,
          { queueStyle: (style: StyleHandle) => styles.push(style), requestFlush() {} },
        ],
      ]);
      if (visual)
        wiring.attach('feedback', [
          [
            VISUAL_FEEDBACK_SINK_CAP,
            { commit: (frame: VisualFeedbackFrame) => frames.push(frame), release },
          ],
        ]);
    },
  });
  await session.mount();
  return {
    frames,
    styles,
    root,
    session,
    release,
    setProps(next: Record<string, unknown>) {
      props = next;
      session.controller.applyRawProps(next);
    },
  };
}
describe('Liquid Glass Button V2 portable intent, not an optical paint claim', () => {
  it('submits one Base-driven optical candidate and complete opaque fallback style', async () => {
    const f = await fixture();
    expect(f.frames.at(-1)?.material.slot?.source).toEqual({ kind: 'in-app-backdrop' });
    expect(f.frames.at(-1)?.style.tokens).toContain('bg-secondary');
    expect(f.frames.at(-1)?.material.candidates).toEqual([
      {
        intent: 'liquid-glass',
        variant: 'regular',
        deformation: { kind: 'press', phase: 'rest', contact: 'pointer' },
      },
    ]);
    f.root.dispatchEvent(new Event('pointer.down'));
    expect(f.frames.at(-1)?.material.candidates).toEqual([
      {
        intent: 'liquid-glass',
        variant: 'regular',
        deformation: { kind: 'press', phase: 'pressed', contact: 'pointer' },
      },
    ]);
    f.root.dispatchEvent(new Event('pointer.up'));
    expect(f.frames.at(-1)?.material.candidates[0]).toMatchObject({
      deformation: { phase: 'rest', contact: 'pointer' },
    });
    expect(
      f.frames
        .flatMap((frame) => frame.style.tokens)
        .some((token) => token.startsWith('backdrop-') || token === 'bg-secondary/80')
    ).toBe(false);
    await f.session.dispose();
    expect(f.release).toHaveBeenCalled();
  });
  // The earlier draft grouped prominent with opaque as zero-candidate choices.
  // The 2026-10-15 main-command tint revision changes only enabled prominent auto.
  it('prominent auto supplies exactly one complete style-fill candidate through repeated exits', async () => {
    const f = await fixture({ variant: 'prominent' });
    const candidate = (phase: 'rest' | 'pressed') => [
      {
        intent: 'liquid-glass',
        variant: 'regular',
        tint: 'style-fill',
        deformation: { kind: 'press', phase, contact: 'pointer' },
      },
    ];
    try {
      expect(f.frames.at(-1)?.material.candidates).toEqual(candidate('rest'));
      expect(f.frames.at(-1)?.material.slot?.fallback).toEqual({
        fill: 'style',
        foreground: 'style',
      });
      expect(f.frames.at(-1)?.style.tokens).toEqual(
        expect.arrayContaining(['bg-primary', 'text-primary-foreground'])
      );
      for (const exit of [
        'pointer.up',
        'pointer.leave',
        'pointer.cancel',
        'press.cancel',
        'press.commit',
      ]) {
        f.root.dispatchEvent(new Event('pointer.enter'));
        expect(f.frames.at(-1)?.material.candidates).toEqual(candidate('rest'));
        f.root.dispatchEvent(new Event('pointer.down'));
        expect(f.frames.at(-1)?.material.candidates).toEqual(candidate('pressed'));
        f.root.dispatchEvent(new Event(exit));
        expect(f.frames.at(-1)?.material.candidates).toEqual(candidate('rest'));
      }
      expect(f.frames.every((frame) => frame.material.candidates.length <= 1)).toBe(true);
    } finally {
      await f.session.dispose();
    }
  });
  it.each(['regular', 'prominent'] as const)(
    '%s opaque and disabled preserve zero candidates and the complete same-variant fallback',
    async (variant) => {
      const f = await fixture({ variant, material: 'opaque' });
      const pair =
        variant === 'prominent'
          ? ['bg-primary', 'text-primary-foreground']
          : ['bg-secondary', 'text-secondary-foreground'];
      try {
        for (const props of [
          { variant, material: 'opaque' },
          { variant, disabled: true },
        ]) {
          f.setProps(props);
          f.root.dispatchEvent(new Event('pointer.down'));
          expect(f.frames.at(-1)?.material.candidates).toEqual([]);
          expect(f.frames.at(-1)?.style.tokens).toEqual(expect.arrayContaining(pair));
        }
      } finally {
        await f.session.dispose();
      }
    }
  );
  it('real prop removal restores neutral regular, and material removal restores current-variant auto', async () => {
    const f = await fixture({ variant: 'prominent', material: 'opaque' });
    const neutral = (phase: 'rest' | 'pressed') => ({
      intent: 'liquid-glass',
      variant: 'regular',
      deformation: { kind: 'press', phase, contact: 'pointer' },
    });
    try {
      expect(f.frames.at(-1)?.material.candidates).toEqual([]);
      f.setProps({ variant: 'prominent' });
      expect(f.frames.at(-1)?.material.candidates).toEqual([
        { ...neutral('rest'), tint: 'style-fill' },
      ]);
      f.root.dispatchEvent(new Event('pointer.down'));
      f.setProps({});
      expect(f.frames.at(-1)?.material.candidates).toEqual([neutral('pressed')]);
      expect(f.frames.at(-1)?.style.tokens).toEqual(
        expect.arrayContaining(['bg-secondary', 'text-secondary-foreground'])
      );
      expect(f.frames.at(-1)?.style.tokens).not.toContain('bg-primary');
      f.setProps({ variant: 'prominent' });
      expect(f.frames.at(-1)?.material.candidates).toEqual([
        { ...neutral('pressed'), tint: 'style-fill' },
      ]);
      f.root.dispatchEvent(new Event('pointer.up'));
      f.setProps({ material: 'opaque' });
      expect(f.frames.at(-1)?.material.candidates).toEqual([]);
      f.setProps({});
      expect(f.frames.at(-1)?.material.candidates).toEqual([neutral('rest')]);
      expect(f.frames.every((frame) => frame.material.candidates.length <= 1)).toBe(true);
    } finally {
      await f.session.dispose();
    }
  });
  it.each(['regular', 'prominent'] as const)(
    '%s without a provider retains source-owned complete opaque style',
    async (variant) => {
      const f = await fixture({ variant }, false);
      try {
        expect(f.styles.at(-1)?.tokens).toEqual(
          expect.arrayContaining(
            variant === 'prominent'
              ? ['bg-primary', 'text-primary-foreground']
              : ['bg-secondary', 'text-secondary-foreground']
          )
        );
      } finally {
        await f.session.dispose();
      }
    }
  );
  it.each(['regular', 'prominent'] as const)(
    '%s disabled Base state resets press and remount obtains a fresh visual lease',
    async (variant) => {
      const f = await fixture({ variant });
      const rest = {
        intent: 'liquid-glass',
        variant: 'regular',
        ...(variant === 'prominent' ? { tint: 'style-fill' } : {}),
        deformation: { kind: 'press', phase: 'rest', contact: 'pointer' },
      };
      try {
        f.root.dispatchEvent(new Event('pointer.down'));
        f.setProps({ variant, disabled: true });
        expect(f.frames.at(-1)?.material.candidates).toEqual([]);
        await f.session.unmount();
        expect(f.release).toHaveBeenCalledOnce();
        await f.session.mount();
        expect(f.frames.at(-1)?.material.candidates).toEqual([]);
        f.setProps({ variant });
        expect(f.frames.at(-1)?.material.candidates).toEqual([rest]);
        f.root.dispatchEvent(new Event('pointer.down'));
        await f.session.unmount();
        await f.session.mount();
        expect(f.frames.at(-1)?.material.candidates).toEqual([rest]);
      } finally {
        await f.session.dispose();
      }
    }
  );
});
