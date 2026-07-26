import { describe, expect, it } from 'vitest';
import { definePrototype, type DefHandle, type NativeControlPatch } from '@proto.ui/core';
import { asNativeControl } from '@proto.ui/hooks';
import { declareNativeControl } from '@proto.ui/module-native-control';
import { AdaptToWebComponent, setElementProps, type WebComponentAdapterElement } from '../src';

const moduleInputValues: string[] = [];

type ControlProps = { defaultValue?: string; placeholder?: string };

const nativeInput = definePrototype({
  name: 'x-wc-native-control',
  modules: [declareNativeControl({ target: { namespace: 'web', localName: 'input' } })],
  setup(def: DefHandle<ControlProps>) {
    def.props.define({
      defaultValue: { type: 'string', empty: 'fallback' },
      placeholder: { type: 'string', empty: 'fallback' },
    });
    const control = asNativeControl<ControlProps>();
    control.on('input', (_run, event) => moduleInputValues.push(event.value));
    const sync = (props: Readonly<ControlProps>) => {
      const patch: NativeControlPatch = {
        valueMode: 'uncontrolled',
        defaultValue: props.defaultValue,
        placeholder: props.placeholder,
      };
      control.sync(patch);
    };
    def.lifecycle.onCreated((run) => sync(run.props.get()));
    def.props.watchAll((_run, next) => sync(next));
    return () => [];
  },
});

AdaptToWebComponent(nativeInput);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('adapter-web-component native control', () => {
  it('retains the custom root and owns one inner physical control', async () => {
    const shell = document.createElement('x-wc-native-control') as WebComponentAdapterElement<
      typeof nativeInput
    >;
    setElementProps(shell, { defaultValue: 'initial', placeholder: 'Search' });
    document.body.appendChild(shell);
    await flush();
    const input = shell.querySelector('input');
    expect(shell.tagName.toLowerCase()).toBe('x-wc-native-control');
    expect(shell.querySelectorAll('input')).toHaveLength(1);
    expect(input?.value).toBe('initial');
    expect(input?.placeholder).toBe('Search');
    input?.focus();
    expect(document.activeElement).toBe(input);
    shell.blur();
    expect(document.activeElement).not.toBe(input);

    const seen: string[] = [];
    shell.addEventListener('input', (event) => {
      seen.push(String((event as CustomEvent<{ value?: string }>).detail?.value ?? 'native'));
    });
    if (!input) throw new Error('physical input was not materialized');
    input.value = 'edited';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(moduleInputValues).toEqual(['edited']);
    expect(seen).toHaveLength(1);

    shell.remove();
    await flush();
    input.value = 'after-detach';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(moduleInputValues).toEqual(['edited']);
  });
});
