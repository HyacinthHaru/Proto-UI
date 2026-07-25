import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  ComposerActionsAsHookContract,
  ComposerActionsExposes,
  ComposerActionsProps,
} from './types';

export type {
  ComposerActionsProps,
  ComposerActionsExposes,
  ComposerActionsStateHandles,
  ComposerActionsAsHookContract,
} from './types';

function setupComposerActions(def: DefHandle<ComposerActionsProps, ComposerActionsExposes>): void {
  def.props.define({
    disabled: { type: 'boolean' },
  });

  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);

  def.lifecycle.onCreated((run) => {
    disabled.set(!!run.props.get().disabled, 'reason: composer-actions init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(!!next.disabled, 'reason: composer-actions prop disabled');
  });
}

export const asComposerActions = defineAsHook<
  ComposerActionsProps,
  ComposerActionsExposes,
  ComposerActionsAsHookContract
>({
  name: 'as-composer-actions',
  setup: setupComposerActions,
});

const composerActions = definePrototype({
  name: 'base-composer-actions',
  setup: setupComposerActions,
});

export default composerActions;
