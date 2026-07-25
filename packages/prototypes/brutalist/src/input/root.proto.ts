import { definePrototype, tw } from '@proto.ui/core';
import { asInputRoot } from '@proto.ui/prototypes-base';
import { BRUTALIST_DISABLED_TOKENS, BRUTALIST_FOCUS_TOKENS } from '../shared';
import type { BrutalistInputRootExposes, BrutalistInputRootProps } from './types';

export const BrutalistInputRoot = definePrototype<
  BrutalistInputRootProps,
  BrutalistInputRootExposes
>({
  name: 'brutalist-input-root',
  setup(def) {
    const state = asInputRoot().stateHandles;
    if (!state) throw new Error('[brutalist-input-root] Base Input states are required.');
    const { disabled, focusVisible } = state;

    def.feedback.style.use(
      tw(
        'flex h-10 w-full min-w-0 rounded-none border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground shadow-[3px_3px_0_0_var(--pui-foreground)] outline-none'
      )
    );
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_FOCUS_TOKENS)),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw(BRUTALIST_DISABLED_TOKENS)),
    });
  },
});
