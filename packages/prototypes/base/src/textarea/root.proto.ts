import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { asFocusable } from '@proto.ui/hooks';
import type { TextareaRootAsHookContract, TextareaRootExposes, TextareaRootProps } from './types';

export type {
  TextareaRootProps,
  TextareaRootExposes,
  TextareaRootStateHandles,
  TextareaRootAsHookContract,
} from './types';

function setupTextareaRoot(def: DefHandle<TextareaRootProps, TextareaRootExposes>): void {
  def.props.define({
    disabled: { type: 'boolean', empty: 'fallback' },
    placeholder: { type: 'string', empty: 'fallback' },
    name: { type: 'string', empty: 'fallback' },
    value: { type: 'string', empty: 'fallback' },
    rows: { type: 'number', empty: 'fallback' },
  });
  def.props.setDefaults({
    disabled: false,
    placeholder: '',
    name: '',
    value: '',
    rows: 3,
  });

  const disabled = def.state.bool('disabled', false);
  def.expose.state('disabled', disabled);
  def.a11y.state('disabled', disabled);

  const focusable = asFocusable<TextareaRootProps>();
  focusable.configure({ disabled: false });
  const focusVisible = focusable.focusVisible;
  def.expose.state('focusVisible', focusVisible);

  def.a11y.role('textbox');

  def.lifecycle.onCreated((run) => {
    disabled.set(run.props.get().disabled ?? false, 'reason: textarea init disabled');
  });
  def.props.watch(['disabled'], (_run, next) => {
    disabled.set(next.disabled ?? false, 'reason: textarea prop disabled');
  });
}

export const asTextareaRoot = defineAsHook<
  TextareaRootProps,
  TextareaRootExposes,
  TextareaRootAsHookContract
>({
  name: 'as-textarea-root',
  setup: setupTextareaRoot,
});

const textareaRoot = definePrototype({
  name: 'base-textarea-root',
  setup: setupTextareaRoot,
});

export default textareaRoot;
