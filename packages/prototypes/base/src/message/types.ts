import { ExposeState, State } from '@proto.ui/core';

export interface MessageRootProps {
  direction?: 'incoming' | 'outgoing';
}

export type MessageRootExposes = {
  direction: ExposeState<string>;
};

export type MessageRootStateHandles = {
  direction: State<string>;
};

export type MessageRootAsHookContract = {
  state: MessageRootStateHandles;
};
