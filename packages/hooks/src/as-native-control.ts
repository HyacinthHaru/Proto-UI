import type { NativeControlHandle } from '@proto.ui/core';
import type { PropsBaseType } from '@proto.ui/types';
import { definePrivilegedAsHook } from './privileged';

type NativeControlFacade = {
  declare<P extends PropsBaseType = PropsBaseType>(): NativeControlHandle<P>;
};

export function asNativeControl<P extends PropsBaseType = PropsBaseType>(): NativeControlHandle<P> {
  return getNativeControl() as NativeControlHandle<P>;
}

const getNativeControl = definePrivilegedAsHook<PropsBaseType, NativeControlHandle<PropsBaseType>>({
  name: 'asNativeControl',
  setup: ({ facades }) => {
    const facade = facades['native-control'] as NativeControlFacade | undefined;
    if (!facade || typeof facade.declare !== 'function') {
      throw new Error('[AsHook] native-control facade unavailable for asNativeControl.');
    }
    return facade.declare();
  },
});
