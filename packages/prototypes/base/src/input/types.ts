import { ExposeState, State } from '@proto.ui/core';

export interface InputRootProps {
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  name?: string;
  value?: string;
}

export type InputRootExposes = {
  disabled: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
};

export type InputRootStateHandles = {
  disabled: State<boolean>;
  focusVisible: State<boolean>;
};

export type InputRootAsHookContract = {
  state: InputRootStateHandles;
};
