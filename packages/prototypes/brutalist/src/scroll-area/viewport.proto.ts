import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaViewport } from '@proto.ui/prototypes-base';
import type { BrutalistScrollAreaViewportExposes, BrutalistScrollAreaViewportProps } from './types';
export const BrutalistScrollAreaViewport = definePrototype<
  BrutalistScrollAreaViewportProps,
  BrutalistScrollAreaViewportExposes
>({
  name: 'brutalist-scroll-area-viewport',
  setup(def) {
    asScrollAreaViewport();
    def.feedback.style.use(tw('size-full rounded-none'));
    return (renderer) => [renderer.r.slot()];
  },
});
