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
  focused: State<boolean>;
  focusVisible: State<boolean>;
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
  pressed: ExposeState<boolean>;
  isChecked: ExposeMethod<() => boolean | null>;
  isPressed: ExposeMethod<() => boolean | null>;
};

export type SwitchThumbStateHandles = {
  checked: State<boolean>;
  disabled: State<boolean>;
  pressed: State<boolean>;
};

export type SwitchThumbAsHookContract = {
  state: SwitchThumbStateHandles;
};
