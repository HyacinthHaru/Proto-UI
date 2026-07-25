import { definePrototype, tw } from '@proto.ui/core';
import { asCardTitle } from '@proto.ui/prototypes-base';
import type { BrutalistCardTitleExposes, BrutalistCardTitleProps } from './types';
export const BrutalistCardTitle = definePrototype<
  BrutalistCardTitleProps,
  BrutalistCardTitleExposes
>({
  name: 'brutalist-card-title',
  setup(def) {
    asCardTitle();
    def.feedback.style.use(
      tw('font-heading text-xl font-black uppercase leading-none tracking-tight')
    );
    return (renderer) => [renderer.r.slot()];
  },
});
