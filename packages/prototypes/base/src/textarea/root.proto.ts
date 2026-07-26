import type { DefHandle, NativeControlPatch } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import { asFocusable, asNativeControl } from '@proto.ui/hooks';
import { declareNativeControl } from '@proto.ui/module-native-control';
import type { TextareaRootAsHookContract, TextareaRootExposes, TextareaRootProps } from './types';

export type {
  TextareaRootProps,
  TextareaRootExposes,
  TextareaRootStateHandles,
  TextareaRootAsHookContract,
  TextareaValueEvent,
} from './types';

export const TEXTAREA_NATIVE_CONTROL = declareNativeControl({
  target: { namespace: 'web', localName: 'textarea' },
});

function setupTextareaRoot(def: DefHandle<TextareaRootProps, TextareaRootExposes>) {
  def.props.define({
    value: { type: 'string', empty: 'fallback' },
    defaultValue: { type: 'string', empty: 'fallback' },
    disabled: { type: 'boolean', empty: 'fallback' },
    readOnly: { type: 'boolean', empty: 'fallback' },
    required: { type: 'boolean', empty: 'fallback' },
    name: { type: 'string', empty: 'fallback' },
    placeholder: { type: 'string', empty: 'fallback' },
    autoComplete: { type: 'string', empty: 'fallback' },
    minLength: { type: 'number', empty: 'fallback' },
    maxLength: { type: 'number', empty: 'fallback' },
    rows: { type: 'number', empty: 'fallback' },
    wrap: { type: 'string', empty: 'fallback' },
  });
  def.props.setDefaults({
    disabled: false,
    readOnly: false,
    required: false,
    rows: 2,
    wrap: 'soft',
  });

  const nativeControl = asNativeControl<TextareaRootProps>();
  const focusable = asFocusable<TextareaRootProps>();
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

  const sync = (props: Readonly<TextareaRootProps>) => {
    const controlled = typeof props.value === 'string';
    disabled.set(props.disabled ?? false, 'reason: textarea sync disabled');
    readOnly.set(props.readOnly ?? false, 'reason: textarea sync readOnly');
    focusable.setDisabled(props.disabled ?? false);
    const patch: NativeControlPatch = {
      valueMode: controlled ? 'controlled' : 'uncontrolled',
      value: controlled ? props.value : undefined,
      defaultValue: props.defaultValue,
      disabled: props.disabled ?? false,
      readOnly: props.readOnly ?? false,
      required: props.required ?? false,
      fieldName: props.name ?? null,
      placeholder: props.placeholder ?? '',
      autoComplete: props.autoComplete ?? null,
      minLength: props.minLength ?? null,
      maxLength: props.maxLength ?? null,
      rows: props.rows ?? 2,
      wrap: props.wrap ?? 'soft',
    };
    nativeControl.sync(patch);
    value.set(
      nativeControl.snapshot()?.value ?? props.value ?? props.defaultValue ?? '',
      'reason: textarea sync value'
    );
  };

  nativeControl.on('input', (run, event) => {
    if (typeof run.props.get().value !== 'string') {
      value.set(event.value, 'reason: native textarea input');
    }
    run.expose.emit('input', { value: event.value });
  });
  nativeControl.on('change', (run, event) => run.expose.emit('change', { value: event.value }));
  def.lifecycle.onCreated((run) => sync(run.props.get()));
  def.props.watchAll((_run, next) => sync(next));
  return () => [];
}

export const asTextareaRoot = defineAsHook<
  TextareaRootProps,
  TextareaRootExposes,
  TextareaRootAsHookContract
>({ name: 'as-textarea-root', setup: setupTextareaRoot });

const textareaRoot = definePrototype({
  name: 'base-textarea-root',
  modules: [TEXTAREA_NATIVE_CONTROL],
  setup: setupTextareaRoot,
});

export default textareaRoot;
