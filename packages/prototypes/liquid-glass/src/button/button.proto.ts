import {
  COMMAND_HOVER,
  COMMAND_PRESS,
  COMMAND_FOCUS,
  COMMAND_DISABLED,
} from '../interactive-surface';
import { definePrototype, tw } from '@proto.ui/core';
import { asButton, type ButtonExposes } from '@proto.ui/prototypes-base/button';

export interface ButtonProjectionProps {
  variant?: 'regular' | 'prominent';
  disabled?: boolean;
  /** Auto enhances only when all live preference/support inputs are affirmative. */
  material?: 'auto' | 'opaque';
}

// Explicit optical intent uses the shared host provider. The same final opaque
// fill remains available without a source; CSS blur is not a substitute.
const FILLS = {
  regular: 'bg-secondary text-secondary-foreground',
  prominent: 'bg-primary text-primary-foreground',
};

export default definePrototype<ButtonProjectionProps, ButtonExposes>({
  name: 'liquid-glass-button',
  setup(def) {
    def.props.define({
      variant: { type: 'enum', options: ['regular', 'prominent'], empty: 'fallback' },
      disabled: { type: 'boolean', empty: 'fallback' },
      material: { type: 'enum', options: ['auto', 'opaque'], empty: 'fallback' },
    });
    def.props.setDefaults({ variant: 'regular', disabled: false, material: 'auto' });
    const state = asButton().stateHandles;
    if (!state) throw new Error('[liquid-glass-button] Base Button states are required.');
    const { hovered, pressed, focusVisible, disabled } = state;

    def.feedback.style.use(
      tw(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium whitespace-nowrap select-none cursor-pointer shadow-sm'
      )
    );
    (Object.keys(FILLS) as Array<keyof typeof FILLS>).forEach((variant) => {
      def.rule({
        when: (w) => w.prop('variant').eq(variant),
        intent: (i) => i.feedback.style.use(tw(FILLS[variant])),
      });
    });
    def.rule({
      when: (w) =>
        w.all(
          w.state(hovered).eq(true),
          w.state(pressed).eq(false),
          w.state(disabled).eq(false),
          w.state(focusVisible).eq(false)
        ),
      intent: (i) => i.feedback.style.use(tw(COMMAND_HOVER)),
    });
    def.feedback.material.declare({
      version: 2,
      shape: { kind: 'rounded-rect', geometry: 'style' },
      source: { kind: 'in-app-backdrop' },
      fallback: { fill: 'style', foreground: 'style' },
    });
    for (const phase of [false, true]) {
      def.rule({
        when: (w) =>
          w.all(
            w.prop('variant').eq('regular'),
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
    }
    def.rule({
      when: (w) => w.all(w.state(pressed).eq(true), w.state(disabled).eq(false)),
      intent: (i) => i.feedback.style.use(tw(COMMAND_PRESS)),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(COMMAND_FOCUS)),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(COMMAND_DISABLED)),
    });
  },
});
