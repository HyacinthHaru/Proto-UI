import tooltipRoot from './root.proto';

export type {
  TooltipAlign,
  TooltipArrowAsHookContract,
  TooltipArrowExposes,
  TooltipArrowProps,
  TooltipArrowStateHandles,
  TooltipContentAsHookContract,
  TooltipContentExposes,
  TooltipContentHandles,
  TooltipContentProps,
  TooltipContentStateHandles,
  TooltipPortalAsHookContract,
  TooltipPortalExposes,
  TooltipPortalProps,
  TooltipPortalStateHandles,
  TooltipRootAsHookContract,
  TooltipRootExposes,
  TooltipRootProps,
  TooltipRootStateHandles,
  TooltipSide,
  TooltipTriggerAsHookContract,
  TooltipTriggerExposes,
  TooltipTriggerProps,
  TooltipTriggerStateHandles,
} from './types';

export { TOOLTIP_CONTEXT, TOOLTIP_FAMILY } from './shared';
export type { TooltipContextValue, TooltipInteractionReason } from './shared';
export { asTooltipRoot, default as tooltipRoot } from './root.proto';
export { asTooltipTrigger, default as tooltipTrigger } from './trigger.proto';
export { asTooltipPortal, default as tooltipPortal } from './portal.proto';
export { asTooltipContent, default as tooltipContent } from './content.proto';
export { asTooltipArrow, default as tooltipArrow } from './arrow.proto';

export default tooltipRoot;
