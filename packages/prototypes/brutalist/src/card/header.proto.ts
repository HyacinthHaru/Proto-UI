import { definePrototype, tw } from '@proto.ui/core';
import { asCardHeader } from '@proto.ui/prototypes-base';
import type { BrutalistCardHeaderExposes, BrutalistCardHeaderProps } from './types';
export const BrutalistCardHeader = definePrototype<
  BrutalistCardHeaderProps,
  BrutalistCardHeaderExposes
>({
  name: 'brutalist-card-header',
  setup(def) {
    asCardHeader();
    def.feedback.style.use(
      tw('flex items-start justify-between gap-4 border-b-2 border-foreground px-6 pb-4')
    );
    return (renderer) => [renderer.r.slot()];
  },
});
