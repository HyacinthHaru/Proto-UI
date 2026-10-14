import type { ObservedStateHandle } from '@proto.ui/core';
import { ExposeEvent, ExposeMethod, ExposeState, FocusRequestOptions, State } from '@proto.ui/core';

export interface SwitchRootProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export type SwitchRootExposes = {
  disabled: ExposeState<boolean>;
  hovered: ExposeState<boolean>;
  focused: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  pressed: ExposeState<boolean>;
  checked: ExposeState<boolean>;
  focusSelf: ExposeMethod<(options?: FocusRequestOptions) => void>;
  checkedChange: ExposeEvent<{ checked: boolean }>;
};

export type SwitchRootStateHandles = {
  disabled: State<boolean>;
  hovered: State<boolean>;
  focused: ObservedStateHandle<boolean, SwitchRootProps>;
  focusVisible: ObservedStateHandle<boolean, SwitchRootProps>;
  pressed: State<boolean>;
  checked: State<boolean>;
};

export type SwitchRootAsHookContract = {
  state: SwitchRootStateHandles;
  event: {
    checkedChange: { checked: boolean };
  };
};

export interface SwitchThumbProps {}

export type SwitchThumbExposes = {
  checked: ExposeState<boolean>;
  isChecked: ExposeMethod<() => boolean | null>;
};

export type SwitchThumbStateHandles = {
  checked: State<boolean>;
  disabled: State<boolean>;
};

export type SwitchThumbAsHookContract = {
  state: SwitchThumbStateHandles;
};
