import type {
  ModuleInstance,
  ModulePort,
  NativeControlHandle,
  NativeControlSnapshot,
} from '@proto.ui/core';
import type { PropsBaseType } from '@proto.ui/types';

export type NativeControlFacade = {
  declare<P extends PropsBaseType = PropsBaseType>(): NativeControlHandle<P>;
};

export type NativeControlPort = ModulePort & {
  isDeclared(): boolean;
  getSnapshot(): NativeControlSnapshot | null;
};

export type NativeControlModule = ModuleInstance<NativeControlFacade> & {
  name: 'native-control';
  scope: 'instance';
  port: NativeControlPort;
};
