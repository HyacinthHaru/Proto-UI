import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  ComposerSendButtonAsHookContract,
  ComposerSendButtonExposes,
  ComposerSendButtonProps,
} from './types';

export type {
  ComposerSendButtonProps,
  ComposerSendButtonExposes,
  ComposerSendButtonStateHandles,
  ComposerSendButtonAsHookContract,
} from './types';

function setupComposerSendButton(
  def: DefHandle<ComposerSendButtonProps, ComposerSendButtonExposes>
): void {
  def.props.define({
    disabled: { type: 'boolean' },
  });

  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);

  def.lifecycle.onCreated((run) => {
    disabled.set(!!run.props.get().disabled, 'reason: composer-send-button init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(!!next.disabled, 'reason: composer-send-button prop disabled');
  });
}

export const asComposerSendButton = defineAsHook<
  ComposerSendButtonProps,
  ComposerSendButtonExposes,
  ComposerSendButtonAsHookContract
>({
  name: 'as-composer-send-button',
  setup: setupComposerSendButton,
});

const composerSendButton = definePrototype({
  name: 'base-composer-send-button',
  setup: setupComposerSendButton,
});

export default composerSendButton;
