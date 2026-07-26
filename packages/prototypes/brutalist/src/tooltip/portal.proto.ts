import { definePrototype } from '@proto.ui/core';
import { asTooltipPortal } from '@proto.ui/prototypes-base/tooltip';
import type { BrutalistTooltipPortalExposes, BrutalistTooltipPortalProps } from './types';
export const BrutalistTooltipPortal = definePrototype<
  BrutalistTooltipPortalProps,
  BrutalistTooltipPortalExposes
>({
  name: 'brutalist-tooltip-portal',
  setup() {
    asTooltipPortal();
  },
});
