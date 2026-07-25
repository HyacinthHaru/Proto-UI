import { definePrototype, tw } from '@proto.ui/core';
import { asCardDescription } from '@proto.ui/prototypes-base';
import type { BrutalistCardDescriptionExposes, BrutalistCardDescriptionProps } from './types';
export const BrutalistCardDescription = definePrototype<
  BrutalistCardDescriptionProps,
  BrutalistCardDescriptionExposes
>({
  name: 'brutalist-card-description',
  setup(def) {
    asCardDescription();
    def.feedback.style.use(tw('font-mono text-sm text-muted-foreground'));
    return (renderer) => [renderer.r.slot()];
  },
});
