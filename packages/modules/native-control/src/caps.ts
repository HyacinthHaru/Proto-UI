import {
  cap,
  type NativeControlEvent,
  type NativeControlPatch,
  type NativeControlSnapshot,
} from '@proto.ui/core';

export type NativeControlHostConnection = Readonly<{
  patch: NativeControlPatch;
  onEvent(event: NativeControlEvent): void;
}>;

export type NativeControlHostLease = Readonly<{
  update(patch: NativeControlPatch): void;
  snapshot(): NativeControlSnapshot;
  dispose(): void;
}>;

export type NativeControlHost = Readonly<{
  attach(connection: NativeControlHostConnection): NativeControlHostLease;
}>;

export const NATIVE_CONTROL_HOST_CAP = cap<NativeControlHost>('@proto.ui/native-control/host');

export const NATIVE_CONTROL_RUN_IN_CALLBACK_CAP = cap<(callback: () => void) => void>(
  '@proto.ui/native-control/run-in-callback'
);
