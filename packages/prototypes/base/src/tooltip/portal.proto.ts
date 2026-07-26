import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type {
  TooltipPortalAsHookContract,
  TooltipPortalExposes,
  TooltipPortalProps,
} from './types';

function setupTooltipPortal(def: DefHandle<TooltipPortalProps, TooltipPortalExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'portal' });
}

/*
 * P-BASE-TOOLTIP-PORTAL-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asTooltipPortal = defineAsHook<
  TooltipPortalProps,
  TooltipPortalExposes,
  TooltipPortalAsHookContract
>({
  name: 'as-tooltip-portal',
  setup: setupTooltipPortal,
});

const tooltipPortal = definePrototype({
  name: 'base-tooltip-portal',
  setup: setupTooltipPortal,
});

export default tooltipPortal;
