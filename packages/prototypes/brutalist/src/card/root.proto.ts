import { definePrototype, tw } from '@proto.ui/core';
import { asCardRoot } from '@proto.ui/prototypes-base';
import type { BrutalistCardRootExposes, BrutalistCardRootProps } from './types';

export const BrutalistCardRoot = definePrototype<BrutalistCardRootProps, BrutalistCardRootExposes>({
  name: 'brutalist-card-root',
  setup(def) {
    asCardRoot();
    def.feedback.style.use(
      tw(
        'flex flex-col gap-6 rounded-none border-2 border-foreground bg-background py-6 text-foreground shadow-[6px_6px_0_0_var(--pui-foreground)]'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
