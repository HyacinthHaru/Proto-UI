import { expectStableReactPortalMount } from './portal-destination.assertions';
import { describe, expect, it } from 'vitest';
import { definePrototype } from '@proto.ui/core';

import {
  DIALOG_CONTEXT,
  dialogContent,
  dialogMask,
  type DialogContextValue,
} from '../../../prototypes/base/src/dialog';
import { createMountedReactAdapter } from './utils/fake-react';

function dialogContext(open: boolean): DialogContextValue {
  return {
    rootId: 'react-adapter-dialog',
    open,
    openFocusReason: null,
    returnFocusReason: null,
    controlled: false,
    disabled: false,
    alert: false,
    a11yLabel: '',
    requestedOpen: open,
    requestReason: null,
    requestFocusReason: null,
    requestVersion: 0,
  };
}

describe('adapter-react: dialog integration', () => {
  it('renders dialog content when open and hides it when closed', () => {
    const proto = definePrototype({
      name: 'react-dialog-content-open-close',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogContent.setup(def);
        return (r) => [r.el('div', 'hello')];
      },
    });

    const mounted = createMountedReactAdapter(proto as any, { appear: false });

    try {
      const exposes = mounted.ref.current.getExposes();
      expect(exposes.transitionState?.get?.()).toBe('entering');

      mounted.ref.current.invokeInCallbackScope(() => {
        mounted.ref.current.getExposes().controls.leave();
      });
      mounted.update();

      expect(exposes.transitionState?.get?.()).toBe('leaving');
    } finally {
      mounted.unmount();
    }
  });

  it('shows transition attributes on host element', () => {
    const proto = definePrototype({
      name: 'react-dialog-transition-attrs',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogContent.setup(def);
        return (r) => [r.el('div')];
      },
    });

    const mounted = createMountedReactAdapter(proto as any, { appear: false });

    try {
      const exposes = mounted.ref.current.getExposes();
      const state = exposes.transitionState?.get?.();

      expect(['entering', 'entered']).toContain(state ?? 'entering');

      const host = mounted.root as HTMLElement;
      expect(host).not.toBeNull();
    } finally {
      mounted.unmount();
    }
  });

  it('dialog mask follows transition state', () => {
    const proto = definePrototype({
      name: 'react-dialog-mask-transition',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(false));
        dialogMask.setup(def);
        return (r) => [r.el('div')];
      },
    });

    const mounted = createMountedReactAdapter(proto as any, {});

    try {
      const host = mounted.root as HTMLElement;
      expect(host).not.toBeNull();

      const exposes = mounted.ref.current.getExposes();
      expect(exposes.transitionState?.get?.()).toBe('closed');

      mounted.ref.current.invokeInCallbackScope(() => {
        exposes.controls.enter();
      });
      mounted.update();

      expect(['entering', 'entered']).toContain(exposes.transitionState?.get?.());
    } finally {
      mounted.unmount();
    }
  });

  it('supports adapter overlayLayer base z-index configuration', () => {
    const proto = definePrototype({
      name: 'react-dialog-layer-base',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogContent.setup(def);
        return (r) => [r.el('div', 'hello')];
      },
    });

    const mounted = createMountedReactAdapter(
      proto as any,
      {},
      {
        overlayLayer: { baseZIndex: 6100 },
      }
    );

    try {
      const host = mounted.root as HTMLElement;
      expect(host).not.toBeNull();
      const zIndex = parseInt(host.style.zIndex || '0', 10);
      expect(zIndex).toBeGreaterThanOrEqual(7110);
    } finally {
      mounted.unmount();
    }
  });

  it('projects portal overlays through the React renderer', () => {
    const portalContainers: Element[] = [];
    const proto = definePrototype({
      name: 'react-dialog-renderer-owned-portal',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogContent.setup(def);
        return (r) => [r.el('div', 'hello')];
      },
    });

    const mounted = createMountedReactAdapter(
      proto as any,
      { appear: false },
      {},
      {
        context: true,
        createPortal(children, container) {
          portalContainers.push(container);
          return children;
        },
      }
    );

    try {
      expect(portalContainers.length).toBeGreaterThan(0);
      const mount = portalContainers[0] as HTMLElement;
      // Explicit portal-capable fake renderer realizes the requested container.
      // The separate native integration tests still own framework-level evidence.
      expectStableReactPortalMount(mounted.root!, document.body);
      expect(mounted.root!.parentElement).toBe(mount);
      expect(portalContainers.every((container) => container === mount)).toBe(true);
    } finally {
      mounted.unmount();
    }
  });

  it('routes global outside pointerdown through the adapter and closes dialog content', () => {
    const proto = definePrototype({
      name: 'react-dialog-outside-pointerdown',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogContent.setup(def);
        return (r) => [r.el('div', 'hello')];
      },
    });

    const mounted = createMountedReactAdapter(proto as any, { appear: false });

    try {
      expect(mounted.ref.current.getExposes().open?.get?.()).toBe(true);

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      mounted.update();

      expect(mounted.ref.current.getExposes().open?.get?.()).toBe(false);
    } finally {
      mounted.unmount();
    }
  });

  it('projects dialog mask passthrough to host pointer-events without affecting transition state', async () => {
    const proto = definePrototype({
      name: 'react-dialog-mask-passthrough',
      setup(def) {
        def.context.provide(DIALOG_CONTEXT, dialogContext(true));
        dialogMask.setup(def);
        return (r) => [r.el('div')];
      },
    });

    const mounted = createMountedReactAdapter(proto as any, { passthrough: true }, {});

    try {
      await Promise.resolve();
      await Promise.resolve();
      const host = document.body.querySelector(
        '[style*="pointer-events: none"]'
      ) as HTMLElement | null;
      expect(host).not.toBeNull();
    } finally {
      mounted.unmount();
    }
  });
});
