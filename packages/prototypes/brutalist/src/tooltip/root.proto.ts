import { definePrototype } from '@proto.ui/core';
import { asTooltipRoot } from '@proto.ui/prototypes-base';
import type { BrutalistTooltipRootExposes, BrutalistTooltipRootProps } from './types';
export const BrutalistTooltipRoot = definePrototype<
  BrutalistTooltipRootProps,
  BrutalistTooltipRootExposes
>({
  name: 'brutalist-tooltip-root',
  setup() {
    asTooltipRoot();
  },
});
