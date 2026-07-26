import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type {
  TooltipContentAsHookContract,
  TooltipContentExposes,
  TooltipContentProps,
} from './types';

function setupTooltipContent(def: DefHandle<TooltipContentProps, TooltipContentExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'content' });
}

/*
 * P-BASE-TOOLTIP-CONTENT-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asTooltipContent = defineAsHook<
  TooltipContentProps,
  TooltipContentExposes,
  TooltipContentAsHookContract
>({
  name: 'as-tooltip-content',
  setup: setupTooltipContent,
});

const tooltipContent = definePrototype({
  name: 'base-tooltip-content',
  setup: setupTooltipContent,
});

export default tooltipContent;
