import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { asFocusable } from '@proto.ui/hooks';
import type { InputRootAsHookContract, InputRootExposes, InputRootProps } from './types';

export type {
  InputRootProps,
  InputRootExposes,
  InputRootStateHandles,
  InputRootAsHookContract,
} from './types';

function setupInputRoot(def: DefHandle<InputRootProps, InputRootExposes>): void {
  // P-BASE-INPUT-PROPS
  def.props.define({
    disabled: { type: 'boolean', empty: 'fallback' },
    placeholder: { type: 'string', empty: 'fallback' },
    type: { type: 'string', empty: 'fallback' },
    name: { type: 'string', empty: 'fallback' },
    value: { type: 'string', empty: 'fallback' },
  });
  def.props.setDefaults({
    disabled: false,
    placeholder: '',
    type: 'text',
    name: '',
    value: '',
  });

  // P-BASE-INPUT-DISABLED-EXPOSE
  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);
  def.a11y.state('disabled', disabled);

  // P-BASE-INPUT-FOCUSABLE, P-BASE-INPUT-DISABLED-REJECT-FOCUS
  const focusable = asFocusable<InputRootProps>();
  focusable.configure({ disabled: false });
  const focusVisible = focusable.focusVisible;
  def.expose.state('focusVisible', focusVisible);

  // P-BASE-INPUT-LIFECYCLE-SYNC
  def.lifecycle.onCreated((run) => {
    disabled.set(run.props.get().disabled ?? false, 'reason: input init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(next.disabled ?? false, 'reason: input prop disabled');
  });
}

// P-BASE-INPUT-AUTHORING-ENTRIES
export const asInputRoot = defineAsHook<InputRootProps, InputRootExposes, InputRootAsHookContract>({
  name: 'as-input-root',
  setup: setupInputRoot,
});

const inputRoot = definePrototype({
  name: 'base-input-root',
  setup: setupInputRoot,
});

export default inputRoot;
