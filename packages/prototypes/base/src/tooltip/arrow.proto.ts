import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type { TooltipArrowAsHookContract, TooltipArrowExposes, TooltipArrowProps } from './types';

function setupTooltipArrow(def: DefHandle<TooltipArrowProps, TooltipArrowExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'arrow' });
}

/*
 * P-BASE-TOOLTIP-ARROW-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asTooltipArrow = defineAsHook<
  TooltipArrowProps,
  TooltipArrowExposes,
  TooltipArrowAsHookContract
>({
  name: 'as-tooltip-arrow',
  setup: setupTooltipArrow,
});

const tooltipArrow = definePrototype({
  name: 'base-tooltip-arrow',
  setup: setupTooltipArrow,
});

export default tooltipArrow;
