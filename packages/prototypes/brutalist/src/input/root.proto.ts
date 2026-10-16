import { definePrototype, tw } from '@proto.ui/core';
import { asInputRoot } from '@proto.ui/prototypes-base/input';
import type { BrutalistInputRootExposes, BrutalistInputRootProps } from './types';

/** Neo input.tsx at 3306a802; Base remains the only editor and value owner. */
export const BrutalistInputRoot = definePrototype<
  BrutalistInputRootProps,
  BrutalistInputRootExposes
>({
  name: 'brutalist-input-root',
  modules: asInputRoot.modules,
  setup(def) {
    const state = asInputRoot().stateHandles;
    if (!state) throw new Error('[brutalist-input] Base Input state handles are required.');
    def.feedback.style.use(
      tw(
        'flex h-10 w-full rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-sm font-sans font-medium text-foreground selection:bg-main selection:text-main-foreground'
      )
    );
    def.rule({
      when: (w) => w.state(state.focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw('outline-none ring-2 ring-black ring-offset-2')),
    });
    def.rule({
      when: (w) => w.state(state.disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('cursor-not-allowed opacity-50')),
    });
    return () => null;
  },
});
export default BrutalistInputRoot;
