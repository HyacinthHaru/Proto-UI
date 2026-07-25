import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type { MessageRootAsHookContract, MessageRootExposes, MessageRootProps } from './types';

export type {
  MessageRootProps,
  MessageRootExposes,
  MessageRootStateHandles,
  MessageRootAsHookContract,
} from './types';

function setupMessageRoot(def: DefHandle<MessageRootProps, MessageRootExposes>): void {
  def.props.define({
    direction: { type: 'enum', empty: 'fallback', options: ['incoming', 'outgoing'] },
  });
  def.props.setDefaults({ direction: 'incoming' });

  const direction = def.state.string('direction', 'incoming');
  def.expose.state('direction', direction);

  def.lifecycle.onCreated((run) => {
    direction.set(run.props.get().direction ?? 'incoming', 'reason: message init direction');
  });
  def.props.watch(['direction'], (_run, next) => {
    direction.set(next.direction ?? 'incoming', 'reason: message prop direction');
  });
}

export const asMessageRoot = defineAsHook<
  MessageRootProps,
  MessageRootExposes,
  MessageRootAsHookContract
>({
  name: 'as-message-root',
  setup: setupMessageRoot,
});

const messageRoot = definePrototype({
  name: 'base-message-root',
  setup: setupMessageRoot,
});

export default messageRoot;
