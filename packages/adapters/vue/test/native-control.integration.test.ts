import { describe, expect, it } from 'vitest';
import { definePrototype, type DefHandle, type NativeControlPatch } from '@proto.ui/core';
import { asNativeControl } from '@proto.ui/hooks';
import { declareNativeControl } from '@proto.ui/module-native-control';
import { createVueAdapter } from '../src/adapt';
import { VueAny, createMountedVueAdapter, flushVue } from './utils/vue';
type ControlProps = { defaultValue?: string; placeholder?: string };

const nativeTextarea = definePrototype({
  name: 'vue-native-control',
  modules: [declareNativeControl({ target: { namespace: 'web', localName: 'textarea' } })],
  setup(def: DefHandle<ControlProps>) {
    def.props.define({
      defaultValue: { type: 'string', empty: 'fallback' },
      placeholder: { type: 'string', empty: 'fallback' },
    });
    const control = asNativeControl<ControlProps>();
    const sync = (props: Readonly<ControlProps>) => {
      const patch: NativeControlPatch = {
        valueMode: 'uncontrolled',
        defaultValue: props.defaultValue,
        placeholder: props.placeholder,
        rows: 4,
      };
      control.sync(patch);
    };
    def.lifecycle.onCreated((run) => sync(run.props.get()));
    def.props.watchAll((_run, next) => sync(next));
    return () => [];
  },
});

describe('adapter-vue native control', () => {
  it('materializes the declared native root and projects module patches', async () => {
    const mounted = createMountedVueAdapter(nativeTextarea, {
      defaultValue: 'initial',
      placeholder: 'Write',
    });
    await flushVue();
    const textarea = mounted.root as HTMLTextAreaElement;
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea.value).toBe('initial');
    expect(textarea.placeholder).toBe('Write');
    expect(Number(textarea.rows)).toBe(4);
    mounted.unmount();
  });

  it('rejects a conflicting rootTag', () => {
    expect(() => createVueAdapter(VueAny)(nativeTextarea, { rootTag: 'div' })).toThrow(/rootTag/);
  });
});
