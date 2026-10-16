import type { ObservedStateHandle } from '@proto.ui/core';
import { ExposeEvent, ExposeMethod, ExposeState, FocusRequestOptions, State } from '@proto.ui/core';

export interface SwitchRootProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  /** Draft enhancement; persistent value requests still occur only at release. */
  draggable?: boolean;
  direction?: 'ltr' | 'rtl';
}

export type SwitchRootExposes = {
  disabled: ExposeState<boolean>;
  hovered: ExposeState<boolean>;
  focused: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  pressed: ExposeState<boolean>;
  checked: ExposeState<boolean>;
  percentage: ExposeState<number>;
  dragging: ExposeState<boolean>;
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
  percentage: State<number>;
  dragging: State<boolean>;
  draggable: State<boolean>;
  direction: State<string>;
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
  percentage: ExposeState<number>;
  dragging: ExposeState<boolean>;
  isChecked: ExposeMethod<() => boolean | null>;
};

export type SwitchThumbStateHandles = {
  checked: State<boolean>;
  percentage: State<number>;
  dragging: State<boolean>;
  draggable: State<boolean>;
  direction: State<string>;
  disabled: State<boolean>;
};

export type SwitchThumbAsHookContract = {
  state: SwitchThumbStateHandles;
};
