import { describe, expect, it } from 'vitest';
import { definePrototype, type DefHandle, type NativeControlPatch } from '@proto.ui/core';
import { asNativeControl } from '@proto.ui/hooks';
import { declareNativeControl } from '@proto.ui/module-native-control';
import { createReactAdapter } from '../src/adapt';
import { createFakeReactRuntime } from './utils/fake-react';

type ControlProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
};

function createInputPrototype(name: string) {
  return definePrototype({
    name,
    modules: [declareNativeControl({ target: { namespace: 'web', localName: 'input' } })],
    setup(def: DefHandle<ControlProps>) {
      def.props.define({
        value: { type: 'string', empty: 'fallback' },
        defaultValue: { type: 'string', empty: 'fallback' },
        placeholder: { type: 'string', empty: 'fallback' },
        disabled: { type: 'boolean', empty: 'fallback' },
      });
      const control = asNativeControl<ControlProps>();
      const sync = (props: Readonly<ControlProps>) => {
        const patch: NativeControlPatch = {
          valueMode: typeof props.value === 'string' ? 'controlled' : 'uncontrolled',
          value: props.value,
          defaultValue: props.defaultValue,
          placeholder: props.placeholder,
          disabled: props.disabled,
        };
        control.sync(patch);
      };
      def.lifecycle.onCreated((run) => sync(run.props.get()));
      def.props.watchAll((_run, next) => sync(next));
      return () => [];
    },
  });
}

describe('adapter-react native control', () => {
  it('materializes the declared native root and projects module patches', () => {
    const proto = createInputPrototype('react-native-control');
    const fake = createFakeReactRuntime();
    const Component = createReactAdapter(fake.runtime)(proto, { schedule: (task) => task() });
    const mounted = fake.render(Component, {
      defaultValue: 'initial',
      placeholder: 'Search',
      disabled: true,
    });
    const input = mounted.root as HTMLInputElement;
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input.value).toBe('initial');
    expect(input.placeholder).toBe('Search');
    expect(input.disabled).toBe(true);
    mounted.unmount();
  });

  it('rejects a conflicting rootTag', () => {
    const proto = createInputPrototype('react-native-control-conflict');
    const fake = createFakeReactRuntime();
    expect(() => createReactAdapter(fake.runtime)(proto, { rootTag: 'div' })).toThrow(/rootTag/);
  });
});
