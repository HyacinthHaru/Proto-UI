import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isWebPortalMaterialSuspended,
  registerWebPortalDestination,
  subscribeWebPortalMaterialSuspension,
  subscribeWebPortalProjection,
} from '../src/platform/portal-destination';
import {
  createVue2OverlayGlobalMount,
  refreshVue2PortalDestination,
} from '../../vue2/src/runtime/modules';
import { createLogicalInstance } from '../../vue2/src/platform/instance-tree';
import {
  createWebComponentPortalMount,
  isWebComponentPortaled,
  refreshWebComponentPortalProjection,
} from '../../web-component/src/portal-mount';
import {
  getProtoParent,
  markProtoInstance,
  mergeLogicalTriggerGroup,
  subscribeLogicalTriggerSurface,
} from '../../web-component/src/platform/instance-tree';

const releases: Array<() => void> = [];
const retain = (release: () => void) => {
  releases.push(release);
  return release;
};
afterEach(() => {
  for (const release of releases.splice(0).reverse()) release();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function fixture() {
  const scene = document.createElement('section');
  const owner = document.createElement('div');
  const target = document.createElement('div');
  const destination = document.createElement('div');
  const replacement = document.createElement('div');
  owner.append(target);
  scene.append(owner, destination, replacement);
  document.body.append(scene);
  return { scene, owner, target, destination, replacement };
}

describe('web-component retired epoch callback ownership', () => {
  for (const callback of ['material-release', 'logical-parent-release'] as const) {
    for (const sameDestination of [true, false]) {
      it(`preserves the new owner after ${callback} reenters a ${sameDestination ? 'same' : 'different'} destination mount`, () => {
        const f = fixture();
        const proto = { name: 'wc-material-release-reentry', setup: () => undefined };
        const ownerToken = markProtoInstance(f.owner, proto);
        const token = markProtoInstance(f.target, proto);
        mergeLogicalTriggerGroup(ownerToken, ownerToken);
        mergeLogicalTriggerGroup(token, ownerToken);
        retain(registerWebPortalDestination(f.scene, f.destination));
        const oldMount = createWebComponentPortalMount();
        const newMount = createWebComponentPortalMount();
        retain(() => oldMount.unmount(f.target));
        retain(() => newMount.unmount(f.target));
        oldMount.mount(f.target);
        const projected = vi.fn();
        retain(subscribeWebPortalProjection(f.target, projected));
        let replaced = false;
        const replace = () => {
          if (replaced) return;
          if (callback === 'material-release' && !isWebPortalMaterialSuspended(f.target)) return;
          replaced = true;
          f.owner.append(f.target);
          if (!sameDestination) retain(registerWebPortalDestination(f.scene, f.replacement));
          newMount.mount(f.target);
        };
        // These are actual synchronous material/logical-surface notifications.
        // The injected remount is a deterministic ownership control, not native
        // blur, browser Custom Element reaction timing, or optical evidence.
        const stop = retain(
          callback === 'material-release'
            ? subscribeWebPortalMaterialSuspension(f.target, replace)
            : subscribeLogicalTriggerSurface(token, replace)
        );
        oldMount.unmount(f.target);
        expect(replaced).toBe(true);
        expect(f.target.parentNode).toBe(sameDestination ? f.destination : f.replacement);
        expect(getProtoParent(f.target)).toBe(f.owner);
        expect(isWebComponentPortaled(f.target)).toBe(true);
        expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
        expect(projected).toHaveBeenCalledTimes(1);
        oldMount.unmount(f.target);
        expect(projected).toHaveBeenCalledTimes(1);
        stop();
        newMount.unmount(f.target);
        expect(f.target.parentNode).toBe(f.owner);
        expect(f.owner.childNodes).toHaveLength(1);
        expect(isWebComponentPortaled(f.target)).toBe(false);
        expect(projected).toHaveBeenCalledTimes(2);
      });
    }
  }

  it('does not publish an old restore after its native insertion remounts the host', () => {
    const f = fixture();
    const proto = { name: 'wc-native-restore-reentry', setup: () => undefined };
    markProtoInstance(f.owner, proto);
    markProtoInstance(f.target, proto);
    retain(registerWebPortalDestination(f.scene, f.destination));
    const oldMount = createWebComponentPortalMount();
    const newMount = createWebComponentPortalMount();
    retain(() => oldMount.unmount(f.target));
    retain(() => newMount.unmount(f.target));
    oldMount.mount(f.target);
    const projected = vi.fn();
    retain(subscribeWebPortalProjection(f.target, projected));
    let replaced = false;
    const insert = f.owner.insertBefore.bind(f.owner);
    // Complete the actual DOM write, then inject a synchronous host reaction.
    // This checks callback ownership, not browser Custom Element scheduling.
    vi.spyOn(f.owner, 'insertBefore').mockImplementation((node, reference) => {
      const inserted = insert(node, reference);
      if (node === f.target && !replaced) {
        replaced = true;
        newMount.mount(f.target);
      }
      return inserted;
    });
    oldMount.unmount(f.target);
    expect(replaced).toBe(true);
    expect(f.target.parentNode).toBe(f.destination);
    expect(getProtoParent(f.target)).toBe(f.owner);
    expect(isWebComponentPortaled(f.target)).toBe(true);
    expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
    expect(projected).toHaveBeenCalledTimes(1);
  });

  it('does not regain cleanup authority after a replacement epoch also retires', () => {
    const f = fixture();
    retain(registerWebPortalDestination(f.scene, f.destination));
    const oldMount = createWebComponentPortalMount();
    const newMount = createWebComponentPortalMount();
    retain(() => oldMount.unmount(f.target));
    retain(() => newMount.unmount(f.target));
    oldMount.mount(f.target);
    const projected = vi.fn();
    retain(subscribeWebPortalProjection(f.target, projected));
    let replaced = false;
    retain(
      subscribeWebPortalMaterialSuspension(f.target, () => {
        if (replaced || !isWebPortalMaterialSuspended(f.target)) return;
        replaced = true;
        f.owner.append(f.target);
        newMount.mount(f.target);
        newMount.unmount(f.target);
      })
    );
    oldMount.unmount(f.target);
    expect(replaced).toBe(true);
    expect(f.target.parentNode).toBe(f.owner);
    expect(f.owner.childNodes).toHaveLength(1);
    expect(isWebComponentPortaled(f.target)).toBe(false);
    expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
    expect(projected).toHaveBeenCalledTimes(2);
  });
});

describe('vue2 retired direction ownership', () => {
  it.each(['rtl', 'ltr'] as const)(
    'releases the old direction before material notification remounts under %s',
    (nextDirection) => {
      const f = fixture();
      f.owner.style.direction = 'rtl';
      retain(registerWebPortalDestination(f.scene, f.destination));
      const token = createLogicalInstance({
        name: 'vue2-material-release-reentry',
        setup: () => undefined,
      });
      const oldMount = createVue2OverlayGlobalMount(token);
      const newMount = createVue2OverlayGlobalMount(token);
      retain(() => oldMount.unmount(f.target));
      retain(() => newMount.unmount(f.target));
      oldMount.mount(f.target);
      expect(f.target.dir).toBe('rtl');
      let replaced = false;
      const stop = retain(
        subscribeWebPortalMaterialSuspension(f.target, () => {
          if (replaced || !isWebPortalMaterialSuspended(f.target)) return;
          replaced = true;
          f.owner.append(f.target);
          f.owner.style.direction = nextDirection;
          newMount.mount(f.target);
        })
      );
      // Real synchronous material lease release notification; the fixture
      // explicitly remounts there, without asserting native focus timing.
      oldMount.unmount(f.target);
      expect(replaced).toBe(true);
      expect(f.target.parentNode).toBe(f.destination);
      expect(f.target.dir).toBe(nextDirection);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
      f.owner.style.direction = nextDirection === 'rtl' ? 'ltr' : 'rtl';
      window.dispatchEvent(new Event('resize'));
      expect(f.target.dir).toBe(f.owner.style.direction);
      stop();
      newMount.unmount(f.target);
      expect(f.target.hasAttribute('dir')).toBe(false);
      window.dispatchEvent(new Event('resize'));
      expect(f.target.hasAttribute('dir')).toBe(false);
      expect(f.owner.childNodes).toHaveLength(1);
    }
  );
});

for (const adapter of ['vue2', 'web-component'] as const) {
  describe(`${adapter} fixed destination per physical epoch`, () => {
    const create = () =>
      adapter === 'vue2'
        ? createVue2OverlayGlobalMount(
            createLogicalInstance({ name: 'deferred-portal', setup: () => undefined })
          )
        : createWebComponentPortalMount();
    const refresh =
      adapter === 'vue2' ? refreshVue2PortalDestination : refreshWebComponentPortalProjection;

    it('defers relevant replacement/revocation while preserving Content and resets on the next epoch', () => {
      const f = fixture();
      const unregister = retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      const projected = vi.fn();
      retain(subscribeWebPortalProjection(f.target, projected));
      const admittedParents: Array<Node | null> = [];
      retain(
        subscribeWebPortalMaterialSuspension(f.target, () => {
          if (!isWebPortalMaterialSuspended(f.target)) admittedParents.push(f.target.parentNode);
        })
      );
      mount.mount(f.target);
      expect(f.target.parentNode).toBe(f.destination);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
      expect(projected).toHaveBeenCalledTimes(1);
      expect(admittedParents).toEqual([f.destination]);
      const replacementWrite = vi.spyOn(f.replacement, 'appendChild');
      const bodyWrite = vi.spyOn(document.body, 'appendChild');
      const replace = retain(registerWebPortalDestination(f.scene, f.replacement));
      expect(f.target.parentNode).toBe(f.destination);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      expect(projected).toHaveBeenCalledTimes(1);
      expect(replacementWrite).not.toHaveBeenCalled();
      expect(bodyWrite).not.toHaveBeenCalled();
      replace();
      unregister();
      expect(f.target.parentNode).toBe(f.destination);
      expect(f.target.isConnected).toBe(true);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      mount.unmount(f.target);
      expect(f.target.parentNode).toBe(f.owner);
      mount.mount(f.target);
      expect(f.target.parentNode).toBe(document.body);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
      expect(admittedParents).toEqual([f.destination, document.body]);
    });

    it('ignores another scene but detects same-destination policy replacement and never resumes that epoch', () => {
      const f = fixture();
      retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      mount.mount(f.target);
      const unrelated = fixture();
      retain(registerWebPortalDestination(unrelated.scene, unrelated.destination));
      expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
      refresh(f.target);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
      retain(registerWebPortalDestination(f.scene, f.destination));
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      refresh(f.target);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      expect(f.target.parentNode).toBe(f.destination);
    });

    it('withdraws for an unsafe destination without a physical move or false projection signal', () => {
      const f = fixture();
      retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      mount.mount(f.target);
      const projected = vi.fn();
      retain(subscribeWebPortalProjection(f.target, projected));
      f.destination.style.overflow = 'hidden';
      refresh(f.target);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      expect(f.target.parentNode).toBe(f.destination);
      expect(projected).not.toHaveBeenCalled();
      f.destination.style.overflow = 'visible';
      refresh(f.target);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
    });

    it('does not claim continuity or silently reconnect an externally removed mount', () => {
      const f = fixture();
      retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      mount.mount(f.target);
      const projected = vi.fn();
      retain(subscribeWebPortalProjection(f.target, projected));
      f.destination.remove();
      refresh(f.target);
      expect(f.target.isConnected).toBe(false);
      expect(f.target.parentNode).toBe(f.destination);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      expect(projected).not.toHaveBeenCalled();
    });

    it('allows terminal teardown from suspension without reviving the retired projection', () => {
      const f = fixture();
      retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      mount.mount(f.target);
      retain(
        subscribeWebPortalMaterialSuspension(f.target, () => {
          if (isWebPortalMaterialSuspended(f.target)) mount.unmount(f.target);
        })
      );
      retain(registerWebPortalDestination(f.scene, f.replacement));
      expect(f.target.parentNode).toBe(f.owner);
      retain(registerWebPortalDestination(f.scene, f.destination));
      expect(f.target.parentNode).toBe(f.owner);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
    });

    it('cannot admit stale material when native initial insertion reenters destination replacement', () => {
      const f = fixture();
      retain(registerWebPortalDestination(f.scene, f.destination));
      const mount = create();
      retain(() => mount.unmount(f.target));
      const admitted = vi.fn();
      retain(
        subscribeWebPortalMaterialSuspension(f.target, () => {
          if (!isWebPortalMaterialSuspended(f.target)) admitted();
        })
      );
      const append = f.destination.appendChild.bind(f.destination);
      vi.spyOn(f.destination, 'appendChild').mockImplementation((node) => {
        const inserted = append(node);
        retain(registerWebPortalDestination(f.scene, f.replacement));
        return inserted;
      });
      mount.mount(f.target);
      expect(f.target.parentNode).toBe(f.destination);
      expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      expect(admitted).not.toHaveBeenCalled();
    });
  });
}
