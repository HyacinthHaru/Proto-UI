import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaThumb } from '@proto.ui/prototypes-base/scroll-area';
import type { BrutalistScrollAreaThumbExposes, BrutalistScrollAreaThumbProps } from './types';
export const BrutalistScrollAreaThumb = definePrototype<
  BrutalistScrollAreaThumbProps,
  BrutalistScrollAreaThumbExposes
>({
  name: 'brutalist-scroll-area-thumb',
  setup(def) {
    asScrollAreaThumb();
    def.feedback.style.use(tw('relative flex-1 rounded-none bg-foreground'));
    return (renderer) => [renderer.r.slot()];
  },
});
