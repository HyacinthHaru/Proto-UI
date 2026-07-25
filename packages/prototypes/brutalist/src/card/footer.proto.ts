import { definePrototype, tw } from '@proto.ui/core';
import { asCardFooter } from '@proto.ui/prototypes-base';
import type { BrutalistCardFooterExposes, BrutalistCardFooterProps } from './types';
export const BrutalistCardFooter = definePrototype<
  BrutalistCardFooterProps,
  BrutalistCardFooterExposes
>({
  name: 'brutalist-card-footer',
  setup(def) {
    asCardFooter();
    def.feedback.style.use(
      tw('flex items-center justify-between gap-4 border-t-2 border-foreground px-6 pt-4')
    );
    return (renderer) => [renderer.r.slot()];
  },
});
