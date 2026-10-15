import type {
  SwitchRootAsHookContract,
  SwitchRootExposes,
  SwitchRootProps,
  SwitchRootStateHandles,
  SwitchThumbAsHookContract,
  SwitchThumbExposes,
  SwitchThumbProps,
  SwitchThumbStateHandles,
} from '@proto.ui/prototypes-base/switch';

export interface BrutalistSwitchRootProps extends SwitchRootProps {
  /** Temporarily unsupported until input and direct presentation share the pinned travel endpoints. */
  draggable?: false;
}
export type BrutalistSwitchRootExposes = SwitchRootExposes;
export type BrutalistSwitchRootStateHandles = SwitchRootStateHandles;
export type BrutalistSwitchRootAsHookContract = SwitchRootAsHookContract;

export interface BrutalistSwitchThumbProps extends SwitchThumbProps {}
export type BrutalistSwitchThumbExposes = SwitchThumbExposes;
export type BrutalistSwitchThumbStateHandles = SwitchThumbStateHandles;
export type BrutalistSwitchThumbAsHookContract = SwitchThumbAsHookContract;
