import { describe, expect, it, vi } from 'vitest';
import { createRuntimeSession } from '@proto.ui/runtime';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import { EXPOSE_STATE_SET_EXPOSES_CAP } from '@proto.ui/module-expose-state';
import { EXPOSE_EVENT_SINK_CAP } from '@proto.ui/module-expose-event';
import { A11Y_PROJECT_CAP } from '@proto.ui/module-a11y';
import {
  EFFECTS_CAP,
  VISUAL_FEEDBACK_SINK_CAP,
  type VisualFeedbackFrame,
} from '@proto.ui/module-feedback';
import { collectProtoStyleTokens } from '../../../cli/src/services/prototype-style-tokens';
import {
  renderProtoStyleTokenCss,
  renderProtoShadowStyleTokenCss,
} from '../../../cli/src/services/proto-style-css';
import path from 'node:path';
import toggle from '../src/toggle';
import { THEME } from '../src/theme';
import {
  colorContrast,
  resolvePaletteColor,
  resolveMaterialStyle,
} from '../../../adapters/base/src/material/style';
import { createWebMaterialSink } from '../../../adapters/base/src/material/sink';
import { renderThemeCss } from '../src/theme';

async function fixture(initial: Record<string, unknown> = {}, visual = true) {
  let props = initial,
    exposes: Record<string, any> = {};
  const frames: VisualFeedbackFrame[] = [],
    events: Array<{ key: string; payload: unknown }> = [],
    a11y: any[] = [];
  let tokens: string[] = [];
  const root = new EventTarget(),
    global = new EventTarget(),
    release = vi.fn();
  const session = createRuntimeSession(toggle, {
    prototypeName: toggle.name,
    getRawProps: () => props,
    schedule: (fn) => fn(),
    commit: (_, signal) => signal?.done(),
    onRuntimeReady(w) {
      w.attach('event', [
        [EVENT_ROOT_TARGET_CAP, () => root],
        [EVENT_GLOBAL_TARGET_CAP, () => global],
      ]);
      w.attach('as-trigger', [
        [AS_TRIGGER_INSTANCE_CAP, root],
        [AS_TRIGGER_PARENT_CAP, () => null],
        [AS_TRIGGER_GET_PROTO_CAP, () => null],
      ]);
      w.attach('expose-state', [
        [
          EXPOSE_STATE_SET_EXPOSES_CAP,
          (next: Record<string, any>) => {
            exposes = next;
          },
        ],
      ]);
      w.attach('expose-event', [
        [EXPOSE_EVENT_SINK_CAP, (key: string, payload: unknown) => events.push({ key, payload })],
      ]);
      w.attach('a11y', [[A11Y_PROJECT_CAP, (next: unknown) => a11y.push(next)]]);
      w.attach('feedback', [
        [
          EFFECTS_CAP,
          {
            queueStyle: (style: any) => {
              tokens = [...style.tokens];
            },
            requestFlush() {},
          },
        ],
      ]);
      if (visual)
        w.attach('feedback', [
          [
            VISUAL_FEEDBACK_SINK_CAP,
            { commit: (frame: VisualFeedbackFrame) => frames.push(frame), release },
          ],
        ]);
    },
  });
  await session.mount();
  return {
    root,
    global,
    frames,
    events,
    a11y,
    release,
    session,
    tokens: () => frames.at(-1)?.style.tokens ?? tokens,
    state: () => exposes,
    update(next: Record<string, unknown>) {
      props = next;
      session.controller.applyRawProps(next);
    },
    fire(event: string) {
      root.dispatchEvent(new CustomEvent(event));
    },
  };
}
const candidate = (phase: 'rest' | 'pressed', active = false) => ({
  intent: 'liquid-glass',
  variant: 'regular',
  ...(active ? { tint: 'style-fill' } : {}),
  deformation: { kind: 'press', phase, contact: 'pointer' },
});

describe('Liquid Toggle shared semantic and material projection', () => {
  it.each(
    (['light', 'dark'] as const).flatMap((theme) =>
      [false, true].map((active) => ({ theme, active }))
    )
  )(
    'retains an opaque $theme disabled active=$active fallback through real style translation and the Web sink',
    async ({ theme, active }) => {
      const f = await fixture({ active, disabled: true });
      const host = document.createElement('button');
      host.dataset.theme = theme;
      const sheet = document.createElement('style');
      sheet.textContent =
        renderThemeCss({
          lightSelector: '[data-theme="light"]',
          darkSelector: '[data-theme="dark"]',
        }) +
        // happy-dom does not implement cascade layers. Keep the generated
        // declarations/selectors intact; this does not test layer precedence.
        renderProtoStyleTokenCss([...f.tokens()]).replace(
          /@layer proto-ui \{\n([\s\S]*)\n\}\n$/,
          '$1'
        );
      document.head.append(sheet);
      document.body.append(host);
      // Only the unit DOM's absent layout is injected. CSS, frame, fallback
      // admission and diagnostics come from the real production paths. No GPU
      // or native optical acceptance is claimed by this source-less check.
      const bounds = vi
        .spyOn(host, 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, 0, 120, 38));
      let tokens: string[] = [];
      const sink = createWebMaterialSink(
        host,
        {
          queueStyle(style) {
            tokens = style.tokens;
          },
          requestFlush() {
            host.setAttribute('data-pui-style', tokens.join(' '));
          },
        },
        {
          source: {
            current: () => null,
            subscribe: () => () => {},
            draw() {
              throw new Error('This fallback-only fixture has no source.');
            },
            revoke() {},
            dispose() {},
          },
          palette: {
            current: () => ({ revision: 1, colors: THEME[theme] }),
            subscribe: () => () => {},
          },
        }
      );
      try {
        const frame = f.frames.at(-1)!;
        expect(frame.material.candidates).toEqual([]);
        sink.commit(frame);
        expect(
          host.dataset.materialQuality,
          JSON.stringify({
            reason: host.dataset.materialReason,
            opacity: getComputedStyle(host).opacity,
            color: getComputedStyle(host).color,
            tokens: host.dataset.puiStyle,
          })
        ).toBe('opaque-fallback');
        expect(getComputedStyle(host).opacity).toBe('1');
        expect(getComputedStyle(host).pointerEvents).toBe('none');
        expect(host.style.backgroundImage).toBe('none');
        expect(host.dataset.puiMaterialCarrier).toBeUndefined();
      } finally {
        sink.release(f.frames.at(-1)!.view);
        await f.session.unmount();
        bounds.mockRestore();
        host.remove();
        sheet.remove();
      }
    }
  );
  it.each(['light', 'dark'] as const)(
    'retains complete readable %s material provenance for both selected states',
    async (theme) => {
      const f = await fixture({ active: false });
      const resting = resolveMaterialStyle(f.tokens(), THEME[theme]);
      expect(resting.provenance).toBe('post-patch-complete');
      expect(resting.competingPaint).toEqual([]);
      f.update({ active: true });
      const selected = resolveMaterialStyle(f.tokens(), THEME[theme]);
      expect(selected.provenance).toBe('post-patch-complete');
      expect(resting.fill).toEqual(resolvePaletteColor(THEME[theme].secondary, THEME[theme]));
      expect(selected.fill).toEqual(resolvePaletteColor(THEME[theme].primary, THEME[theme]));
      expect(selected.foreground).toEqual(
        resolvePaletteColor(THEME[theme]['primary-foreground'], THEME[theme])
      );
      expect(colorContrast(selected.fill!, selected.foreground!)).toBeGreaterThanOrEqual(4.5);
      expect(selected.competingPaint).toEqual([]);
      expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', true)]);
      await f.session.unmount();
    }
  );

  it('inherits Base once, keeps persistent selection separate from transient press and declares one slot', async () => {
    const f = await fixture({ defaultActive: true });
    expect((toggle as any).__asHooks.filter((h: any) => h.name === 'as-toggle')).toHaveLength(1);
    expect(f.state().active.get()).toBe(true);
    expect(f.a11y.at(-1)).toMatchObject({
      role: 'button',
      states: { pressed: true, disabled: false },
    });
    expect(f.tokens()).toEqual(
      expect.arrayContaining(['underline', 'border-ring', 'bg-primary', 'text-primary-foreground'])
    );
    expect(f.frames.at(-1)?.material.slot).toMatchObject({
      version: 2,
      source: { kind: 'in-app-backdrop' },
      fallback: { fill: 'style', foreground: 'style' },
    });
    expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', true)]);
    f.fire('pointer.down');
    expect(f.state().active.get()).toBe(true);
    expect(f.state().pressed.get()).toBe(true);
    expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('pressed', true)]);
    f.fire('pointer.up');
    f.fire('press.commit');
    expect(f.state().active.get()).toBe(false);
    expect(f.events).toEqual([{ key: 'activeChange', payload: { active: false } }]);
    expect(f.tokens()).not.toContain('underline');
    expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest')]);
    await f.session.unmount();
    expect(f.release).toHaveBeenCalledTimes(1);
  });
  it('retains controlled rejection until a later owner update and preserves material', async () => {
    const f = await fixture({ active: false });
    f.fire('press.commit');
    expect(f.events).toEqual([{ key: 'activeChange', payload: { active: true } }]);
    expect(f.state().active.get()).toBe(false);
    f.update({ active: false });
    expect(f.state().active.get()).toBe(false);
    f.update({ active: true });
    expect(f.state().active.get()).toBe(true);
    expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', true)]);
    f.update({});
    f.fire('press.commit');
    expect(f.state().active.get()).toBe(false);
    await f.session.unmount();
  });
  it.each([false, true])(
    'keeps active=%s glass through focus/press and cancels only transient interaction',
    async (active) => {
      const f = await fixture({ active });
      f.global.dispatchEvent(new CustomEvent('key.down'));
      f.fire('host:focus');
      expect(f.tokens()).toContain('ring-2');
      f.fire('pointer.enter');
      f.fire('pointer.down');
      f.fire('pointer.cancel');
      expect(f.state().active.get()).toBe(active);
      expect(f.state().pressed.get()).toBe(false);
      expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', active)]);
      f.fire('pointer.down');
      f.update({ active, disabled: true });
      expect(f.state().pressed.get()).toBe(false);
      expect(f.state().hovered.get()).toBe(false);
      expect(f.frames.at(-1)?.material.candidates).toEqual([]);
      expect(f.tokens()).not.toContain('opacity-50');
      expect(f.tokens()).toContain('shadow-none');
      expect(f.tokens()).not.toContain('ring-2');
      for (const name of ['pointer.up', 'press.commit', 'pointer.down']) f.fire(name);
      expect(f.events).toHaveLength(0);
      expect(f.state().active.get()).toBe(active);
      f.update({ active });
      expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', active)]);
      expect(f.tokens()).not.toContain('opacity-50');
      await f.session.unmount();
    }
  );
  it('restores auto after true raw prop removal and never replaces opaque fallback', async () => {
    const f = await fixture({ material: 'opaque', active: true });
    expect(f.frames.at(-1)?.material.candidates).toEqual([]);
    expect(f.tokens()).toContain('bg-primary');
    f.update({ active: true });
    expect(f.frames.at(-1)?.material.candidates).toEqual([candidate('rest', true)]);
    f.update({ active: true, material: 'opaque' });
    expect(f.frames.at(-1)?.material.candidates).toEqual([]);
    await f.session.unmount();
    const absent = await fixture({ defaultActive: true }, false);
    expect(absent.tokens()).toEqual(
      expect.arrayContaining(['bg-primary', 'text-primary-foreground', 'underline'])
    );
    await absent.session.unmount();
    const fresh = await fixture();
    expect(fresh.state().active.get()).toBe(false);
    expect(fresh.frames.at(-1)?.material.candidates).toEqual([candidate('rest')]);
    await fresh.session.unmount();
  });
  it('closes extracted style vocabulary without platform recipes or geometry-changing selection', async () => {
    const extracted = await collectProtoStyleTokens(
      path.resolve('packages/prototypes/liquid-glass/src/toggle')
    );
    expect(extracted.every((token) => typeof token === 'string')).toBe(true);
    const tokens = extracted.filter((token): token is string => typeof token === 'string');
    for (const render of [renderProtoStyleTokenCss, renderProtoShadowStyleTokenCss])
      expect(render(tokens)).not.toContain('Unsupported Proto UI style tokens');
    const f = await fixture({ active: false });
    const before = f.tokens().filter((t) => /^(border$|border-\d|p[xylrtb]?-|rounded)/.test(t));
    f.update({ active: true });
    expect(f.tokens().filter((t) => /^(border$|border-\d|p[xylrtb]?-|rounded)/.test(t))).toEqual(
      before
    );
    expect(f.frames.at(-1)?.material.candidates).toHaveLength(1);
    await f.session.unmount();
  });
});
