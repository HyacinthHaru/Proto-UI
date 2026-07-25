import { definePrototype, tw } from '@proto.ui/core';
import { asCardAction } from '@proto.ui/prototypes-base';
import type { BrutalistCardActionExposes, BrutalistCardActionProps } from './types';
export const BrutalistCardAction = definePrototype<
  BrutalistCardActionProps,
  BrutalistCardActionExposes
>({
  name: 'brutalist-card-action',
  setup(def) {
    asCardAction();
    def.feedback.style.use(tw('shrink-0 self-start'));
    return (renderer) => [renderer.r.slot()];
  },
});
