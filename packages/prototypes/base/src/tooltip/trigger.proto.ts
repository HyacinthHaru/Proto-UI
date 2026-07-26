import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type {
  TooltipTriggerAsHookContract,
  TooltipTriggerExposes,
  TooltipTriggerProps,
} from './types';

function setupTooltipTrigger(def: DefHandle<TooltipTriggerProps, TooltipTriggerExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'trigger' });
}

/*
 * P-BASE-TOOLTIP-TRIGGER-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asTooltipTrigger = defineAsHook<
  TooltipTriggerProps,
  TooltipTriggerExposes,
  TooltipTriggerAsHookContract
>({
  name: 'as-tooltip-trigger',
  setup: setupTooltipTrigger,
});

const tooltipTrigger = definePrototype({
  name: 'base-tooltip-trigger',
  setup: setupTooltipTrigger,
});

export default tooltipTrigger;
