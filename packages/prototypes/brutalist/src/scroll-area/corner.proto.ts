import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaCorner } from '@proto.ui/prototypes-base/scroll-area';
import type { BrutalistScrollAreaCornerExposes, BrutalistScrollAreaCornerProps } from './types';
export const BrutalistScrollAreaCorner = definePrototype<
  BrutalistScrollAreaCornerProps,
  BrutalistScrollAreaCornerExposes
>({
  name: 'brutalist-scroll-area-corner',
  setup(def) {
    asScrollAreaCorner();
    def.feedback.style.use(tw('absolute bottom-0 right-0 h-4 w-4 bg-foreground'));
    return (renderer) => [renderer.r.slot()];
  },
});
