import { expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import {
  isWebPortalMaterialSuspended,
  getWebPortalProjectionGeneration,
  registerWebPortalDestination,
} from '@proto.ui/adapter-base';
import { createVueAdapter } from '../src';

const flush = async () => {
  await Vue.nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
};
function prototype(name: string) {
  return definePrototype({
    name,
    setup(def) {
      const overlay = asOverlay();
      overlay.configure({ defaultOpen: true, portal: true, entry: 'manual', restore: 'none' });
      def.expose('actions', { close: () => overlay.close(), open: () => overlay.openOverlay() });
      return (r) => r.el('span', 'Portal content');
    },
  });
}
it.each(['registered', 'default', 'disconnected', 'foreign'] as const)(
  'Vue uses the iframe author document on first %s Teleport',
  async (policy) => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    const scene = doc.createElement('section'),
      home = doc.createElement('div'),
      destination = doc.createElement('div');
    scene.append(home);
    if (policy !== 'disconnected') scene.append(destination);
    doc.body.append(scene);
    const release =
      policy === 'default'
        ? () => {}
        : registerWebPortalDestination(scene, policy === 'foreign' ? document.body : destination);
    const Content = createVueAdapter(Vue)(prototype(`vue-iframe-${policy}`));
    const ref = Vue.ref<any>();
    // happy-dom does not adopt Vue-created descendants when inserting into
    // an iframe. Supply document-aware host factories, while retaining Vue's
    // real renderer/Teleport and its unmodified module-document selector lookup.
    // This controls host creation only, not the selected portal destination.
    const renderer = Vue.createRenderer({
      ...Vue.nodeOps,
      patchProp: Vue.patchProp,
      createElement: (tag: string) => doc.createElement(tag),
      createText: (text: string) => doc.createTextNode(text),
      createComment: (text: string) => doc.createComment(text),
    });
    const outerInsert = vi.spyOn(document.body, 'insertBefore');
    const app = renderer.createApp({
      render: () => Vue.h(Content, { ref, class: 'iframe-portal-content' }),
    });
    try {
      app.mount(home);
      // The author marker commits before a portal root/document is acquired.
      expect(home.querySelector('[data-pui-portal-origin]')).not.toBeNull();
      expect(doc.querySelector('.iframe-portal-content')).toBeNull();
      expect(document.querySelector('.iframe-portal-content')).toBeNull();
      await flush();
      const host = doc.querySelector<HTMLElement>('.iframe-portal-content');
      expect(
        outerInsert.mock.calls.some(
          ([node]) => node instanceof Element && node.matches('.iframe-portal-content')
        )
      ).toBe(false);
      expect(document.querySelector('.iframe-portal-content')).toBeNull();
      expect(host).not.toBeNull();
      expect(host!.ownerDocument).toBe(doc);
      expect(doc.querySelectorAll('#proto-ui-view-visibility')).toHaveLength(1);
      expect(host!.parentElement).toBe(policy === 'registered' ? destination : doc.body);
      expect(isWebPortalMaterialSuspended(host!)).toBe(false);
      ref.value.getExposes().actions.close();
      await flush();
      expect(host!.isConnected).toBe(false);
      expect(doc.querySelector('.iframe-portal-content')).toBeNull();
      ref.value.getExposes().actions.open();
      await flush();
      expect(doc.querySelector('.iframe-portal-content')?.parentElement).toBe(
        policy === 'registered' ? destination : doc.body
      );
    } finally {
      app.unmount();
      release();
      iframe.remove();
      outerInsert.mockRestore();
    }
  }
);
it.each([true, false])(
  'Vue without optional Teleport retains ordinary inline material (onUpdated=%s)',
  async (updated) => {
    const { Teleport: _Teleport, onUpdated, ...rest } = Vue;
    const runtime = updated ? { ...rest, onUpdated } : rest;
    const scene = document.createElement('section'),
      home = document.createElement('div'),
      destination = document.createElement('div');
    scene.append(home, destination);
    document.body.append(scene);
    const release = registerWebPortalDestination(scene, destination);
    const ref = Vue.ref<any>(),
      revision = Vue.ref(0);
    const Content = createVueAdapter(runtime)(prototype(`vue-inline-${updated}`));
    const app = Vue.createApp({
      render: () =>
        Vue.h(Content, { ref, class: 'inline-portal-content', 'data-revision': revision.value }),
    });
    try {
      app.mount(home);
      await flush();
      const host = home.querySelector<HTMLElement>('.inline-portal-content')!;
      expect(host).not.toBeNull();
      expect(isWebPortalMaterialSuspended(host)).toBe(false);
      expect(getWebPortalProjectionGeneration(host)).toBe(0);
      expect(home.querySelector('[data-pui-portal-origin]')).toBeNull();
      release();
      revision.value++;
      await flush();
      expect(host.parentElement).toBe(home);
      expect(isWebPortalMaterialSuspended(host)).toBe(false);
      ref.value.getExposes().actions.close();
      await flush();
      ref.value.getExposes().actions.open();
      await flush();
      const reopened = home.querySelector<HTMLElement>('.inline-portal-content')!;
      expect(reopened).not.toBeNull();
      expect(isWebPortalMaterialSuspended(reopened)).toBe(false);
      expect(getWebPortalProjectionGeneration(reopened)).toBe(0);
    } finally {
      app.unmount();
      release();
      scene.remove();
    }
  }
);
