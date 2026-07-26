import type { DefHandle, NativeControlPatch } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { asFocusable, asNativeControl } from '@proto.ui/hooks';
import { declareNativeControl } from '@proto.ui/module-native-control';
import type { InputRootAsHookContract, InputRootExposes, InputRootProps } from './types';

export type {
  InputRootProps,
  InputRootExposes,
  InputRootStateHandles,
  InputRootAsHookContract,
  InputValueEvent,
} from './types';

export const INPUT_NATIVE_CONTROL = declareNativeControl({
  target: { namespace: 'web', localName: 'input' },
});

function setupInputRoot(def: DefHandle<InputRootProps, InputRootExposes>) {
  def.props.define({
    value: { type: 'string', empty: 'fallback' },
    defaultValue: { type: 'string', empty: 'fallback' },
    disabled: { type: 'boolean', empty: 'fallback' },
    readOnly: { type: 'boolean', empty: 'fallback' },
    required: { type: 'boolean', empty: 'fallback' },
    name: { type: 'string', empty: 'fallback' },
    type: { type: 'string', empty: 'fallback' },
    placeholder: { type: 'string', empty: 'fallback' },
    autoComplete: { type: 'string', empty: 'fallback' },
    minLength: { type: 'number', empty: 'fallback' },
    maxLength: { type: 'number', empty: 'fallback' },
  });
  def.props.setDefaults({
    disabled: false,
    readOnly: false,
    required: false,
    type: 'text',
    placeholder: '',
  });

  const nativeControl = asNativeControl<InputRootProps>();
  const focusable = asFocusable<InputRootProps>();
  focusable.configure({ disabled: false });

  const value = def.state.string('value', '');
  const disabled = def.state.bool('disabled', false);
  const readOnly = def.state.bool('readOnly', false);
  def.expose.state('value', value);
  def.expose.state('disabled', disabled);
  def.expose.state('readOnly', readOnly);
  def.expose.state('focusVisible', focusable.focusVisible);
  def.expose.event('input', { payload: 'json' });
  def.expose.event('change', { payload: 'json' });
  def.expose.method('focus', () => {
    if (!disabled.get()) focusable.focusSelf();
  });
  def.expose.method('blur', () => focusable.blur());
  def.a11y.state('disabled', disabled);
  def.a11y.state('readonly', readOnly);

  const sync = (props: Readonly<InputRootProps>) => {
    const isControlled = typeof props.value === 'string';
    disabled.set(props.disabled ?? false, 'reason: input sync disabled');
    readOnly.set(props.readOnly ?? false, 'reason: input sync readOnly');
    focusable.setDisabled(props.disabled ?? false);
    const patch: NativeControlPatch = {
      valueMode: isControlled ? 'controlled' : 'uncontrolled',
      value: isControlled ? props.value : undefined,
      defaultValue: props.defaultValue,
      disabled: props.disabled ?? false,
      readOnly: props.readOnly ?? false,
      required: props.required ?? false,
      fieldName: props.name ?? null,
      controlType: props.type ?? 'text',
      placeholder: props.placeholder ?? '',
      autoComplete: props.autoComplete ?? null,
      minLength: props.minLength ?? null,
      maxLength: props.maxLength ?? null,
    };
    nativeControl.sync(patch);
    value.set(
      nativeControl.snapshot()?.value ?? props.value ?? props.defaultValue ?? '',
      'reason: input sync value'
    );
  };

  nativeControl.on('input', (run, event) => {
    if (typeof run.props.get().value !== 'string') {
      value.set(event.value, 'reason: native input edit');
    }
    run.expose.emit('input', { value: event.value });
  });
  nativeControl.on('change', (run, event) => {
    run.expose.emit('change', { value: event.value });
  });

  def.lifecycle.onCreated((run) => sync(run.props.get()));
  def.props.watchAll((_run, next) => sync(next));
  return () => [];
}

export const asInputRoot = defineAsHook<InputRootProps, InputRootExposes, InputRootAsHookContract>({
  name: 'as-input-root',
  setup: setupInputRoot,
});

const inputRoot = definePrototype({
  name: 'base-input-root',
  modules: [INPUT_NATIVE_CONTROL],
  setup: setupInputRoot,
});

export default inputRoot;
