import { expect, it, vi } from 'vitest';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  beginWebPortalMaterialEpoch,
  getWebPortalProjectionGeneration,
  isWebPortalMaterialSuspended,
  registerWebPortalDestination,
  subscribeWebPortalMaterialSuspension,
} from '@proto.ui/adapter-base';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';
import { createReactAdapter } from '../src/adapt';
import { createVueAdapter } from '../../vue/src/adapt';
import { VueAny as Vue, flushVue } from '../../vue/test/utils/vue';
import { expectStableReactPortalMount } from './portal-destination.assertions';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Independent-review regression: this shared helper's release callback is a
// deterministic host seam. It does not establish every Adapter release branch
// or browser optical/paint behavior.
it('a retired material release cannot clear or suspend the newer epoch acquired in its callback', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const old = beginWebPortalMaterialEpoch(host);
  old.commitProjection();
  let next: ReturnType<typeof beginWebPortalMaterialEpoch> | undefined;
  let entered = false;
  const before = getWebPortalProjectionGeneration(host);
  const off = subscribeWebPortalMaterialSuspension(host, () => {
    if (entered || !isWebPortalMaterialSuspended(host)) return;
    entered = true;
    next = beginWebPortalMaterialEpoch(host);
    next.commitProjection();
  });
  try {
    old.release();
    expect(entered).toBe(true);
    expect(isWebPortalMaterialSuspended(host)).toBe(false);
    old.release();
    old.suspend();
    expect(isWebPortalMaterialSuspended(host)).toBe(false);
    expect(getWebPortalProjectionGeneration(host)).toBe(before);
    next!.suspend();
    expect(isWebPortalMaterialSuspended(host)).toBe(true);
  } finally {
    off();
    next?.release();
    host.remove();
  }
});

for (const framework of ['react', 'vue'] as const) {
  it(`${framework}: superseded initial material acquisition cannot overwrite a nested scene epoch`, async () => {
    const scene = document.createElement('section');
    const home = document.createElement('div');
    const first = document.createElement('div');
    const next = document.createElement('div');
    scene.append(home, first, next);
    document.body.append(scene);
    const releases = [registerWebPortalDestination(scene, first)];
    const created: HTMLElement[] = [];
    const create = document.createElement.bind(document);
    const make = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = create(tagName, options);
      created.push(element);
      return element;
    });
    const computed = window.getComputedStyle.bind(window);
    let installed = false;
    let reentered = false;
    let off = () => {};
    // Instrument the actual host creation/style-read boundary only to install
    // an observer before begin(). The observer replaces policy synchronously;
    // real framework rendering and the real Adapter own projection afterward.
    const css = vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElt) => {
      if (!installed) {
        const host = created.find((node) => node.classList.contains('reentry-content'));
        if (host) {
          installed = true;
          off = subscribeWebPortalMaterialSuspension(host, () => {
            if (reentered) return;
            reentered = true;
            releases.push(registerWebPortalDestination(scene, next));
          });
        }
      }
      return computed(element, pseudoElt);
    });
    const proto = definePrototype({
      name: `portal-material-reentry-${framework}`,
      setup() {
        asOverlay().configure({
          defaultOpen: true,
          portal: true,
          entry: 'manual',
          restore: 'none',
        });
        return () => 'Live content';
      },
    });
    let stop = async () => {};
    try {
      if (framework === 'react') {
        const root = createRoot(home);
        const Content = createReactAdapter({ ...React, createPortal })(proto);
        stop = async () => {
          await React.act(async () => root.unmount());
        };
        await React.act(async () =>
          root.render(React.createElement(Content, { className: 'reentry-content' }))
        );
        await React.act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      } else {
        const Content = createVueAdapter(Vue)(proto);
        const app = Vue.createApp(Content, { class: 'reentry-content' });
        stop = async () => {
          app.unmount();
          await flushVue();
        };
        app.mount(home);
        await flushVue();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await flushVue();
      }
      const target = document.querySelector<HTMLElement>('.reentry-content')!;
      expect(installed).toBe(true);
      expect(reentered).toBe(true);
      if (framework === 'react') expectStableReactPortalMount(target, next);
      else expect(target.parentElement).toBe(next);
      expect(isWebPortalMaterialSuspended(target)).toBe(false);
      releases.push(registerWebPortalDestination(scene, first));
      if (framework === 'react') expectStableReactPortalMount(target, next);
      else expect(target.parentElement).toBe(next);
      expect(isWebPortalMaterialSuspended(target)).toBe(true);
    } finally {
      off();
      await stop();
      css.mockRestore();
      make.mockRestore();
      releases.reverse().forEach((release) => release());
      scene.remove();
    }
  });
}
