import { definePrototype, tw } from '@proto.ui/core';
import { asHoverCardTrigger } from '@proto.ui/prototypes-base/hover-card';
import type { BrutalistHoverCardTriggerExposes, BrutalistHoverCardTriggerProps } from './types';

const TRIGGER_BASE_TOKENS = [
  'inline-flex',
  'rounded-none',
  'border-2',
  'border-black',
  'bg-main',
  'px-3',
  'py-1.5',
  'font-bold',
  'uppercase',
  'text-main-foreground',
  'shadow-[5px_5px_0_0_#000]',
  'outline-none',
].join(' ');

const hoverCardTrigger = definePrototype<
  BrutalistHoverCardTriggerProps,
  BrutalistHoverCardTriggerExposes
>({
  name: 'brutalist-hover-card-trigger',
  setup(def) {
    // P-BRUTALIST-HOVER-CARD-TRIGGER-BASE-INHERITANCE,
    // P-BRUTALIST-HOVER-CARD-TRIGGER-CURRENT-BASE-DEVIATIONS
    const hoverCard = asHoverCardTrigger();
    const state = hoverCard.stateHandles;
    if (!state) {
      throw new Error('[brutalist-hover-card-trigger] missing Hover Card Trigger state handles.');
    }
    const { disabled, hovered, focusVisible } = state;

    // P-BRUTALIST-HOVER-CARD-TRIGGER-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw(TRIGGER_BASE_TOKENS));

    // P-BRUTALIST-HOVER-CARD-TRIGGER-STATE-DRIVEN-STYLES
    def.rule({
      when: (w) => w.state(hovered).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw(
            'inline-flex rounded-none border-2 border-black bg-main px-3 py-1.5 font-bold uppercase text-main-foreground shadow-[5px_5px_0_0_#000] outline-none'
          )
        ),
    });

    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw('ring-2 ring-ring ring-offset-2')),
    });

    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });
  },
});

/** P-BRUTALIST-HOVER-CARD-TRIGGER-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-HOVER-CARD-TRIGGER-COMPATIBILITY-SUBSET. */

export default hoverCardTrigger;
