import {
  COMMAND_HOVER,
  COMMAND_PRESS,
  COMMAND_FOCUS,
  COMMAND_DISABLED,
} from '../interactive-surface';
import { definePrototype, tw } from '@proto.ui/core';
import { asFormReset, type FormActionExposes } from '@proto.ui/prototypes-base/form';
import type { LiquidGlassFormActionProps } from './types';
// Passive liquid-glass Button paint; Base Form remains the sole action owner.
// Keep rules in the owning setup so source lowering can resolve the actual borrowed states.
export default definePrototype<LiquidGlassFormActionProps, FormActionExposes>({
  name: 'liquid-glass-form-reset',
  setup(def) {
    const inherited = asFormReset();
    const state = inherited.stateHandles!;
    def.props.define({
      material: { type: 'enum', options: ['auto', 'opaque'], empty: 'fallback' },
    });
    def.props.setDefaults({ material: 'auto' });
    def.feedback.style.use(
      tw(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium whitespace-nowrap select-none cursor-pointer shadow-sm'
      )
    );
    def.feedback.style.use(tw('bg-secondary text-secondary-foreground'));
    def.rule({
      when: (w) =>
        w.all(
          w.state(state.hovered).eq(true),
          w.state(state.pressed).eq(false),
          w.state(state.disabled).eq(false),
          w.state(state.focusVisible).eq(false)
        ),
      intent: (i) => i.feedback.style.use(tw(COMMAND_HOVER)),
    });
    def.feedback.material.declare({
      version: 2,
      shape: { kind: 'rounded-rect', geometry: 'style' },
      source: { kind: 'in-app-backdrop' },
      fallback: { fill: 'style', foreground: 'style' },
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('material').eq('auto'),
          w.state(state.disabled).eq(false),
          w.state(state.pressed).eq(false)
        ),
      intent: (i) =>
        i.feedback.material.use({
          intent: 'liquid-glass',
          variant: 'regular',
          deformation: { kind: 'press', phase: 'rest', contact: 'pointer' },
        }),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('material').eq('auto'),
          w.state(state.disabled).eq(false),
          w.state(state.pressed).eq(true)
        ),
      intent: (i) =>
        i.feedback.material.use({
          intent: 'liquid-glass',
          variant: 'regular',
          deformation: { kind: 'press', phase: 'pressed', contact: 'pointer' },
        }),
    });
    def.rule({
      when: (w) => w.all(w.state(state.pressed).eq(true), w.state(state.disabled).eq(false)),
      intent: (i) => i.feedback.style.use(tw(COMMAND_PRESS)),
    });
    def.rule({
      when: (w) => w.state(state.focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(COMMAND_FOCUS)),
    });
    def.rule({
      when: (w) => w.state(state.disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(COMMAND_DISABLED)),
    });
    return inherited.render;
  },
});
