import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { definePrototype } from '@proto.ui/core';
import { asOverlay } from '@proto.ui/hooks';

import { createReactAdapter } from '../src';
import { createReactOverlayGlobalMount } from '../src/runtime/modules';
import {
  bindLogicalParent,
  createLogicalInstance,
  getProtoParent,
  markProtoInstance,
} from '../src/platform/instance-tree';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('adapter-react: overlay portal ownership', () => {
  it('never reparents a React-owned host node imperatively', () => {
    const parentProto = definePrototype({
      name: 'react-overlay-owner-parent',
      setup: () => (r) => r.el('div'),
    });
    const childProto = definePrototype({
      name: 'react-overlay-owner-child',
      setup: () => (r) => r.el('div'),
    });
    const parentToken = createLogicalInstance(parentProto as any);
    const childToken = createLogicalInstance(childProto as any);
    bindLogicalParent(childToken, parentToken);

    const parentRoot = document.createElement('div');
    const reactContainer = document.createElement('div');
    const childRoot = document.createElement('div');
    reactContainer.appendChild(childRoot);
    document.body.append(parentRoot, reactContainer);
    markProtoInstance(parentRoot, parentProto as any, parentToken);
    markProtoInstance(childRoot, childProto as any, childToken);

    const globalMount = createReactOverlayGlobalMount(childToken);

    try {
      globalMount.mount(childRoot);

      expect(childRoot.parentNode).toBe(reactContainer);
      expect(getProtoParent(childRoot)).toBe(parentRoot);

      globalMount.unmount(childRoot);

      expect(childRoot.parentNode).toBe(reactContainer);
    } finally {
      parentRoot.remove();
      reactContainer.remove();
    }
  });

  it('withdraws foreign-Document resources without trusting target ownerDocument', async () => {
    const host = document.createElement('div');
    const frame = document.createElement('iframe');
    document.body.append(host, frame);
    const foreign = frame.contentDocument!;
    const floating = foreign.createElement('div');
    const floatingStyle = floating.style;
    foreign.body.append(floating);
    const external = document.createElement('div');
    document.body.append(external);
    const originalOverflow = document.body.style.overflow;
    const foreignOverflow = foreign.body.style.overflow;
    const counts = { setup: 0, disposed: 0, ownerDocumentReads: 0 };
    const changes: boolean[] = [];
    const proto = definePrototype({
      name: 'react-overlay-document-scope',
      setup(def) {
        counts.setup++;
        const overlay = asOverlay();
        overlay.configure({ defaultOpen: true, portal: false, modal: true });
        overlay.open.watch((_run, event) => {
          if (event.type === 'next') changes.push(event.next);
        });
        def.expose('actions', {
          register: (target: HTMLElement) => overlay.registerContent(target),
          reconcile: () => overlay.updatePosition({}),
          isOpen: () => overlay.isOpen(),
        });
        def.lifecycle.onBeforeDispose(() => counts.disposed++);
        return (r) => r.el('span', 'Document-scoped content');
      },
    });
    const Content = createReactAdapter(React)(proto);
    const ref = React.createRef<any>();
    const renderer = createRoot(host);
    const flush = async () =>
      act(async () => {
        await Promise.resolve();
      });
    try {
      await act(async () => renderer.render(React.createElement(Content, { ref })));
      await flush();
      const root = host.querySelector<HTMLElement>('[data-pui-root]')!;
      const actions = ref.current.getExposes().actions;
      expect(root.style.zIndex).not.toBe('');
      expect(document.body.style.overflow).toBe('hidden');

      await act(async () => {
        actions.register(floating);
        actions.reconcile();
      });
      await flush();
      expect(floatingStyle.zIndex).toBe('');
      expect(root.style.zIndex).toBe('');
      expect(document.body.style.overflow).toBe(originalOverflow);
      expect(foreign.body.style.overflow).toBe(foreignOverflow);
      expect(actions.isOpen()).toBe(true);
      expect(changes).toEqual([]);

      await act(async () => {
        actions.register(external);
        actions.reconcile();
      });
      await flush();
      expect(external.style.zIndex).not.toBe('');
      expect(document.body.style.overflow).toBe('hidden');
      expect(root.contains(external)).toBe(false);

      Object.defineProperty(floating, 'ownerDocument', {
        configurable: true,
        get() {
          counts.ownerDocumentReads++;
          return document;
        },
      });
      await act(async () => {
        actions.register(floating);
        actions.reconcile();
      });
      await flush();
      expect(counts.ownerDocumentReads).toBe(0);
      expect(floatingStyle.zIndex).toBe('');
      expect(external.style.zIndex).toBe('');
      expect(document.body.style.overflow).toBe(originalOverflow);
      expect(foreign.body.style.overflow).toBe(foreignOverflow);
      expect(actions.isOpen()).toBe(true);
      expect(changes).toEqual([]);
      expect(counts.setup).toBe(1);
      expect(counts.disposed).toBe(0);
    } finally {
      Reflect.deleteProperty(floating, 'ownerDocument');
      await act(async () => renderer.unmount());
      floating.remove();
      external.remove();
      frame.remove();
      host.remove();
    }
    expect(counts.disposed).toBe(1);
  });
});
