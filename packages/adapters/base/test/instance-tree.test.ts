import { describe, expect, it, vi } from 'vitest';
import { createInstanceTreeMarkers } from '../src';

describe('adapter-base: logical instance tree', () => {
  it('binds owner-level parent identity before either token has a host view', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/logical-instance-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });

    tree.bindLogicalParent(child, parent);

    expect(tree.getLogicalParent(child)).toBe(parent);
    expect(tree.getLogicalRoot(child)).toBeNull();

    tree.bindLogicalParent(child, null);
    expect(tree.getLogicalParent(child)).toBeNull();
  });

  it('clears a host projection without clearing logical ownership', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/logical-projection-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });
    const parentRoot = document.createElement('div');
    const childRoot = document.createElement('div');

    tree.markProtoInstance(parentRoot, { name: 'parent', setup: () => undefined }, parent);
    tree.markProtoInstance(childRoot, { name: 'child', setup: () => undefined }, child);
    tree.bindLogicalParent(child, parent);
    tree.setProtoParent(childRoot, parentRoot);

    tree.clearProtoParentProjection(childRoot);

    expect(tree.getProtoParent(childRoot)).toBeNull();
    expect(tree.getLogicalParent(child)).toBe(parent);
  });

  it('moves route listeners across late and repeatable view targets', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/logical-event-route-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });
    const firstTarget = new EventTarget();
    const secondTarget = new EventTarget();
    const listener = vi.fn();

    tree.setLogicalEventRouteOwner(parent, parent);
    tree.setLogicalEventRouteOwner(child, parent);
    const routeTarget = tree.getLogicalEventTarget(parent);
    routeTarget.addEventListener('press.commit', listener);

    firstTarget.dispatchEvent(new Event('press.commit'));
    expect(listener).not.toHaveBeenCalled();

    tree.bindLogicalEventTarget(child, firstTarget);
    firstTarget.dispatchEvent(new Event('press.commit'));
    expect(listener).toHaveBeenCalledOnce();

    tree.bindLogicalEventTarget(child, secondTarget);
    firstTarget.dispatchEvent(new Event('press.commit'));
    secondTarget.dispatchEvent(new Event('press.commit'));
    expect(listener).toHaveBeenCalledTimes(2);

    tree.unbindLogicalEventTarget(child, secondTarget);
    secondTarget.dispatchEvent(new Event('press.commit'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('projects the logical route owner token onto an attached trigger root', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/logical-route-owner-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });
    const childRoot = document.createElement('div') as unknown as HTMLElement &
      Record<symbol, unknown>;
    const ownerMark = Symbol.for('@proto.ui/as-trigger/confirm-owner');

    tree.setLogicalEventRouteOwner(child, parent);
    tree.markProtoInstance(childRoot, { name: 'child', setup: () => undefined }, child);

    expect(childRoot[ownerMark]).toBe(parent);
    expect(tree.getLogicalEventRouteOwner(child)).toBe(parent);
  });

  it('keeps the deepest continuous trigger as the shared host surface regardless of setup order', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/logical-trigger-surface-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });
    const parentRoot = document.createElement('div');
    const childRoot = document.createElement('button');
    const listener = vi.fn();

    tree.bindLogicalParent(child, parent);
    tree.markProtoInstance(parentRoot, { name: 'parent', setup: () => undefined }, parent);
    tree.markProtoInstance(childRoot, { name: 'child', setup: () => undefined }, child);
    tree.subscribeLogicalTriggerSurface(parent, listener);

    tree.setLogicalEventRouteOwner(child, parent);
    tree.setLogicalEventRouteOwner(parent, parent);

    expect(tree.getLogicalTriggerSurfaceOwner(parent)).toBe(child);
    expect(tree.getLogicalTriggerSurfaceRoot(parent)).toBe(childRoot);
    expect(listener).toHaveBeenCalled();
  });

  it('reconciles a child trigger when its parent host materializes later', () => {
    const tree = createInstanceTreeMarkers('@proto.ui/test/late-trigger-parent-tree');
    const parent = tree.createLogicalInstance({ name: 'parent', setup: () => undefined });
    const child = tree.createLogicalInstance({ name: 'child', setup: () => undefined });
    const parentRoot = document.createElement('div');
    const childRoot = document.createElement('button') as unknown as HTMLElement &
      Record<symbol, unknown>;
    const childLabel = document.createTextNode('Open');
    const ownerMark = Symbol.for('@proto.ui/as-trigger/confirm-owner');

    childRoot.appendChild(childLabel);
    parentRoot.appendChild(childRoot);
    tree.markProtoInstance(childRoot, { name: 'child', setup: () => undefined }, child);
    tree.setLogicalEventRouteOwner(child, child);
    tree.markProtoInstance(parentRoot, { name: 'parent', setup: () => undefined }, parent);
    tree.setLogicalEventRouteOwner(parent, parent);

    expect(tree.getLogicalParent(child)).toBe(parent);
    expect(tree.getLogicalEventRouteOwner(child)).toBe(parent);
    expect(tree.getLogicalEventRouteSurfaceForTarget(childRoot)).toBe(child);
    expect(tree.getLogicalEventRouteSurfaceForTarget(childLabel)).toBe(child);
    expect(tree.getLogicalTriggerSurfaceOwner(parent)).toBe(child);
    expect(childRoot[ownerMark]).toBe(parent);
  });
});
