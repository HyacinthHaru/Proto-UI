import { definePrototype, tw, delay } from '@proto.ui/core';
import { asToggle } from '@proto.ui/prototypes-base/toggle';
import type { ToggleProjectionProps, ToggleExposes } from './types';

// Proto design-language extension, not an Apple component or shader equivalence.
// Active selection and transient pressing remain separate Base-owned facts.
export default definePrototype<ToggleProjectionProps, ToggleExposes>({
  name: 'liquid-glass-toggle',
  setup(def) {
    def.props.define({
      material: { type: 'enum', options: ['auto', 'opaque'], empty: 'fallback' },
    });
    def.props.setDefaults({ material: 'auto' });
    const state = asToggle().stateHandles;
    if (!state) throw new Error('[liquid-glass-toggle] Base Toggle states are required.');
    const { active, pressed, hovered, focusVisible, disabled } = state;
    def.feedback.style.use(
      tw(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-medium whitespace-nowrap select-none cursor-pointer shadow-sm bg-secondary text-secondary-foreground'
      )
    );
    // Selection never changes border width or material geometry. A reserved
    // decorative glyph below distinguishes selection without color or text decoration.
    def.rule({
      when: (w) => w.state(active).eq(false),
      intent: (i) => i.feedback.style.use(tw('border-border')),
    });
    def.rule({
      when: (w) => w.state(active).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-primary text-primary-foreground border-ring')),
    });
    def.rule({
      when: (w) =>
        w.all(w.state(hovered).eq(true), w.state(pressed).eq(false), w.state(disabled).eq(false)),
      intent: (i) => i.feedback.style.use(tw('shadow-md')),
    });
    def.rule({
      when: (w) => w.all(w.state(pressed).eq(true), w.state(disabled).eq(false)),
      intent: (i) => i.feedback.style.use(tw('shadow-xs')),
    });
    def.feedback.material.declare({
      version: 2,
      shape: { kind: 'rounded-rect', geometry: 'style' },
      source: { kind: 'in-app-backdrop' },
      fallback: { fill: 'style', foreground: 'style' },
    });
    // Selection colors remain governed final style. The optional whole-value
    // tint requests host realization; unsupported hosts keep the same state's
    // readable opaque pair instead of silently rendering neutral glass.
    for (const selected of [false, true])
      for (const phase of [false, true])
        def.rule({
          when: (w) =>
            w.all(
              w.prop('material').eq('auto'),
              w.state(disabled).eq(false),
              w.state(active).eq(selected),
              w.state(pressed).eq(phase)
            ),
          intent: (i) =>
            i.feedback.material.use({
              intent: 'liquid-glass',
              variant: 'regular',
              ...(selected ? { tint: 'style-fill' as const } : {}),
              deformation: { kind: 'press', phase: phase ? 'pressed' : 'rest', contact: 'pointer' },
            }),
        });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('forced-colors-focus-outline ring-2 ring-ring ring-offset-2 ring-offset-background')
        ),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      // Keep the declared fallback opaque. Whole-host opacity would make its
      // fill/foreground depend on the backdrop and fail shared-provider admission.
      intent: (i) => i.feedback.style.use(tw('pointer-events-none cursor-default shadow-none')),
    });
    // The ordinary template owns only this decorative marker. Reserve its space
    // in both states, preserving slotted content, naming and the Base root owner.
    let renderTask: { cancel(): void } | null = null;
    active.watch((run, event) => {
      if (event.type !== 'next') return;
      renderTask?.cancel();
      renderTask = delay(0, () => {
        renderTask = null;
        run.update();
      });
    });
    def.lifecycle.onUnmounted(() => {
      renderTask?.cancel();
      renderTask = null;
    });
    return (renderer) => [
      renderer.slot(),
      renderer.el(
        'span',
        { style: tw('pointer-events-none flex size-3 shrink-0 items-center justify-center') },
        renderer.svg.root(
          {
            viewBox: '0 0 16 16',
            width: '100%',
            height: '100%',
            'aria-hidden': 'true',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            opacity: active.get() ? 1 : 0,
          },
          renderer.svg.path({ d: 'm13 4-7 8-3-3' })
        )
      ),
    ];
  },
});
