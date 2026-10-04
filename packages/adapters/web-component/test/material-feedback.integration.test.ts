import { describe, it, expect } from 'vitest';
import { definePrototype, tw } from '@proto.ui/core';
import { asButton } from '@proto.ui/prototypes-base/button';
import { AdaptToWebComponent, setElementProps } from '../src';
import { installExperimentalVisualConsumer } from '../src/runtime/experimental-visual-consumer';
import type { FinalStyleFrame } from '../../../modules/feedback/src/material/final-style-sink';
import button from '../../../../experiments/material-specializer/button.proto';
import { createOpaqueMaterialVisualSink } from '../src/material/owned-texture-sink';
import { createOwnedTwTokenApplier } from '../src/feedback-style';
import { finalStyleFrame } from '../../../modules/feedback/src/material/final-style-sink';
import type { OwnedMaterialConfig } from '../../../modules/feedback/src/material/owned-slot';
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
let id = 0;

describe('private material through real WC and Feedback', () => {
  it('preserves authored positioning and restores a whole ordinary style on a slot tombstone', () => {
    const host = document.createElement('div');
    Object.assign(host.style, {
      position: 'absolute',
      color: 'rgb(0, 0, 0)',
      background: 'rgb(20, 40, 60)',
      isolation: 'auto',
    });
    document.body.append(host);
    const sink = createOpaqueMaterialVisualSink(host, createOwnedTwTokenApplier(host));
    const material = {
      config: button.modules![0].config as OwnedMaterialConfig,
      pressed: false,
      disabled: false,
      bindingsReady: true,
    };
    sink.commit(finalStyleFrame(tw('rounded-full'), 1, 1, material));
    expect(host.style.position).toBe('absolute');
    expect(host.dataset.materialQuality).toBe('opaque-fallback');
    sink.commit(finalStyleFrame(tw('bg-blue-500 text-white'), 1, 2, null));
    expect(host.style.position).toBe('absolute');
    expect(host.style.background).toBe('rgb(20, 40, 60)');
    expect(host.style.color).toBe('rgb(0, 0, 0)');
    expect(host.style.isolation).toBe('auto');
    expect(host.dataset.materialQuality).toBeUndefined();
    expect(host.getAttribute('data-pui-style')).toContain('bg-blue-500');
    sink.release(1);
    host.remove();
  });
  it('rejects an unreadable fallback as a whole and preserves text, focus and disabled semantics', async () => {
    const C = AdaptToWebComponent(button, { registerAs: `material-button-${++id}` });
    const el = new C();
    el.textContent = 'Continue';
    Object.assign(el.style, {
      color: 'rgb(255, 255, 255)',
      background: 'rgb(20, 40, 60)',
      position: 'fixed',
    });
    document.body.append(el);
    await settle();
    expect(el.dataset.materialQuality).toBe('unavailable');
    expect(el.dataset.materialReason).toBe('complete-readable-fallback-unavailable');
    expect(el.style.background).toBe('rgb(20, 40, 60)');
    expect(el.style.color).toBe('rgb(255, 255, 255)');
    expect(el.style.position).toBe('fixed');
    expect(el.textContent).toBe('Continue');
    el.getExposes().focusSelf();
    await settle();
    expect(document.activeElement).toBe(el);
    setElementProps(el, { disabled: true });
    await settle();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
    expect(el.getExposes().disabled.get()).toBe(true);
    expect(el.getExposes().pressed.get()).toBe(false);
    el.remove();
    await settle();
  });
  it('delivers Base pointer/disabled state through Feedback and releases its view', async () => {
    const frames: FinalStyleFrame[] = [];
    let released = 0;
    const off = installExperimentalVisualConsumer(button, () => ({
      commit(frame) {
        frames.push(frame);
      },
      release() {
        released++;
      },
    }));
    const C = AdaptToWebComponent(button, { registerAs: `material-button-${++id}` });
    const el = new C();
    el.textContent = 'Continue';
    el.style.color = 'rgb(0, 0, 0)';
    document.body.append(el);
    await settle();
    expect(frames.at(-1)?.material?.bindingsReady).toBe(true);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
    expect(frames.at(-1)?.material?.pressed).toBe(true);
    setElementProps(el, { disabled: true });
    await settle();
    expect(frames.at(-1)?.material?.disabled).toBe(true);
    expect(frames.at(-1)?.material?.pressed).toBe(false);
    el.remove();
    await settle();
    expect(released).toBe(1);
    off();
  });
  it('installs explicit opaque fallback on generic WC without pretending GPU support', async () => {
    const C = AdaptToWebComponent(button, { registerAs: `material-button-${++id}` });
    const el = new C();
    el.textContent = 'Continue';
    el.style.color = 'rgb(0, 0, 0)';
    document.body.append(el);
    await settle();
    expect(el.dataset.materialQuality).toBe('opaque-fallback');
    expect(el.dataset.materialReason).toBe('material-support-unavailable');
    expect(el.style.background).toContain('239.7');
    expect(el.textContent).toBe('Continue');
    el.remove();
    await settle();
    expect(el.querySelector('canvas')).toBeNull();
  });
  it('retains material-relevant Rule evaluation while unrelated selectors can still lower', async () => {
    const probe = definePrototype({
      name: `material-rule-${++id}`,
      modules: button.modules,
      setup(def) {
        const state = asButton().stateHandles!;
        def.feedback.style.use(tw('rounded-full text-foreground'));
        def.rule({
          when: (w) => w.state(state.pressed).eq(true),
          intent: (i) => i.feedback.style.use(tw('bg-red-500')),
        });
        def.rule({
          when: (w) => w.state(state.hovered).eq(true),
          intent: (i) => i.feedback.style.use(tw('opacity-50')),
        });
      },
    });
    const frames: FinalStyleFrame[] = [];
    const off = installExperimentalVisualConsumer(probe, () => ({
      commit(frame) {
        frames.push(frame);
      },
      release() {},
    }));
    const C = AdaptToWebComponent(probe);
    const el = new C();
    document.body.append(el);
    await settle();
    expect(frames.at(-1)?.style.tokens.some((t) => t.includes(':bg-red-500'))).toBe(false);
    expect(frames.at(-1)?.style.tokens.some((t) => t.includes(':opacity-50'))).toBe(true);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
    await settle();
    expect(frames.at(-1)?.style.tokens).toContain('bg-red-500');
    el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    await settle();
    expect(frames.at(-1)?.style.tokens).not.toContain('bg-red-500');
    el.remove();
    await settle();
    off();
  });
});
