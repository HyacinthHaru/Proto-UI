import { definePrototype, tw } from '@proto.ui/core';
import { asTooltipArrow } from '@proto.ui/prototypes-base';
import type { BrutalistTooltipArrowExposes, BrutalistTooltipArrowProps } from './types';
export const BrutalistTooltipArrow = definePrototype<
  BrutalistTooltipArrowProps,
  BrutalistTooltipArrowExposes
>({
  name: 'brutalist-tooltip-arrow',
  setup(def) {
    asTooltipArrow();
    def.feedback.style.use(tw('fill-foreground'));
    return (renderer) => [renderer.r.slot()];
  },
});
