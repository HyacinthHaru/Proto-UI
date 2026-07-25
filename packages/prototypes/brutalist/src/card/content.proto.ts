import { definePrototype, tw } from '@proto.ui/core';
import { asCardContent } from '@proto.ui/prototypes-base';
import type { BrutalistCardContentExposes, BrutalistCardContentProps } from './types';
export const BrutalistCardContent = definePrototype<
  BrutalistCardContentProps,
  BrutalistCardContentExposes
>({
  name: 'brutalist-card-content',
  setup(def) {
    asCardContent();
    def.feedback.style.use(tw('px-6'));
    return (renderer) => [renderer.r.slot()];
  },
});
