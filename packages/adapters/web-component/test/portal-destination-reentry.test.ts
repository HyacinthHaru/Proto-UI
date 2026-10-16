import { afterEach, expect, it, vi } from 'vitest';
import { registerWebPortalDestination, subscribeWebPortalProjection } from '@proto.ui/adapter-base';
import { createWebComponentPortalMount, isWebComponentPortaled } from '../src/portal-mount';
import {
  getProtoParent,
  markProtoInstance,
  mergeLogicalTriggerGroup,
  subscribeLogicalTriggerSurface,
} from '../src/platform/instance-tree';

const releases: Array<() => void> = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const release of releases.splice(0).reverse()) release();
  document.body.replaceChildren();
});
const retain = (release: () => void) => {
  releases.push(release);
  return release;
};
function fixture() {
  const scene = document.createElement('section');
  const owner = document.createElement('div');
  const target = document.createElement('div');
  const destination = document.createElement('div');
  const replacement = document.createElement('div');
  owner.append(target);
  scene.append(owner, destination, replacement);
  document.body.append(scene);
  const proto = { name: 'wc-destination-reentry', setup: () => undefined };
  const parent = markProtoInstance(owner, proto);
  const token = markProtoInstance(target, proto);
  mergeLogicalTriggerGroup(parent, parent);
  mergeLogicalTriggerGroup(token, parent);
  const initialRelease = retain(registerWebPortalDestination(scene, destination));
  return { scene, owner, target, destination, replacement, token, initialRelease };
}

it('WC retiring logical-parent notification cannot erase a newer destination projection', () => {
  const f = fixture();
  const oldMount = createWebComponentPortalMount();
  const newMount = createWebComponentPortalMount();
  retain(() => oldMount.unmount(f.target));
  retain(() => newMount.unmount(f.target));
  oldMount.mount(f.target);
  expect(f.target.parentNode).toBe(f.destination);
  let replaced = false;
  const stop = retain(
    subscribeLogicalTriggerSurface(f.token, () => {
      if (replaced) return;
      replaced = true;
      f.owner.append(f.target);
      retain(registerWebPortalDestination(f.scene, f.replacement));
      newMount.mount(f.target);
    })
  );
  oldMount.unmount(f.target);
  expect(replaced).toBe(true);
  expect(f.target.parentNode).toBe(f.replacement);
  expect(getProtoParent(f.target)).toBe(f.owner);
  expect(isWebComponentPortaled(f.target)).toBe(true);
  f.initialRelease();
  oldMount.unmount(f.target);
  expect(f.target.parentNode).toBe(f.replacement);
  retain(registerWebPortalDestination(f.scene, f.destination));
  // The newer live view retains its selected destination until release.
  expect(f.target.parentNode).toBe(f.replacement);
  stop();
  newMount.unmount(f.target);
  expect(f.target.parentNode).toBe(f.owner);
  expect(f.owner.childNodes).toHaveLength(1);
  expect(isWebComponentPortaled(f.target)).toBe(false);
});

it('WC terminal release from projection notification cannot be resurrected by late registration', () => {
  const f = fixture();
  const mount = createWebComponentPortalMount();
  retain(() => mount.unmount(f.target));
  let retired = false;
  retain(
    subscribeWebPortalProjection(f.target, () => {
      if (retired) return;
      retired = true;
      mount.unmount(f.target);
    })
  );
  mount.mount(f.target);
  expect(retired).toBe(true);
  expect(f.target.parentNode).toBe(f.owner);
  expect(f.owner.childNodes).toHaveLength(1);
  expect(isWebComponentPortaled(f.target)).toBe(false);
  retain(registerWebPortalDestination(f.scene, f.replacement));
  expect(f.target.parentNode).toBe(f.owner);
});

it('WC release before the first mount acquires no destination or projection lease', () => {
  const f = fixture();
  const mount = createWebComponentPortalMount();
  const projected = vi.fn();
  retain(subscribeWebPortalProjection(f.target, projected));
  mount.unmount(f.target);
  retain(registerWebPortalDestination(f.scene, f.replacement));
  expect(f.target.parentNode).toBe(f.owner);
  expect(f.owner.childNodes).toHaveLength(1);
  expect(projected).not.toHaveBeenCalled();
  expect(isWebComponentPortaled(f.target)).toBe(false);
});
