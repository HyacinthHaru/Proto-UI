import { definePrototype, tw } from '@proto.ui/core';
import { asButton, type ButtonExposes } from '@proto.ui/prototypes-base/button';
import {
  bootstrapButtonFill,
  bootstrapButtonActiveFill,
  bootstrapButtonRaised,
  bootstrapButtonPressed,
} from './paint';

export interface ButtonProjectionProps {
  variant?: 'default' | 'primary';
  size?: 'default' | 'large' | 'small' | 'mini';
  disabled?: boolean;
}

// Independently expressed Proto UI projection of Bootstrap v2.3.2 buttons.less.
// Changed from upstream: Base owns all interaction/a11y; original pixel dimensions,
// a stronger focus ring, no legacy browser hacks, text-shadow or jQuery plugin.
// Upstream source attribution and license: ../../THIRD_PARTY_NOTICES.md.

export default definePrototype<ButtonProjectionProps, ButtonExposes>({
  name: 'bootstrap-2-3-2-button',
  setup(def) {
    def.props.define({
      variant: { type: 'enum', options: ['default', 'primary'], empty: 'fallback' },
      size: { type: 'enum', options: ['default', 'large', 'small', 'mini'], empty: 'fallback' },
      disabled: { type: 'boolean', empty: 'fallback' },
    });
    def.props.setDefaults({ variant: 'default', size: 'default', disabled: false });
    const state = asButton().stateHandles;
    if (!state) throw new Error('[bootstrap-2-3-2-button] Base Button states are required.');
    const { hovered, pressed, focusVisible, disabled } = state;

    def.feedback.style.use(
      tw(
        'inline-flex shrink-0 items-center justify-center border font-normal leading-[20px] whitespace-nowrap select-none cursor-pointer'
      )
    );
    // v2.3.2 keeps a 20px line height in every size. All size-dependent
    // dimensions are exclusive rules, including default, so no size competes.
    const sizes = {
      default: 'px-[12px] py-[4px] text-[14px] rounded-[4px]',
      large: 'px-[19px] py-[11px] text-[17.5px] rounded-[6px]',
      small: 'px-[10px] py-[2px] text-[11.9px] rounded-[3px]',
      mini: 'px-[6px] py-[0px] text-[10.5px] rounded-[3px]',
    };
    (Object.keys(sizes) as Array<keyof typeof sizes>).forEach((size) => {
      def.rule({
        when: (w) => w.prop('size').eq(size),
        intent: (i) => i.feedback.style.use(tw(sizes[size])),
      });
    });
    def.feedback.style.use(tw(bootstrapButtonRaised));
    (Object.keys(bootstrapButtonFill) as Array<keyof typeof bootstrapButtonFill>).forEach(
      (variant) => {
        def.rule({
          when: (w) => w.prop('variant').eq(variant),
          intent: (i) => i.feedback.style.use(tw(bootstrapButtonFill[variant])),
        });
        def.rule({
          when: (w) => w.all(w.prop('variant').eq(variant), w.state(hovered).eq(true)),
          intent: (i) => i.feedback.style.use(tw(bootstrapButtonActiveFill[variant])),
        });
        def.rule({
          when: (w) => w.all(w.prop('variant').eq(variant), w.state(pressed).eq(true)),
          intent: (i) => i.feedback.style.use(tw(bootstrapButtonActiveFill[variant])),
        });
        def.rule({
          when: (w) => w.all(w.prop('variant').eq(variant), w.state(disabled).eq(true)),
          intent: (i) => i.feedback.style.use(tw(bootstrapButtonActiveFill[variant])),
        });
      }
    );
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw(bootstrapButtonPressed)),
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
        i.feedback.style.use(tw('opacity-65 pointer-events-none cursor-default shadow-none')),
    });
  },
});
