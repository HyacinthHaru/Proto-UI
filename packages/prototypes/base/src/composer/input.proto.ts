import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  ComposerInputAsHookContract,
  ComposerInputExposes,
  ComposerInputProps,
} from './types';

export type {
  ComposerInputProps,
  ComposerInputExposes,
  ComposerInputStateHandles,
  ComposerInputAsHookContract,
} from './types';

function setupComposerInput(def: DefHandle<ComposerInputProps, ComposerInputExposes>): void {
  def.props.define({
    disabled: { type: 'boolean' },
  });

  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);

  def.lifecycle.onCreated((run) => {
    disabled.set(!!run.props.get().disabled, 'reason: composer-input init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(!!next.disabled, 'reason: composer-input prop disabled');
  });
}

export const asComposerInput = defineAsHook<
  ComposerInputProps,
  ComposerInputExposes,
  ComposerInputAsHookContract
>({
  name: 'as-composer-input',
  setup: setupComposerInput,
});

const composerInput = definePrototype({
  name: 'base-composer-input',
  setup: setupComposerInput,
});

export default composerInput;
