import { definePrototype, tw } from '@proto.ui/core';
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
        'inline-flex shrink-0 items-center justify-center rounded-full border px-5 py-2 text-sm font-medium whitespace-nowrap select-none cursor-pointer shadow-sm bg-secondary text-secondary-foreground'
      )
    );
    // Selection never changes border width or material geometry. Underline also
    // distinguishes the persistent selection without relying on color or tint.
    def.rule({
      when: (w) => w.state(active).eq(false),
      intent: (i) => i.feedback.style.use(tw('border-border no-underline')),
    });
    def.rule({
      when: (w) => w.state(active).eq(true),
      intent: (i) => i.feedback.style.use(tw('border-ring underline')),
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
    // Both active states request the same regular material. The existing API
    // has no selected-tint intent; do not fake it by changing fallback colors.
    for (const phase of [false, true])
      def.rule({
        when: (w) =>
          w.all(
            w.prop('material').eq('auto'),
            w.state(disabled).eq(false),
            w.state(pressed).eq(phase)
          ),
        intent: (i) =>
          i.feedback.material.use({
            intent: 'liquid-glass',
            variant: 'regular',
            deformation: { kind: 'press', phase: phase ? 'pressed' : 'rest', contact: 'pointer' },
          }),
      });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('outline-none ring-2 ring-ring ring-offset-2 ring-offset-background')
        ),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) =>
        i.feedback.style.use(tw('opacity-50 pointer-events-none cursor-default shadow-none')),
    });
  },
});
