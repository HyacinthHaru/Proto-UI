import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaRoot } from '@proto.ui/prototypes-base/scroll-area';
import type { BrutalistScrollAreaRootExposes, BrutalistScrollAreaRootProps } from './types';

export const BrutalistScrollAreaRoot = definePrototype<
  BrutalistScrollAreaRootProps,
  BrutalistScrollAreaRootExposes
>({
  name: 'brutalist-scroll-area-root',
  setup(def) {
    asScrollAreaRoot();
    // Sizing is consumer-owned. Docs demo / host layout supplies explicit dimensions.
    def.feedback.style.use(
      tw(
        'relative block h-full w-full overflow-hidden rounded-none border-2 border-foreground bg-background'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});
