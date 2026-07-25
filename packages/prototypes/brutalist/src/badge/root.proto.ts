import { definePrototype, tw } from '@proto.ui/core';
import { asBadgeRoot } from '@proto.ui/prototypes-base';
import type { BrutalistBadgeRootExposes, BrutalistBadgeRootProps } from './types';

export const BrutalistBadgeRoot = definePrototype<
  BrutalistBadgeRootProps,
  BrutalistBadgeRootExposes
>({
  name: 'brutalist-badge-root',
  setup(def) {
    asBadgeRoot();
    def.feedback.style.use(
      tw(
        'inline-flex w-fit shrink-0 items-center justify-center rounded-none border-2 border-foreground bg-canary px-2 py-0.5 font-mono text-xs font-bold uppercase text-canary-foreground shadow-[2px_2px_0_0_var(--pui-foreground)]'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
