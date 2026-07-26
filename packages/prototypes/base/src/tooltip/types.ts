import type { ExposeMethod, ExposeState, State } from '@proto.ui/core';
import type { TransitionHandles } from '../tools';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  delayDuration?: number;
  closeDelay?: number;
}

export type TooltipRootExposes = {
  open: ExposeState<boolean>;
  openTooltip: ExposeMethod<(reason?: string) => void>;
  close: ExposeMethod<(reason?: string) => void>;
  toggle: ExposeMethod<(reason?: string) => void>;
  openChange: import('@proto.ui/core').ExposeEvent<{ open: boolean; reason?: string | null }>;
};

export type TooltipRootStateHandles = {
  open: State<boolean>;
};

export type TooltipRootAsHookContract = {
  state: TooltipRootStateHandles;
};

export interface TooltipTriggerProps {
  disabled?: boolean;
}

export type TooltipTriggerExposes = {
  disabled: ExposeState<boolean>;
  hovered: ExposeState<boolean>;
  focused: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  focusSelf: ExposeMethod<(options?: FocusOptions) => void>;
};

export type TooltipTriggerStateHandles = {
  disabled: State<boolean>;
  hovered: State<boolean>;
  focused: State<boolean>;
  focusVisible: State<boolean>;
};

export type TooltipTriggerAsHookContract = {
  state: TooltipTriggerStateHandles;
};

export interface TooltipPortalProps {}

export type TooltipPortalExposes = {};

export type TooltipPortalStateHandles = {};

export type TooltipPortalAsHookContract = {};

export interface TooltipContentProps {
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionPadding?: number;
}

export type TooltipContentExposes = {
  open: ExposeState<boolean>;
  transitionState: ExposeState<string>;
  controls: TransitionHandles['controls'];
};

export type TooltipContentStateHandles = {
  open: State<boolean>;
};

export type TooltipContentAsHookContract = {
  state: TooltipContentStateHandles;
  asHooks: {
    asTransition: TransitionHandles;
  };
};

export type TooltipContentHandles = {
  stateHandles: TooltipContentStateHandles;
  asTransition: TransitionHandles;
};

export interface TooltipArrowProps {}

export type TooltipArrowExposes = {};

export type TooltipArrowStateHandles = {};

export type TooltipArrowAsHookContract = {};
