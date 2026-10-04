import type {
  SelectContentAsHookContract,
  SelectContentExposes,
  SelectContentProps,
  SelectItemAsHookContract,
  SelectItemExposes,
  SelectItemProps,
  SelectRootAsHookContract,
  SelectRootExposes,
  SelectRootProps,
  SelectTriggerAsHookContract,
  SelectTriggerExposes,
  SelectTriggerProps,
  SelectValueAsHookContract,
  SelectValueExposes,
  SelectValueProps,
} from '@proto.ui/prototypes-base/select';

export type BrutalistSelectRootProps = SelectRootProps;
export type BrutalistSelectRootExposes = SelectRootExposes;
export type BrutalistSelectRootAsHookContract = SelectRootAsHookContract;

export interface BrutalistSelectTriggerProps extends SelectTriggerProps {
  size?: 'sm' | 'default';
  /** Flat by default; elevated adds depth and ghost is an opt-in transparent presentation. */
  appearance?: 'flat' | 'elevated' | 'ghost';
}
export type BrutalistSelectTriggerExposes = SelectTriggerExposes;
export type BrutalistSelectTriggerAsHookContract = SelectTriggerAsHookContract;

export type BrutalistSelectValueProps = SelectValueProps;
export type BrutalistSelectValueExposes = SelectValueExposes;
export type BrutalistSelectValueAsHookContract = SelectValueAsHookContract;

export type BrutalistSelectContentProps = SelectContentProps;
export type BrutalistSelectContentExposes = SelectContentExposes;
export type BrutalistSelectContentAsHookContract = SelectContentAsHookContract;

export type BrutalistSelectItemProps = SelectItemProps;
export type BrutalistSelectItemExposes = SelectItemExposes;
export type BrutalistSelectItemAsHookContract = SelectItemAsHookContract;
