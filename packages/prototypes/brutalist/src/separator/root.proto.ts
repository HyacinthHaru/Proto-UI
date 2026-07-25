import { definePrototype, tw } from '@proto.ui/core';
import { asSeparatorRoot } from '@proto.ui/prototypes-base';
import type { BrutalistSeparatorRootExposes, BrutalistSeparatorRootProps } from './types';

export const BrutalistSeparatorRoot = definePrototype<
  BrutalistSeparatorRootProps,
  BrutalistSeparatorRootExposes
>({
  name: 'brutalist-separator-root',
  setup(def) {
    const state = asSeparatorRoot().stateHandles;
    if (!state) throw new Error('[brutalist-separator-root] Base Separator states are required.');
    const { orientation } = state;
    def.feedback.style.use(tw('shrink-0 bg-foreground'));
    def.rule({
      when: (w) => w.state(orientation).eq('horizontal'),
      intent: (i) => i.feedback.style.use(tw('h-0.5 w-full')),
    });
    def.rule({
      when: (w) => w.state(orientation).eq('vertical'),
      intent: (i) => i.feedback.style.use(tw('h-full w-0.5')),
    });
  },
});
