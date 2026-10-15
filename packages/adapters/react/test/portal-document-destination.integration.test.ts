import { expect, it } from 'vitest';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { definePrototype } from '@proto.ui/core';
import { asFocusable, asOverlay } from '@proto.ui/hooks';
import { registerWebPortalDestination, isWebPortalMaterialSuspended } from '@proto.ui/adapter-base';
import { createReactAdapter } from '../src';
import { expectInertReactPortalContainer } from './portal-destination.assertions';

function expectStableReactPortalMount(host: HTMLElement, destination: HTMLElement) {
  const mount = host.parentElement!;
  expect(mount.parentNode).toBe(destination);
  expect([...mount.childNodes]).toEqual([host]);
  expectInertReactPortalContainer(mount);
  expect(host.ownerDocument.querySelectorAll('[data-pui-portal-mount]')).toHaveLength(1);
  return mount;
}

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const settle = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

for (const [policy, renderer] of [
  ['registered', 'owner-context'],
  ['unregistered', 'owner-context'],
  ['disconnected', 'owner-context'],
  ['foreign', 'owner-context'],
  ['registered', 'strict-mode'],
  ['registered', 'detached-origin'],
] as const) {
  it(`React ${renderer} resolves ${policy} destinations in the same-origin iframe author document`, async () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const doc = frame.contentDocument!;
    const scene = doc.createElement('section');
    const home = doc.createElement('div');
    const destination = doc.createElement('div');
    const next = doc.createElement('div');
    const foreign = document.createElement('div');
    document.body.append(foreign);
    scene.append(home, next);
    if (policy !== 'disconnected') scene.append(destination);
    if (renderer !== 'detached-origin') doc.body.append(scene);
    const releases: Array<() => void> = [];
    if (policy !== 'unregistered')
      releases.push(
        registerWebPortalDestination(scene, policy === 'foreign' ? foreign : destination)
      );
    const counts = { setup: 0, disposed: 0 };
    const Content = createReactAdapter({ ...React, createPortal })(
      definePrototype({
        name: `iframe-portal-${policy}`,
        setup(def) {
          counts.setup++;
          const focus = asFocusable();
          const overlay = asOverlay();
          overlay.configure({ defaultOpen: true, portal: true, entry: 'manual', restore: 'none' });
          def.expose('actions', {
            focus: () => focus.focusSelf(),
            close: () => overlay.close(),
            open: () => overlay.openOverlay(),
          });
          def.lifecycle.onBeforeDispose(() => counts.disposed++);
          return () => 'Iframe content';
        },
      })
    );
    const ref = React.createRef<any>();
    const root = createRoot(home);
    let destroyed = false;
    try {
      await React.act(async () => {
        const content = React.createElement(Content, { ref, className: 'iframe-portal-target' });
        root.render(
          renderer === 'strict-mode'
            ? React.createElement(React.StrictMode, null, content)
            : content
        );
      });
      await settle();
      if (renderer === 'detached-origin') {
        expect(home.querySelector('[data-pui-portal-origin]')?.isConnected).toBe(false);
        expect(doc.querySelector('[data-pui-portal-mount]')).toBeNull();
        expect(document.querySelector('[data-pui-portal-mount]')).toBeNull();
        doc.body.append(scene);
        await React.act(async () =>
          root.render(React.createElement(Content, { ref, className: 'iframe-portal-target' }))
        );
        await settle();
      }
      const host = doc.querySelector<HTMLElement>('.iframe-portal-target')!;
      expect(host).not.toBeNull();
      expect(host.ownerDocument).toBe(doc);
      expect(document.querySelector('.iframe-portal-target')).toBeNull();
      const expected = policy === 'registered' ? destination : doc.body;
      const mount = expectStableReactPortalMount(host, expected);
      expect(mount.ownerDocument).toBe(doc);
      expect(home.querySelector('[data-pui-portal-origin]')?.ownerDocument).toBe(doc);
      await React.act(async () => ref.current.getExposes().actions.focus());
      expect(doc.activeElement).toBe(host);
      let blurs = 0;
      host.addEventListener('blur', () => blurs++);
      await React.act(async () => {
        releases.push(registerWebPortalDestination(scene, next));
      });
      expectStableReactPortalMount(host, expected);
      expect(doc.activeElement).toBe(host);
      expect(blurs).toBe(0);
      expect(isWebPortalMaterialSuspended(host)).toBe(true);
      await React.act(async () => ref.current.getExposes().actions.close());
      await settle();
      await React.act(async () => ref.current.getExposes().actions.open());
      await settle();
      const reopened = doc.querySelector<HTMLElement>('.iframe-portal-target')!;
      expectStableReactPortalMount(reopened, next);
      expect(counts).toEqual({ setup: 1, disposed: 0 });
      await React.act(async () => root.unmount());
      destroyed = true;
      await settle();
      expect(counts).toEqual({ setup: 1, disposed: 1 });
      expect(doc.querySelector('[data-pui-portal-mount]')).toBeNull();
      expect(doc.querySelector('[data-pui-portal-origin]')).toBeNull();
      expect(document.querySelector('[data-pui-portal-mount]')).toBeNull();
      expect(reopened.isConnected).toBe(false);
      releases.push(registerWebPortalDestination(scene, destination));
      expect(reopened.isConnected).toBe(false);
    } finally {
      if (!destroyed) await React.act(async () => root.unmount());
      releases.reverse().forEach((release) => release());
      frame.remove();
      foreign.remove();
    }
  });
}
