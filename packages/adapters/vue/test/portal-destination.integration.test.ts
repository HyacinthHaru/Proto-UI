import { registerWebPortalDestination } from '@proto.ui/adapter-base';
import { expect, it } from 'vitest';
import * as Vue from 'vue';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { createVueAdapter } from '../src';

const settle = async () => {
  await Vue.nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
};

it('Vue native Teleport projects into registered scene and preserves direction', async () => {
  const style = document.createElement('style');
  // UA-equivalent presentation rule missing in happy-dom; no native paint claim.
  style.textContent = '[dir="rtl"]{direction:rtl}[dir="ltr"]{direction:ltr}';
  document.head.append(style);
  const adapt = createVueAdapter(Vue);
  const Owner = adapt(
    definePrototype({ name: 'vue-destination-owner', setup: () => (r) => r.slot() })
  );
  const Content = adapt(
    definePrototype({
      name: 'vue-destination-content',
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
  const host = document.createElement('div');
  host.dir = 'rtl';
  const destination = document.createElement('div');
  const scene = document.createElement('section');
  scene.append(host, destination);
  document.body.append(scene);
  const unregister = registerWebPortalDestination(scene, destination);
  const direction = Vue.ref<'ltr' | 'rtl' | 'auto'>();
  const app = Vue.createApp({
    render: () =>
      Vue.h(Owner, null, () =>
        Vue.h('section', { dir: 'ltr', 'data-direction-author': '' }, [
          Vue.h(Content, { class: 'portal-destination-target', dir: direction.value }),
        ])
      ),
  });
  let mounted = true;
  try {
    app.mount(host);
    await settle();
    const target = document.querySelector<HTMLElement>('.portal-destination-target')!;
    const author = host.querySelector<HTMLElement>('[data-direction-author]')!;
    expect(target.parentElement).toBe(destination);
    expect(target.dir).toBe('ltr');
    expect(author.querySelector('[data-pui-portal-origin]')).not.toBeNull();
    author.dir = 'rtl';
    await settle();
    expect(target.dir).toBe('rtl');
    direction.value = 'ltr';
    await settle();
    expect(target.dir).toBe('ltr');
    author.dir = 'rtl';
    await settle();
    expect(target.dir).toBe('ltr');
    direction.value = undefined;
    await settle();
    expect(target.dir).toBe('rtl');
    app.unmount();
    mounted = false;
    await settle();
    expect(target.isConnected).toBe(false);
    expect(target.getAttribute('dir')).toBe(null);
    expect(host.querySelector('[data-pui-portal-origin]')).toBe(null);
    author.dir = 'ltr';
    await settle();
    expect(target.getAttribute('dir')).toBe(null);
  } finally {
    if (mounted) app.unmount();
    unregister();
    destination.remove();
    host.remove();
    style.remove();
    scene.remove();
  }
});
