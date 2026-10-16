import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DemoRuntimeApi, DemoSpec } from './demo-types';
import { PropsKernel } from '../../../../../packages/modules/props/src/kernel/kernel';
import { renderDemo } from './demo-renderer';
import { loadPrototypes } from './prototype-modules';
import { definePrototype } from '@proto.ui/core';
import { registerPrototype } from './registry';

// Only CDN acquisition is replaced. Frameworks, adapters, the renderer and
// Base/Liquid Accordion are real implementations; the additional probe is test-owned.
// This is host-unit evidence, not browser evidence.
vi.mock('./runtimes/react-runtime', async (original) => {
  const actual = await original<typeof import('./runtimes/react-runtime')>();
  const { createRequire } = await import('node:module');
  const { resolve } = await import('node:path');
  const require = createRequire(resolve('packages/adapters/react/package.json'));
  return {
    ...actual,
    loadReact: async () => ({
      React: require('react'),
      ReactDOM: { ...require('react-dom'), ...require('react-dom/client') },
    }),
  };
});
vi.mock('./runtimes/vue-runtime', async (original) => {
  const actual = await original<typeof import('./runtimes/vue-runtime')>();
  const { createRequire } = await import('node:module');
  const { resolve } = await import('node:path');
  const require = createRequire(resolve('packages/adapters/vue/package.json'));
  return { ...actual, loadVue: async () => require('vue') };
});
vi.mock('./runtimes/vue2-runtime', async (original) => {
  const actual = await original<typeof import('./runtimes/vue2-runtime')>();
  const { createRequire } = await import('node:module');
  const { resolve } = await import('node:path');
  const require = createRequire(resolve('packages/adapters/vue2/package.json'));
  return { ...actual, loadVue2: async () => require('vue') };
});

const dispose: Array<() => void | Promise<void>> = [];
beforeAll(
  async () =>
    loadPrototypes([
      ...['base', 'liquid-glass'].flatMap((family) =>
        ['root', 'item', 'heading', 'trigger', 'content'].map(
          (part) => `${family}-accordion-${part}`
        )
      ),
    ]),
  20_000
);
afterEach(async () => {
  for (const cleanup of dispose.splice(0).reverse()) await cleanup();
  document.body.replaceChildren();
});

// Regression for the a62 fixture: explicit undefined remains provided-empty,
// while authored-key withdrawal reaches missing/default semantics. Host-unit
// evidence does not establish native material or visual acceptance.
describe('a62 hover re-enable diagnosis: provided-empty is not missing', () => {
  for (const family of ['base', 'liquid-glass'] as const)
    for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const)
      for (const initialDisabled of [undefined, false, true]) {
        it(`${family}/${runtime}/initial-${String(initialDisabled)}: undefined retains true; actual removal restores default`, async () => {
          const host = document.createElement('div');
          document.body.append(host);
          let api!: DemoRuntimeApi;
          const demo: DemoSpec = {
            type: 'demo',
            root: {
              kind: 'proto',
              prototypeId: `${family}-accordion-root`,
              ref: 'owner',
              props: { openItems: [], allowEmpty: true },
              children: [
                {
                  kind: 'proto',
                  prototypeId: `${family}-accordion-item`,
                  ref: 'item',
                  props: {
                    value: 'item',
                    ...(initialDisabled === undefined ? {} : { disabled: initialDisabled }),
                  },
                  children: [
                    {
                      kind: 'proto',
                      prototypeId: `${family}-accordion-heading`,
                      ref: 'heading',
                      props: { level: 3 },
                      children: [
                        {
                          kind: 'proto',
                          prototypeId: `${family}-accordion-trigger`,
                          ref: 'subject',
                          props: {},
                          children: ['Glass accordion'],
                        },
                      ],
                    },
                    {
                      kind: 'proto',
                      prototypeId: `${family}-accordion-content`,
                      ref: 'content',
                      props: {},
                      children: ['Owned accordion content'],
                    },
                  ],
                },
              ],
            },
            setup(context) {
              api = context.api;
            },
          };
          const view = await renderDemo({ runtime, host, demo });
          dispose.push(() => view.destroy());
          const subject = host.querySelector<HTMLElement>('[data-demo-ref="subject"]')!;
          const read = () => ({
            item: api.call('item', 'disabled.get'),
            subject: api.call('subject', 'disabled.get'),
            dataDisabled: subject.hasAttribute('data-disabled'),
            ariaDisabled: subject.getAttribute('aria-disabled'),
          });
          await vi.waitFor(() =>
            expect(read()).toMatchObject({
              item: initialDisabled ?? false,
              subject: initialDisabled ?? false,
              dataDisabled: initialDisabled ?? false,
            })
          );
          const initial = read();
          api.setProps('item', { disabled: true });
          await vi.waitFor(() =>
            expect(read()).toMatchObject({
              item: true,
              subject: true,
              dataDisabled: true,
              ariaDisabled: 'true',
            })
          );
          const afterTrue = read();
          api.setProps('item', { disabled: undefined });
          // Allow both framework commit and renderer update; the native artifact
          // independently observed the same state after its 8-second wait.
          await new Promise((resolve) => setTimeout(resolve, 40));
          expect(read()).toMatchObject({
            item: true,
            subject: true,
            dataDisabled: true,
            ariaDisabled: 'true',
          });
          const afterUndefined = read();
          api.setProps('item', { disabled: false });
          await vi.waitFor(() =>
            expect(read()).toMatchObject({ item: false, subject: false, dataDisabled: false })
          );
          const afterFalse = read();
          api.setProps('item', { disabled: true });
          await vi.waitFor(() => expect(read().subject).toBe(true));
          expect(typeof api.removeProps).toBe('function');
          api.removeProps!('item', ['disabled']);
          await vi.waitFor(() =>
            expect(read()).toMatchObject({
              item: false,
              subject: false,
              dataDisabled: false,
              ariaDisabled: 'false',
            })
          );
          expect(api.call('item', 'value.get')).toBe('item');
          for (const unknownRef of ['unknown', '__proto__', 'constructor'])
            expect(() => api.removeProps!(unknownRef, ['disabled'])).not.toThrow();
          // An unrelated patch must not resurrect the initial authored key.
          api.setProps('item', {});
          await new Promise((resolve) => setTimeout(resolve, 20));
          expect(read().subject).toBe(false);
          const afterRemoval = read();
          console.log(
            'REENABLE_DIAG',
            JSON.stringify({
              family,
              runtime,
              initialDisabled: String(initialDisabled),
              initial,
              afterTrue,
              afterUndefined,
              afterFalse,
              afterRemoval,
            })
          );
        }, 20_000);
      }

  it('actual raw key omission uses defaults while explicit undefined preserves previous valid true', () => {
    const props = new PropsKernel<{ disabled?: boolean }>();
    props.define({ disabled: { type: 'boolean', empty: 'fallback' } });
    props.setDefaults({ disabled: false });
    props.applyRaw({ disabled: true });
    expect(props.get().disabled).toBe(true);
    const empty = props.applyRaw({ disabled: undefined });
    expect(props.get().disabled).toBe(true);
    expect(empty.meta.providedKeys).toContain('disabled');
    expect(empty.meta.emptyKeys).toContain('disabled');
    const missing = props.applyRaw({});
    expect(props.get().disabled).toBe(false);
    expect(missing.meta.providedKeys).not.toContain('disabled');
    expect(missing.report?.changedAllResolved).toContain('disabled');
    console.log('REENABLE_RAW_DIAG', JSON.stringify({ empty, missing }));
  });
});

const probeId = 'test-hover-authored-prop-removal';
registerPrototype(
  probeId,
  definePrototype({
    name: probeId,
    setup(def) {
      let current: any;
      def.props.define({
        disabled: { type: 'boolean', empty: 'fallback' },
        material: { type: 'enum', options: ['auto', 'opaque'], empty: 'fallback' },
        label: { type: 'string', empty: 'fallback' },
      });
      def.props.setDefaults({ disabled: false, material: 'auto', label: 'default' });
      def.expose.event('valueChange');
      def.lifecycle.onCreated((run) => {
        current = run;
      });
      def.expose.method('raw', () => current.props.getRaw());
      def.expose.method('resolved', () => current.props.get());
      def.expose.method('send', (value: unknown) => current.expose.emit('valueChange', value));
    },
  })
);

describe('preview authored-prop withdrawal ownership', () => {
  for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
    it(`${runtime}: removes initial props and callbacks, retains unrelated keys, and ignores stale leases`, async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const mount = async () => {
        let api!: DemoRuntimeApi;
        const callback = vi.fn();
        const view = await renderDemo({
          runtime,
          host,
          demo: {
            type: 'demo',
            root: {
              kind: 'proto',
              prototypeId: probeId,
              ref: 'subject',
              props: {
                disabled: true,
                material: 'opaque',
                label: 'retained initial label',
              },
            },
            setup(context) {
              api = context.api;
              api.setProps('subject', { onValueChange: callback, unrelated: 'retained patch' });
            },
          },
        });
        dispose.push(() => view.destroy());
        await vi.waitFor(() =>
          expect(api.call('subject', 'resolved')).toMatchObject({
            disabled: true,
            material: 'opaque',
          })
        );
        return { api, callback, view };
      };
      const first = await mount();
      first.api.call('subject', 'send', 'before');
      expect(first.callback.mock.calls.map((args) => args[0])).toEqual(['before']);
      first.api.setProps('subject', { disabled: undefined, material: undefined });
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(first.api.call('subject', 'resolved')).toMatchObject({
        disabled: true,
        material: 'opaque',
      });
      expect(Object.hasOwn(first.api.call('subject', 'raw') as object, 'disabled')).toBe(true);
      expect(Object.hasOwn(first.api.call('subject', 'raw') as object, 'material')).toBe(true);
      first.api.removeProps!('subject', ['disabled', 'material', 'onValueChange']);
      await vi.waitFor(() =>
        expect(first.api.call('subject', 'resolved')).toMatchObject({
          disabled: false,
          material: 'auto',
          label: 'retained initial label',
        })
      );
      const raw = first.api.call('subject', 'raw') as object;
      for (const key of ['disabled', 'material', 'onValueChange'])
        expect(Object.hasOwn(raw, key)).toBe(false);
      expect(raw).toMatchObject({ label: 'retained initial label', unrelated: 'retained patch' });
      first.api.call('subject', 'send', 'removed');
      expect(first.callback).toHaveBeenCalledTimes(1);
      // Partial patches cannot revive values from the original DemoNode.
      first.api.setProps('subject', { unrelated: 'next patch' });
      await vi.waitFor(() =>
        expect(first.api.call('subject', 'raw')).toMatchObject({ unrelated: 'next patch' })
      );
      expect(first.api.call('subject', 'resolved')).toMatchObject({
        disabled: false,
        material: 'auto',
      });
      first.api.call('subject', 'send', 'still removed');
      expect(first.callback).toHaveBeenCalledTimes(1);
      // Repeat removal is idempotent; callback re-addition remains supported.
      first.api.removeProps!('subject', ['onValueChange']);
      first.api.setProps('subject', { onValueChange: first.callback });
      await new Promise((resolve) => setTimeout(resolve, 30));
      first.api.call('subject', 'send', 'readded');
      expect(first.callback).toHaveBeenCalledTimes(2);
      const replacement = await mount();
      first.api.removeProps!(
        'subject',
        new Proxy([], {
          get() {
            throw new Error('Stale owner must not read removal keys');
          },
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(replacement.api.call('subject', 'resolved')).toMatchObject({
        disabled: true,
        material: 'opaque',
      });
      replacement.api.call('subject', 'send', 'replacement');
      expect(replacement.callback).toHaveBeenCalledTimes(1);
      expect(first.callback).toHaveBeenCalledTimes(2);
    }, 20_000);
  }
});
