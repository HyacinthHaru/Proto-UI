import { definePrototype, tw } from '@proto.ui/core';
import { asMessageRoot } from '@proto.ui/prototypes-base';
import type { ShadcnMessageRootExposes, ShadcnMessageRootProps } from './types';

export const ShadcnMessageRoot = definePrototype<ShadcnMessageRootProps, ShadcnMessageRootExposes>({
  name: 'shadcn-message-root',
  setup(def) {
    const state = asMessageRoot().stateHandles;
    if (!state) throw new Error('[shadcn-message-root] Base Message states are required.');
    const { direction } = state;

    def.feedback.style.use(
      tw(
        'flex max-w-[75%] flex-col gap-1 rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm'
      )
    );
    def.rule({
      when: (w) => w.state(direction).eq('outgoing'),
      intent: (i) => i.feedback.style.use(tw('ml-auto bg-primary text-primary-foreground')),
    });
  },
});

export default ShadcnMessageRoot;
