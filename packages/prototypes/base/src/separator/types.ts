import { ExposeState, State } from '@proto.ui/core';

export interface SeparatorRootProps {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export type SeparatorRootExposes = {
  orientation: ExposeState<string>;
  decorative: ExposeState<boolean>;
};

export type SeparatorRootStateHandles = {
  orientation: State<string>;
};

export type SeparatorRootAsHookContract = {
  state: SeparatorRootStateHandles;
};
