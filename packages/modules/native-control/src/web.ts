import type { NativeControlEvent, NativeControlPatch, NativeControlSnapshot } from '@proto.ui/core';
import type {
  NativeControlHost,
  NativeControlHostConnection,
  NativeControlHostLease,
} from './caps';

export type WebNativeControl = HTMLInputElement | HTMLTextAreaElement;

export function createWebNativeControlHost(
  getTarget: () => WebNativeControl | null
): NativeControlHost {
  return {
    attach(connection) {
      const target = getTarget();
      if (!target) throw new Error('[NativeControl] physical web control target is unavailable.');
      return attachTarget(target, connection);
    },
  };
}

function attachTarget(
  target: WebNativeControl,
  connection: NativeControlHostConnection
): NativeControlHostLease {
  let patch = connection.patch;
  let composing = false;
  let disposed = false;

  const emit = (event: Event) => {
    if (disposed) return;
    const type = event.type as NativeControlEvent['type'];
    if (type === 'compositionstart') composing = true;
    if (type === 'compositionend') composing = false;
    const inputEvent = event instanceof InputEvent ? event : null;
    const compositionEvent = event instanceof CompositionEvent ? event : null;
    connection.onEvent(
      Object.freeze({
        type,
        value: target.value,
        composing: type === 'compositionend' ? false : composing,
        data: inputEvent?.data ?? compositionEvent?.data ?? null,
        inputType: inputEvent?.inputType ?? null,
        nativeEvent: event,
      })
    );
  };

  const eventTypes = [
    'input',
    'change',
    'compositionstart',
    'compositionupdate',
    'compositionend',
  ] as const;
  for (const type of eventTypes) target.addEventListener(type, emit);
  applyPatch(target, patch);

  return {
    update(next) {
      if (disposed) return;
      patch = next;
      applyPatch(target, patch);
    },
    snapshot(): NativeControlSnapshot {
      return Object.freeze({ value: target.value, composing });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const type of eventTypes) target.removeEventListener(type, emit);
    },
  };
}

function applyPatch(target: WebNativeControl, patch: NativeControlPatch): void {
  const value =
    patch.valueMode === 'controlled' ? (patch.value ?? '') : (patch.value ?? patch.defaultValue);
  if (typeof value === 'string' && target.value !== value) target.value = value;
  if (typeof patch.disabled === 'boolean') target.disabled = patch.disabled;
  if (typeof patch.readOnly === 'boolean') target.readOnly = patch.readOnly;
  if (typeof patch.required === 'boolean') target.required = patch.required;
  if (typeof patch.fieldName !== 'undefined') target.name = patch.fieldName ?? '';
  if (typeof patch.placeholder !== 'undefined') target.placeholder = patch.placeholder ?? '';
  if (typeof patch.autoComplete !== 'undefined') {
    target.setAttribute('autocomplete', patch.autoComplete ?? '');
  }
  if (typeof patch.minLength === 'number') target.minLength = patch.minLength;
  else if (patch.minLength === null) target.removeAttribute('minlength');
  if (typeof patch.maxLength === 'number') target.maxLength = patch.maxLength;
  else if (patch.maxLength === null) target.removeAttribute('maxlength');
  if (target instanceof HTMLInputElement && typeof patch.controlType !== 'undefined') {
    target.type = patch.controlType ?? 'text';
  }
  if (target instanceof HTMLTextAreaElement) {
    if (typeof patch.rows !== 'undefined') target.rows = patch.rows ?? 2;
    if (typeof patch.wrap !== 'undefined') target.wrap = patch.wrap ?? '';
  }
}
