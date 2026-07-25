import { definePrototype, tw } from '@proto.ui/core';
import { asButton } from '@proto.ui/prototypes-base/button';
import {
  BRUTALIST_CONTROL_TOKENS,
  BRUTALIST_DISABLED_TOKENS,
  BRUTALIST_FOCUS_TOKENS,
  BRUTALIST_HOVER_LIFT_TOKENS,
  BRUTALIST_PRESS_TOKENS,
} from '../style';
import type {
  BrutalistButtonExposes,
  BrutalistButtonProps,
  BrutalistButtonSize,
  BrutalistButtonVariant,
} from './types';

const BUTTON_BASE_TOKENS = [
  'group/brutalist-button',
  'inline-flex',
  'shrink-0',
  'items-center',
  'justify-center',
  'gap-2',
  'whitespace-nowrap',
  'select-none',
  'font-bold',
  'uppercase',
  'tracking-tight',
  BRUTALIST_CONTROL_TOKENS,
].join(' ');

const VARIANT_TOKENS: Record<BrutalistButtonVariant, string> = {
  default: `${BRUTALIST_CONTROL_TOKENS} bg-main text-main-foreground`,
  outline: `${BRUTALIST_CONTROL_TOKENS} bg-secondary-background text-foreground`,
  secondary: `${BRUTALIST_CONTROL_TOKENS} bg-background text-foreground`,
  destructive: `${BRUTALIST_CONTROL_TOKENS} bg-destructive text-main-foreground`,
  reverse: `${BRUTALIST_CONTROL_TOKENS} bg-black text-background shadow-[-5px_5px_0_0_var(--pui-foreground)]`,
};

const SIZE_TOKENS: Record<BrutalistButtonSize, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
  icon: 'size-10',
};

const button = definePrototype<BrutalistButtonProps, BrutalistButtonExposes>({
  name: 'brutalist-button',
  setup(def) {
    def.props.define({
      variant: {
        type: 'enum',
        empty: 'fallback',
        options: ['default', 'outline', 'secondary', 'destructive', 'reverse'],
      },
      size: { type: 'enum', empty: 'fallback', options: ['default', 'sm', 'lg', 'icon'] },
      disabled: { type: 'boolean', empty: 'fallback' },
    });
    def.props.setDefaults({ variant: 'default', size: 'default', disabled: false });

    const buttonState = asButton().stateHandles;
    if (!buttonState) {
      throw new Error('[brutalist-button] asButton must project Button state handles.');
    }
    const { disabled, hovered, focusVisible, pressed } = buttonState;

    def.feedback.style.use(tw(BUTTON_BASE_TOKENS));

    (Object.keys(VARIANT_TOKENS) as BrutalistButtonVariant[]).forEach((variant) => {
      def.rule({
        when: (w) => w.prop('variant').eq(variant),
        intent: (i) => i.feedback.style.use(tw(VARIANT_TOKENS[variant])),
      });
    });

    (Object.keys(SIZE_TOKENS) as BrutalistButtonSize[]).forEach((size) => {
      def.rule({
        when: (w) => w.prop('size').eq(size),
        intent: (i) => i.feedback.style.use(tw(SIZE_TOKENS[size])),
      });
    });

    def.rule({
      when: (w) => w.state(hovered).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_HOVER_LIFT_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_PRESS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_FOCUS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_DISABLED_TOKENS)),
    });
    def.rule({
      when: (w) => w.meta('colorScheme').eq('dark'),
      intent: (i) => i.feedback.style.use(tw('text-foreground ring-ring')),
    });
  },
});

export type {
  BrutalistButtonProps,
  BrutalistButtonExposes,
  BrutalistButtonSize,
  BrutalistButtonVariant,
};
export default button;
