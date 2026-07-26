import type { ExposeEvent, ExposeState, State } from '@proto.ui/core';

export interface TextareaRootProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  wrap?: 'soft' | 'hard' | 'off';
}

export type TextareaValueEvent = Readonly<{ value: string }>;

export type TextareaRootExposes = {
  value: ExposeState<string>;
  disabled: ExposeState<boolean>;
  readOnly: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  input: ExposeEvent<TextareaValueEvent>;
  change: ExposeEvent<TextareaValueEvent>;
  focus: () => void;
  blur: () => void;
};

export type TextareaRootStateHandles = {
  value: State<string>;
  disabled: State<boolean>;
  readOnly: State<boolean>;
  focusVisible: State<boolean>;
};

export type TextareaRootAsHookContract = { state: TextareaRootStateHandles };
