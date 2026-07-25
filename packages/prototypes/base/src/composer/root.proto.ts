import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type { ComposerRootAsHookContract, ComposerRootExposes, ComposerRootProps } from './types';

export type {
  ComposerRootProps,
  ComposerRootExposes,
  ComposerRootStateHandles,
  ComposerRootAsHookContract,
} from './types';

function setupComposerRoot(def: DefHandle<ComposerRootProps, ComposerRootExposes>): void {
  def.props.define({
    disabled: { type: 'boolean' },
  });

  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);

  def.lifecycle.onCreated((run) => {
    disabled.set(!!run.props.get().disabled, 'reason: composer init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(!!next.disabled, 'reason: composer prop disabled');
  });
}

export const asComposerRoot = defineAsHook<
  ComposerRootProps,
  ComposerRootExposes,
  ComposerRootAsHookContract
>({
  name: 'as-composer-root',
  setup: setupComposerRoot,
});

const composerRoot = definePrototype({
  name: 'base-composer-root',
  setup: setupComposerRoot,
});

export default composerRoot;
