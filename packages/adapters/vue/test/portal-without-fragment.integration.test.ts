import { registerWebPortalDestination } from '@proto.ui/adapter-base';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { expect, it } from 'vitest';
import * as Vue from 'vue';
import { createVueAdapter } from '../src';
import { getProtoParent } from '../src/platform/instance-tree';
import { portalDestinationContract } from '../../react/test/portal-destination.contract';

// Use the installed renderer and Teleport, omitting only the optional runtime
// Fragment export. happy-dom evidence does not establish native paint or input.
const { Fragment, ...runtimeWithoutFragment } = Vue;

const flush = async () => {
  await Vue.nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
};

portalDestinationContract(
  'Vue Teleport without Fragment',
  async (host, ownerProto, contentProto) => {
    const adapt = createVueAdapter(runtimeWithoutFragment);
    const Owner = adapt(ownerProto);
    const Content = adapt(contentProto);
    const ref = Vue.ref<any>();
    const revision = Vue.ref(0);
    const app = Vue.createApp({
      render: () =>
        Vue.h(Owner, { 'data-revision': revision.value }, () =>
          Vue.h(Content, { ref, class: 'portal-lifetime-target', 'data-revision': revision.value })
        ),
    });
    app.mount(host);
    return {
      flush,
      run: async (work) => {
        work();
        await flush();
      },
      refresh: async () => {
        revision.value++;
        await flush();
      },
      destroy: async () => {
        app.unmount();
        await flush();
      },
      actions: () => ref.value.getExposes().actions,
      owner: () => host.querySelector<HTMLElement>('[data-pui-root]')!,
      logicalParent: getProtoParent,
    };
  }
);

it('retains author origin, direction ownership and cleanup when Fragment is omitted', async () => {
  expect(Fragment).toBeDefined();
  expect(runtimeWithoutFragment).not.toHaveProperty('Fragment');
  expect(runtimeWithoutFragment.Teleport).toBe(Vue.Teleport);
  const style = document.createElement('style');
  // UA-equivalent direction presentation rule missing in happy-dom.
  style.textContent = '[dir="rtl"]{direction:rtl}[dir="ltr"]{direction:ltr}';
  document.head.append(style);
  const scene = document.createElement('section');
  const host = document.createElement('div');
  const destination = document.createElement('div');
  scene.append(host, destination);
  document.body.append(scene);
  const unregister = registerWebPortalDestination(scene, destination);
  const adapt = createVueAdapter(runtimeWithoutFragment);
  const Owner = adapt(
    definePrototype({ name: 'vue-no-fragment-owner', setup: () => (r) => r.slot() })
  );
  const Content = adapt(
    definePrototype({
      name: 'vue-no-fragment-content',
      setup() {
        asOverlay().configure({
          defaultOpen: true,
          portal: true,
          entry: 'manual',
          restore: 'none',
        });
        return () => 'Portalled content';
      },
    })
  );
  const direction = Vue.ref<'ltr' | 'rtl'>();
  const app = Vue.createApp({
    render: () =>
      Vue.h(Owner, null, () =>
        Vue.h('section', { dir: 'rtl', 'data-direction-author': '' }, [
          Vue.h(Content, { class: 'portal-no-fragment-target', dir: direction.value }),
        ])
      ),
  });
  let mounted = true;
  try {
    app.mount(host);
    await flush();
    const target = document.querySelector<HTMLElement>('.portal-no-fragment-target')!;
    const author = host.querySelector<HTMLElement>('[data-direction-author]')!;
    const origin = author.querySelector<HTMLElement>('[data-pui-portal-origin]');
    expect(origin).not.toBeNull();
    expect(origin!.hidden).toBe(true);
    expect(origin!.getAttribute('aria-hidden')).toBe('true');
    expect(target.parentElement).toBe(destination);
    expect(target.dir).toBe('rtl');
    author.dir = 'ltr';
    await flush();
    expect(target.dir).toBe('ltr');
    direction.value = 'rtl';
    await flush();
    expect(target.dir).toBe('rtl');
    direction.value = undefined;
    await flush();
    expect(target.dir).toBe('ltr');
    expect(document.querySelector('.portal-no-fragment-target')).toBe(target);
    expect(author.querySelectorAll('[data-pui-portal-origin]')).toHaveLength(1);
    expect(author.querySelector('[data-pui-portal-origin]')).toBe(origin);
    app.unmount();
    mounted = false;
    await flush();
    expect(target.isConnected).toBe(false);
    expect(origin!.isConnected).toBe(false);
    expect(host.querySelector('[data-pui-portal-origin]')).toBeNull();
    expect(target.getAttribute('dir')).toBeNull();
    author.dir = 'rtl';
    await flush();
    expect(target.getAttribute('dir')).toBeNull();
  } finally {
    if (mounted) app.unmount();
    unregister();
    scene.remove();
    style.remove();
  }
});
