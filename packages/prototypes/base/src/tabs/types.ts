import type { ObservedStateHandle } from '@proto.ui/core';
import { ExposeEvent, ExposeMethod, ExposeState, FocusRequestOptions, State } from '@proto.ui/core';
import type { TabsActivationMode, TabsOrientation } from './shared';

export interface TabsRootProps {
  // P-BASE-TABS-PROP-VALUE
  value?: string;
  // P-BASE-TABS-PROP-DEFAULT-VALUE
  defaultValue?: string;
  // P-BASE-TABS-PROP-ORIENTATION
  orientation?: TabsOrientation;
  // P-BASE-TABS-PROP-ACTIVATION-MODE
  activationMode?: TabsActivationMode;
  // P-BASE-TABS-PROP-NO-EVENT-CALLBACK: valueChange is an expose signal, not a prop.
}

export type TabsRootExposes = {
  // P-BASE-TABS-VALUE-EXPOSE
  value: ExposeState<string>;
  // P-BASE-TABS-VALUE-CHANGE-SIGNAL
  valueChange: ExposeEvent<{ value: string }>;
};

export type TabsRootStateHandles = {
  value: State<string>;
};

export type TabsRootAsHookContract = {
  state: TabsRootStateHandles;
  event: {
    valueChange: { value: string };
  };
};

export interface TabsListProps {
  orientation?: TabsOrientation;
  // P-BASE-TABS-LIST-PROP-LOOP
  loop?: boolean;
  // P-BASE-TABS-LIST-PROP-A11Y-LABEL
  a11yLabel?: string;
}

export type TabsListExposes = {
  // P-BASE-TABS-LIST-FOCUS-METHODS
  focusFirst: ExposeMethod<() => void>;
  focusLast: ExposeMethod<() => void>;
  focusNext: ExposeMethod<() => void>;
  focusPrev: ExposeMethod<() => void>;
  focusSelected: ExposeMethod<() => void>;
};
export type TabsListAsHookContract = {};

export interface TabsTriggerProps {
  // P-BASE-TABS-TRIGGER-PROP-VALUE
  value?: string;
  // P-BASE-TABS-TRIGGER-PROP-DISABLED
  disabled?: boolean;
}

export type TabsTriggerExposes = {
  // P-BASE-TABS-TRIGGER-DISABLED-EXPOSE
  disabled: ExposeState<boolean>;
  // P-BASE-TABS-TRIGGER-INTERACTION-STATES
  hovered: ExposeState<boolean>;
  focused: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  pressed: ExposeState<boolean>;
  // P-BASE-TABS-TRIGGER-SELECTED-EXPOSE
  selected: ExposeState<boolean>;
  // P-BASE-TABS-TRIGGER-FOCUSABLE
  focusSelf: ExposeMethod<(options?: FocusRequestOptions) => void>;
  // P-BASE-TABS-TRIGGER-CLICK-SIGNAL
  click: ExposeEvent<void>;
};

export type TabsTriggerStateHandles = {
  disabled: State<boolean>;
  hovered: State<boolean>;
  focused: ObservedStateHandle<boolean, TabsTriggerProps>;
  focusVisible: ObservedStateHandle<boolean, TabsTriggerProps>;
  pressed: State<boolean>;
  selected: State<boolean>;
};

export type TabsTriggerAsHookContract = {
  state: TabsTriggerStateHandles;
  event: {
    click: void;
  };
};

export interface TabsContentProps {
  // P-BASE-TABS-CONTENT-PROP-VALUE
  value?: string;
  // P-BASE-TABS-CONTENT-PRESENCE-POLICY
  /** Retain the complete host view while this panel is inactive. Defaults to false. */
  keepMounted?: boolean;
}

export type TabsContentExposes = {
  // P-BASE-TABS-CONTENT-CURRENT-EXPOSE
  current: ExposeState<boolean>;
  hidden: ExposeState<boolean>;
};

export type TabsContentStateHandles = {
  current: State<boolean>;
  hidden: State<boolean>;
};

export type TabsContentAsHookContract = {
  state: TabsContentStateHandles;
};

export interface TabsIndicatorProps {}

export type TabsIndicatorExposes = {
  value: ExposeState<string>;
  activeValue: ExposeState<string>;
  orientation: ExposeState<string>;
};

export type TabsIndicatorStateHandles = {
  value: State<string>;
  activeValue: State<string>;
  orientation: State<string>;
};

export type TabsIndicatorAsHookContract = {
  state: TabsIndicatorStateHandles;
};
