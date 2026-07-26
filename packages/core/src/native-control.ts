import type { PropsBaseType } from '@proto.ui/types';
import type { RunHandle } from './handles';
import type { Unsubscribe } from './state';

export type NativeControlValueMode = 'controlled' | 'uncontrolled';

export type NativeControlPatch = Readonly<{
  valueMode?: NativeControlValueMode;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  fieldName?: string | null;
  controlType?: string | null;
  placeholder?: string | null;
  autoComplete?: string | null;
  minLength?: number | null;
  maxLength?: number | null;
  rows?: number | null;
  wrap?: 'soft' | 'hard' | 'off' | null;
}>;

export type NativeControlEventType =
  | 'input'
  | 'change'
  | 'compositionstart'
  | 'compositionupdate'
  | 'compositionend';

export type NativeControlEvent = Readonly<{
  type: NativeControlEventType;
  value: string;
  composing: boolean;
  data?: string | null;
  inputType?: string | null;
  nativeEvent?: unknown;
}>;

export type NativeControlSnapshot = Readonly<{
  value: string;
  composing: boolean;
}>;

export interface NativeControlHandle<P extends PropsBaseType = PropsBaseType> {
  on(
    type: NativeControlEventType,
    callback: (run: RunHandle<P>, event: NativeControlEvent) => void
  ): Unsubscribe;
  sync(patch: NativeControlPatch): void;
  snapshot(): NativeControlSnapshot | null;
}
