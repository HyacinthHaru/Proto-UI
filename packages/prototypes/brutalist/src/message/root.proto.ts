import { definePrototype, tw } from '@proto.ui/core';
import { asMessageRoot } from '@proto.ui/prototypes-base/message';
import type { BrutalistMessageRootExposes, BrutalistMessageRootProps } from './types';

export const BrutalistMessageRoot = definePrototype<
  BrutalistMessageRootProps,
  BrutalistMessageRootExposes
>({
  name: 'brutalist-message-root',
  setup(def) {
    asMessageRoot();
    def.feedback.style.use(
      tw(
        'flex flex-col gap-1 rounded-none border-2 border-foreground bg-background p-3 font-mono text-sm text-foreground shadow-[3px_3px_0_0_var(--pui-foreground)]'
      )
    );
    def.rule({
      when: (w) => w.prop('direction').eq('outgoing'),
      intent: (i) => i.feedback.style.use(tw('ml-auto bg-canary text-canary-foreground')),
    });
    return (renderer) => [renderer.r.slot()];
  },
});
