import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type { TooltipRootAsHookContract, TooltipRootExposes, TooltipRootProps } from './types';

function setupTooltipRoot(def: DefHandle<TooltipRootProps, TooltipRootExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'root' });
}

/*
 * P-BASE-TOOLTIP-ROOT-NO-BEHAVIOR: absence of props, event, state, and focus syntax is the implementation.
 */

export const asTooltipRoot = defineAsHook<
  TooltipRootProps,
  TooltipRootExposes,
  TooltipRootAsHookContract
>({
  name: 'as-tooltip-root',
  setup: setupTooltipRoot,
});

const tooltipRoot = definePrototype({
  name: 'base-tooltip-root',
  setup: setupTooltipRoot,
});

export default tooltipRoot;
