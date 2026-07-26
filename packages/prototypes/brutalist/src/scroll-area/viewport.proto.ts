import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaViewport } from '@proto.ui/prototypes-base/scroll-area';
import type { BrutalistScrollAreaViewportExposes, BrutalistScrollAreaViewportProps } from './types';

export const BrutalistScrollAreaViewport = definePrototype<
  BrutalistScrollAreaViewportProps,
  BrutalistScrollAreaViewportExposes
>({
  name: 'brutalist-scroll-area-viewport',
  setup(def) {
    asScrollAreaViewport();
    // Prefer concrete supported tokens over size-full, which is not in the current CSS closure.
    def.feedback.style.use(tw('block h-full w-full overflow-auto rounded-none'));
    return (renderer) => [renderer.r.slot()];
  },
});
