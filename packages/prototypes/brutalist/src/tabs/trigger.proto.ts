import { definePrototype, tw } from '@proto.ui/core';
import { asTabsTrigger } from '@proto.ui/prototypes-base/tabs';
import {
  BRUTALIST_DISABLED_TOKENS,
  BRUTALIST_FOCUS_TOKENS,
  BRUTALIST_PRESS_TOKENS,
} from '../style';
import type { BrutalistTabsTriggerExposes, BrutalistTabsTriggerProps } from './types';

const BASE_TOKENS = [
  'inline-flex',
  'items-center',
  'justify-center',
  'whitespace-nowrap',
  'rounded-none',
  'border-2',
  'border-transparent',
  'px-3',
  'py-1.5',
  'text-sm',
  'font-bold',
  'uppercase',
  'outline-none',
  'text-foreground',
  'select-none',
].join(' ');

const tabsTrigger = definePrototype<BrutalistTabsTriggerProps, BrutalistTabsTriggerExposes>({
  name: 'brutalist-tabs-trigger',
  setup(def) {
    const triggerState = asTabsTrigger().stateHandles;
    if (!triggerState) {
      throw new Error(
        '[brutalist-tabs-trigger] asTabsTrigger must project Tabs trigger state handles.'
      );
    }
    const { disabled, hovered, focusVisible, pressed, selected } = triggerState;

    def.feedback.style.use(tw(BASE_TOKENS));

    def.rule({
      when: (w) => w.state(selected).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('bg-main text-main-foreground border-black shadow-[3px_3px_0_0_#000]')
        ),
    });
    def.rule({
      when: (w) => w.all(w.state(hovered).eq(true), w.state(selected).eq(false)),
      intent: (i) => i.feedback.style.use(tw('bg-background border-black')),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_FOCUS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_PRESS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_DISABLED_TOKENS)),
    });
  },
});

export default tabsTrigger;
