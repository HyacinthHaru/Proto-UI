import { ExposeState, State } from '@proto.ui/core';

export interface TooltipRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  delayDuration?: number;
}

export type TooltipRootExposes = {
  open: ExposeState<boolean>;
};

export type TooltipRootStateHandles = {
  open: State<boolean>;
};

export type TooltipRootAsHookContract = {
  state: TooltipRootStateHandles;
};

export interface TooltipTriggerProps {}

export type TooltipTriggerExposes = {};

export type TooltipTriggerStateHandles = {};

export type TooltipTriggerAsHookContract = {};

export interface TooltipPortalProps {}

export type TooltipPortalExposes = {};

export type TooltipPortalStateHandles = {};

export type TooltipPortalAsHookContract = {};

export interface TooltipContentProps {}

export type TooltipContentExposes = {};

export type TooltipContentStateHandles = {};

export type TooltipContentAsHookContract = {};

export interface TooltipArrowProps {}

export type TooltipArrowExposes = {};

export type TooltipArrowStateHandles = {};

export type TooltipArrowAsHookContract = {};
