import type { ExposeEvent, ExposeState, State } from '@proto.ui/core';

export interface InputRootProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
}

export type InputValueEvent = Readonly<{ value: string }>;

export type InputRootExposes = {
  value: ExposeState<string>;
  disabled: ExposeState<boolean>;
  readOnly: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  input: ExposeEvent<InputValueEvent>;
  change: ExposeEvent<InputValueEvent>;
  focus: () => void;
  blur: () => void;
};

export type InputRootStateHandles = {
  value: State<string>;
  disabled: State<boolean>;
  readOnly: State<boolean>;
  focusVisible: State<boolean>;
};

export type InputRootAsHookContract = {
  state: InputRootStateHandles;
};
