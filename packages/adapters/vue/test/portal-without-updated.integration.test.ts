import {
  getWebPortalMaterialSuspensionGeneration,
  getWebPortalProjectionGeneration,
  isWebPortalMaterialSuspended,
  registerWebPortalDestination,
} from '@proto.ui/adapter-base';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { expect, it } from 'vitest';
import * as Vue from 'vue';
import { createVueAdapter } from '../src';
import { getProtoParent } from '../src/platform/instance-tree';
import { portalDestinationContract } from '../../react/test/portal-destination.contract';

// Use the installed renderer and Teleport, omitting only the optional runtime
// onUpdated export. happy-dom evidence does not establish native paint or input.
const { onUpdated, ...runtimeWithoutUpdated } = Vue;
const { Fragment: _Fragment, ...runtimeWithoutUpdatedOrFragment } = runtimeWithoutUpdated;

const flush = async () => {
  await Vue.nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
};

portalDestinationContract(
  'Vue Teleport without onUpdated',
  async (host, ownerProto, contentProto) => {
    const adapt = createVueAdapter(runtimeWithoutUpdated);
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

it('retains author origin, direction ownership and cleanup when onUpdated is omitted', async () => {
  expect(onUpdated).toBeDefined();
  expect(runtimeWithoutUpdated).not.toHaveProperty('onUpdated');
  expect(runtimeWithoutUpdated.Teleport).toBe(Vue.Teleport);
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
  const adapt = createVueAdapter(runtimeWithoutUpdated);
  const Owner = adapt(
    definePrototype({ name: 'vue-no-updated-owner', setup: () => (r) => r.slot() })
  );
  const Content = adapt(
    definePrototype({
      name: 'vue-no-updated-content',
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
          Vue.h(Content, { class: 'portal-no-updated-target', dir: direction.value }),
        ])
      ),
  });
  let mounted = true;
  try {
    app.mount(host);
    await flush();
    const target = document.querySelector<HTMLElement>('.portal-no-updated-target')!;
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
    expect(document.querySelector('.portal-no-updated-target')).toBe(target);
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

it.each([
  ['onUpdated', runtimeWithoutUpdated],
  ['onUpdated and Fragment', runtimeWithoutUpdatedOrFragment],
] as const)(
  'without %s, commits material after projection and keeps suspension until a new view',
  async (_missing, runtime) => {
    // HC-OVERLAY-PORTAL-0001-BINDING/MATERIAL: registry selection is not a
    // projection commit or optical admission. This observes the real renderer's
    // epoch signals; source pixels and native paint remain separate evidence.
    const scene = document.createElement('section');
    const host = document.createElement('div');
    const destination = document.createElement('div');
    const replacement = document.createElement('div');
    const unrelatedScene = document.createElement('section');
    const unrelatedDestination = document.createElement('div');
    scene.append(host, destination, replacement);
    unrelatedScene.append(unrelatedDestination);
    document.body.append(scene, unrelatedScene);
    const releases = [registerWebPortalDestination(scene, destination)];
    const adapt = createVueAdapter(runtime);
    const Owner = adapt(
      definePrototype({ name: 'vue-no-updated-material-owner', setup: () => (r) => r.slot() })
    );
    const Content = adapt(
      definePrototype({
        name: 'vue-no-updated-material-content',
        setup(def) {
          const overlay = asOverlay();
          overlay.configure({ defaultOpen: true, portal: true, entry: 'manual', restore: 'none' });
          def.expose('actions', {
            open: () => overlay.openOverlay(),
            close: () => overlay.close(),
          });
          return () => 'Material lifecycle content';
        },
      })
    );
    const content = Vue.ref<any>();
    const revision = Vue.ref(0);
    const app = Vue.createApp({
      render: () =>
        Vue.h(Owner, null, () =>
          Vue.h(Content, {
            ref: content,
            class: 'portal-no-updated-material',
            'data-revision': revision.value,
          })
        ),
    });
    let mounted = true;
    try {
      app.mount(host);
      await flush();
      const target = destination.querySelector<HTMLElement>('.portal-no-updated-material')!;
      expect(target).not.toBeNull();
      expect(isWebPortalMaterialSuspended(target)).toBe(false);
      expect(getWebPortalMaterialSuspensionGeneration(target)).toBeGreaterThan(0);
      expect(getWebPortalProjectionGeneration(target)).toBe(1);
      const committedGeneration = getWebPortalMaterialSuspensionGeneration(target);

      releases.push(registerWebPortalDestination(unrelatedScene, unrelatedDestination));
      await flush();
      expect(isWebPortalMaterialSuspended(target)).toBe(false);
      expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(committedGeneration);

      const origin = host.querySelector('[data-pui-portal-origin]');
      unrelatedScene.prepend(host);
      revision.value++;
      await flush();
      expect(host.querySelector('[data-pui-portal-origin]')).toBe(origin);
      expect(document.querySelector('.portal-no-updated-material')).toBe(target);
      expect(target.parentElement).toBe(destination);
      expect(isWebPortalMaterialSuspended(target)).toBe(true);
      expect(getWebPortalProjectionGeneration(target)).toBe(1);
      scene.prepend(host);
      revision.value++;
      await flush();
      expect(isWebPortalMaterialSuspended(target)).toBe(true);

      releases.push(registerWebPortalDestination(scene, replacement));
      await flush();
      expect(target.parentElement).toBe(destination);
      expect(isWebPortalMaterialSuspended(target)).toBe(true);
      expect(getWebPortalProjectionGeneration(target)).toBe(1);
      const suspendedGeneration = getWebPortalMaterialSuspensionGeneration(target);
      revision.value++;
      await flush();
      expect(isWebPortalMaterialSuspended(target)).toBe(true);
      expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(suspendedGeneration);
      expect(getWebPortalProjectionGeneration(target)).toBe(1);

      content.value.getExposes().actions.close();
      await flush();
      expect(isWebPortalMaterialSuspended(target)).toBe(true);
      expect(target.isConnected).toBe(false);
      content.value.getExposes().actions.open();
      await flush();
      const reopened = replacement.querySelector<HTMLElement>('.portal-no-updated-material')!;
      expect(reopened).not.toBeNull();
      expect(isWebPortalMaterialSuspended(reopened)).toBe(false);
      expect(getWebPortalProjectionGeneration(reopened)).toBe(1);
      expect(isWebPortalMaterialSuspended(target)).toBe(true);

      app.unmount();
      mounted = false;
      await flush();
      expect(reopened.isConnected).toBe(false);
      expect(isWebPortalMaterialSuspended(reopened)).toBe(true);
      const retiredGeneration = getWebPortalMaterialSuspensionGeneration(reopened);
      releases.push(registerWebPortalDestination(scene, destination));
      await flush();
      expect(getWebPortalMaterialSuspensionGeneration(reopened)).toBe(retiredGeneration);
      expect(document.querySelector('.portal-no-updated-material')).toBeNull();
    } finally {
      if (mounted) app.unmount();
      for (const release of releases.reverse()) release();
      scene.remove();
      unrelatedScene.remove();
    }
  }
);
