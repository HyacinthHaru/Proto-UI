import { ExposeState, State } from '@proto.ui/core';

export interface TextareaRootProps {
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  value?: string;
  rows?: number;
}

export type TextareaRootExposes = {
  disabled: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
};

export type TextareaRootStateHandles = {
  disabled: State<boolean>;
  focusVisible: State<boolean>;
};

export type TextareaRootAsHookContract = {
  state: TextareaRootStateHandles;
};
