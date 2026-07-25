import { definePrototype, tw } from '@proto.ui/core';
import { asSkeletonRoot } from '@proto.ui/prototypes-base';
import type { BrutalistSkeletonRootExposes, BrutalistSkeletonRootProps } from './types';
export const BrutalistSkeletonRoot = definePrototype<
  BrutalistSkeletonRootProps,
  BrutalistSkeletonRootExposes
>({
  name: 'brutalist-skeleton-root',
  setup(def) {
    asSkeletonRoot();
    def.feedback.style.use(
      tw(
        'rounded-none border-2 border-foreground bg-lavender shadow-[2px_2px_0_0_var(--pui-foreground)]'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
