import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginWebPortalMaterialEpoch,
  getWebPortalDestinationGeneration,
  getWebPortalMaterialSuspensionGeneration,
  getWebPortalProjectionGeneration,
  isWebPortalMaterialSuspended,
  notifyWebPortalProjection,
  registerWebPortalDestination,
  resolveWebPortalDestination,
  resolveWebPortalDestinationBinding,
  subscribeWebPortalDestinations,
  subscribeWebPortalMaterialSuspension,
  subscribeWebPortalProjection,
} from '../src/platform/portal-destination';

const releases: Array<() => void> = [];
const retain = <T extends () => void>(release: T): T => {
  releases.push(release);
  return release;
};
afterEach(() => {
  // Stop subscribers before removing their registrations.
  for (const release of releases.splice(0).reverse()) release();
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

function fixture() {
  const scope = document.createElement('section');
  const component = document.createElement('div');
  const origin = document.createComment('logical author position');
  const target = document.createElement('div');
  const destination = document.createElement('div');
  component.append(origin, target);
  scope.append(component, destination);
  document.body.append(scope);
  return { scope, component, origin, target, destination };
}
function register(scope: Element, destination: HTMLElement) {
  return retain(registerWebPortalDestination(scope, destination));
}

describe('explicit Web portal destination policy', () => {
  it('returns a nearest opaque policy identity independently of destination eligibility', () => {
    const f = fixture();
    expect(resolveWebPortalDestinationBinding(f.origin, f.target)).toEqual({
      destination: document.body,
      registration: null,
    });
    register(f.scope, f.destination);
    const first = resolveWebPortalDestinationBinding(f.origin, f.target);
    const unrelated = fixture();
    register(unrelated.scope, unrelated.destination);
    expect(resolveWebPortalDestinationBinding(f.origin, f.target)).toEqual(first);
    expect(Object.keys(first.registration!)).toEqual([]);
    f.destination.style.overflow = 'hidden';
    expect(resolveWebPortalDestinationBinding(f.origin, f.target)).toEqual({
      destination: document.body,
      registration: first.registration,
    });
    f.destination.style.overflow = 'visible';
    register(f.scope, f.destination);
    const replacement = resolveWebPortalDestinationBinding(f.origin, f.target);
    expect(replacement.destination).toBe(first.destination);
    expect(replacement.registration).not.toBe(first.registration);
  });
  it('keeps the body default and never moves nodes or eagerly signals a projection', () => {
    const { scope, component, origin, target, destination } = fixture();
    const projected = vi.fn();
    retain(subscribeWebPortalProjection(target, projected));
    expect(resolveWebPortalDestination(origin, target)).toBe(document.body);
    expect(resolveWebPortalDestination(null, target)).toBe(document.body);
    const release = register(scope, destination);
    expect(resolveWebPortalDestination(origin)).toBe(document.body);
    expect(resolveWebPortalDestination(document)).toBe(document.body);
    expect(resolveWebPortalDestination(origin, target)).toBe(destination);
    expect(target.parentNode).toBe(component);
    expect(projected).not.toHaveBeenCalled();
    release();
    expect(resolveWebPortalDestination(origin, target)).toBe(document.body);
  });

  it('escapes a component clip into its application scene sibling mount', () => {
    const { scope, component, origin, target, destination } = fixture();
    component.style.overflow = 'hidden';
    component.style.transform = 'translateX(1px)';
    scope.style.isolation = 'isolate';
    register(scope, destination);
    expect(resolveWebPortalDestination(origin, target)).toBe(destination);
    component.append(destination);
    expect(resolveWebPortalDestination(origin, target)).toBe(document.body);
  });

  it('uses nearest author scope, isolates siblings and re-resolves after inner disposal', () => {
    const outer = fixture();
    const inner = fixture();
    outer.component.append(inner.scope);
    const sibling = fixture();
    register(outer.scope, outer.destination);
    const releaseInner = register(inner.scope, inner.destination);
    expect(resolveWebPortalDestination(inner.origin, inner.target)).toBe(inner.destination);
    expect(resolveWebPortalDestination(outer.origin, outer.target)).toBe(outer.destination);
    expect(resolveWebPortalDestination(sibling.origin, sibling.target)).toBe(document.body);
    inner.destination.remove();
    // An invalid inner policy does not silently select a different scene.
    expect(resolveWebPortalDestination(inner.origin, inner.target)).toBe(document.body);
    releaseInner();
    expect(resolveWebPortalDestination(inner.origin, inner.target)).toBe(outer.destination);
  });

  it('follows the retained origin on explicit re-resolution, never the projected parent', () => {
    const a = fixture();
    const b = fixture();
    register(a.scope, a.destination);
    register(b.scope, b.destination);
    b.destination.append(a.target); // Adapter-owned projection simulated explicitly.
    expect(resolveWebPortalDestination(a.origin, a.target)).toBe(a.destination);
    b.component.append(a.origin);
    expect(resolveWebPortalDestination(a.origin, a.target)).toBe(b.destination);
    a.origin.remove();
    expect(resolveWebPortalDestination(a.origin, a.target)).toBe(document.body);
    a.component.append(a.origin);
    expect(resolveWebPortalDestination(a.origin, a.target)).toBe(a.destination);
  });

  it('traverses slotted origins and shadow hosts, including destination clip ancestors', () => {
    const f = fixture();
    const shadowHost = document.createElement('div');
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    const slotted = document.createElement('span');
    shadow.append(slot, f.destination);
    shadowHost.append(slotted);
    f.scope.append(shadowHost);
    register(f.scope, f.destination);
    expect(resolveWebPortalDestination(slotted, f.target)).toBe(f.destination);
    shadowHost.style.overflow = 'clip';
    expect(resolveWebPortalDestination(slotted, f.target)).toBe(document.body);
  });

  it('rejects disconnected, cyclic, shadow-cyclic and foreign-document destinations', () => {
    const f = fixture();
    register(f.scope, f.destination);
    f.destination.remove();
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    f.target.append(f.destination);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    f.target.attachShadow({ mode: 'open' }).append(f.destination);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    register(f.scope, f.target);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    const foreign = document.implementation.createHTMLDocument();
    const foreignMount = foreign.createElement('div');
    foreign.body.append(foreignMount);
    register(f.scope, foreignMount);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    expect(resolveWebPortalDestination(foreignMount, f.target)).toBe(document.body);
  });

  it('rejects external mounts and the scene itself rather than losing nested author origins', () => {
    const f = fixture();
    const external = document.createElement('div');
    document.body.append(external);
    register(f.scope, external);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    register(f.scope, f.scope);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    register(f.scope, f.destination);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(f.destination);
    // A nested author created after its parent was projected still resolves
    // against the same explicit scene because that scene contains both mounts.
    f.destination.append(f.target);
    const nestedOrigin = document.createComment('nested author');
    const nestedTarget = document.createElement('div');
    f.target.append(nestedOrigin, nestedTarget);
    expect(resolveWebPortalDestination(nestedOrigin, nestedTarget)).toBe(f.destination);
  });

  it('retires document-bound registration on adoption until explicitly registered again', () => {
    const f = fixture();
    register(f.scope, f.destination);
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const foreign = iframe.contentDocument!;
    // happy-dom adopts only the explicit node, unlike native deep adoption.
    // Adopt each identity and restore the same tree for this ownership control.
    for (const node of [f.scope, f.component, f.origin, f.target, f.destination])
      foreign.adoptNode(node);
    foreign.body.append(f.scope);
    f.scope.append(f.component, f.destination);
    f.component.append(f.origin, f.target);
    expect(f.target.ownerDocument).toBe(foreign);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(foreign.body);
    register(f.scope, f.destination);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(f.destination);
  });

  // These controlled computed styles test conservative selection only. They do
  // not establish browser layout, material source admission or optical paint.
  it.each([
    ['overflow', 'hidden'],
    ['overflow-x', 'auto'],
    ['overflow-y', 'scroll'],
    ['overflow', 'clip'],
    ['transform', 'translateX(1px)'],
    ['translate', '1px'],
    ['rotate', '1deg'],
    ['scale', '2'],
    ['perspective', '100px'],
    ['filter', 'blur(1px)'],
    ['backdrop-filter', 'blur(1px)'],
    ['-webkit-backdrop-filter', 'blur(1px)'],
    ['clip-path', 'inset(1px)'],
    ['mask-image', 'linear-gradient(black, transparent)'],
    ['-webkit-mask-image', 'linear-gradient(black, transparent)'],
    ['mask-border-source', 'linear-gradient(black, transparent)'],
    ['transform-style', 'preserve-3d'],
    ['contain', 'layout'],
    ['contain', 'paint'],
    ['contain', 'strict'],
    ['contain', 'content'],
    ['will-change', 'transform'],
    ['will-change', 'filter, opacity'],
    ['will-change', 'contain'],
    ['content-visibility', 'auto'],
    ['container-type', 'inline-size'],
    ['zoom', '2'],
    ['clip', 'rect(0px, 10px, 10px, 0px)'],
    ['display', 'none'],
    ['visibility', 'hidden'],
  ])('rejects actual destination ancestor %s: %s', (property, value) => {
    const f = fixture();
    register(f.scope, f.destination);
    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const css = computed(element);
      if (element !== f.scope) return css;
      // Some modern CSS values are absent from the simulated DOM's parser.
      return new Proxy(css, {
        get(object, key) {
          if (key === 'getPropertyValue')
            return (name: string) => (name === property ? value : object.getPropertyValue(name));
          if (key === 'contain' && property === 'contain') return value;
          if (key === 'willChange' && property === 'will-change') return value;
          if (key === 'display' && property === 'display') return value;
          if (key === 'visibility' && property === 'visibility') return value;
          return Reflect.get(object, key);
        },
      });
    });
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
  });

  it('checks the destination itself and document ancestors, with conservative read failure', () => {
    const f = fixture();
    register(f.scope, f.destination);
    f.destination.style.overflow = 'hidden';
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    f.destination.style.overflow = 'visible';
    document.documentElement.style.perspective = '100px';
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    document.documentElement.style.perspective = 'none';
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(f.destination);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('host style unavailable');
    });
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
  });

  it('cannot publish the old destination after reentrant replacement during a host read', () => {
    const f = fixture();
    const replacement = document.createElement('div');
    f.scope.append(replacement);
    register(f.scope, f.destination);
    const computed = window.getComputedStyle.bind(window);
    let replaced = false;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (!replaced) {
        replaced = true;
        register(f.scope, replacement);
      }
      return computed(element);
    });
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(replacement);
  });

  it.each(['origin', 'destination'] as const)(
    'rejects a %s ancestry changed reentrantly during validation',
    (changedNode) => {
      const f = fixture();
      const inner = document.createElement('section');
      const innerDestination = document.createElement('div');
      inner.append(innerDestination);
      f.scope.append(inner);
      register(f.scope, f.destination);
      register(inner, innerDestination);
      const computed = window.getComputedStyle.bind(window);
      let changed = false;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
        if (!changed) {
          changed = true;
          inner.append(f[changedNode]);
        }
        return computed(element);
      });
      expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
      expect(resolveWebPortalDestination(f.origin, f.target)).toBe(
        changedNode === 'origin' ? innerDestination : f.destination
      );
    }
  );
});

describe('portal registry and projection generations', () => {
  it('signals registration/replacement/current disposal exactly once; stale disposal is inert', () => {
    const f = fixture();
    const listener = vi.fn();
    const stop = retain(subscribeWebPortalDestinations(listener));
    const initial = getWebPortalDestinationGeneration();
    expect(listener).not.toHaveBeenCalled();
    const old = register(f.scope, f.destination);
    const current = register(f.scope, f.destination);
    expect(getWebPortalDestinationGeneration()).toBe(initial + 2);
    old();
    old();
    expect(getWebPortalDestinationGeneration()).toBe(initial + 2);
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(f.destination);
    current();
    current();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(getWebPortalDestinationGeneration()).toBe(initial + 3);
    stop();
    register(f.scope, f.destination);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('serializes reentrant registration and does not notify other consumers with stale state', () => {
    const f = fixture();
    const replacement = document.createElement('div');
    f.scope.append(replacement);
    let changed = false;
    retain(
      subscribeWebPortalDestinations(() => {
        if (changed) return;
        changed = true;
        register(f.scope, replacement);
      })
    );
    const observed: HTMLElement[] = [];
    retain(
      subscribeWebPortalDestinations(() => {
        observed.push(resolveWebPortalDestination(f.origin, f.target));
      })
    );
    const stale = register(f.scope, f.destination);
    expect(observed).toEqual([replacement]);
    stale();
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(replacement);
  });

  it('separates per-host committed projection events from registry changes', () => {
    const f = fixture();
    const other = document.createElement('div');
    const listener = vi.fn();
    const otherListener = vi.fn();
    const stop = retain(subscribeWebPortalProjection(f.target, listener));
    retain(subscribeWebPortalProjection(other, otherListener));
    register(f.scope, f.destination);
    expect(getWebPortalProjectionGeneration(f.target)).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    notifyWebPortalProjection(f.target);
    expect(getWebPortalProjectionGeneration(f.target)).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(otherListener).not.toHaveBeenCalled();
    expect(getWebPortalProjectionGeneration(other)).toBe(0);
    stop();
    stop();
    notifyWebPortalProjection(f.target);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getWebPortalProjectionGeneration(f.target)).toBe(2);
  });

  it('keeps identical subscription callbacks independently releasable', () => {
    const { target } = fixture();
    const listener = vi.fn();
    const first = retain(subscribeWebPortalProjection(target, listener));
    retain(subscribeWebPortalProjection(target, listener));
    first();
    notifyWebPortalProjection(target);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('skips retired listeners and serializes reentrant projection commits', () => {
    const { target } = fixture();
    const observed: number[] = [];
    let changed = false;
    let stopRetired = () => {};
    retain(
      subscribeWebPortalProjection(target, () => {
        if (changed) return;
        changed = true;
        stopRetired();
        notifyWebPortalProjection(target);
      })
    );
    const retired = vi.fn();
    stopRetired = retain(subscribeWebPortalProjection(target, retired));
    retain(
      subscribeWebPortalProjection(target, () => {
        observed.push(getWebPortalProjectionGeneration(target));
      })
    );
    notifyWebPortalProjection(target);
    expect(observed).toEqual([2]);
    expect(retired).not.toHaveBeenCalled();
  });

  it('continues notification after a listener throws without losing the registration disposer', () => {
    const f = fixture();
    const errors: Array<() => void> = [];
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => errors.push(callback));
    const failure = new Error('consumer failure');
    const stop = retain(
      subscribeWebPortalDestinations(() => {
        throw failure;
      })
    );
    const next = vi.fn();
    retain(subscribeWebPortalDestinations(next));
    const release = register(f.scope, f.destination);
    expect(next).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    expect(() => errors[0]()).toThrow(failure);
    stop();
    release();
    expect(resolveWebPortalDestination(f.origin, f.target)).toBe(document.body);
  });
});

describe('fixed portal epoch material suspension', () => {
  it('starts with no policy block and acquires nothing by merely subscribing', () => {
    const { target } = fixture();
    const listener = vi.fn();
    retain(subscribeWebPortalMaterialSuspension(target, listener));
    expect(isWebPortalMaterialSuspended(target)).toBe(false);
    expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('withdraws once for the entire epoch and only a new epoch clears suspension', () => {
    const { target, component } = fixture();
    const states: boolean[] = [];
    const projected = vi.fn();
    retain(subscribeWebPortalProjection(target, projected));
    retain(
      subscribeWebPortalMaterialSuspension(target, () => {
        states.push(isWebPortalMaterialSuspended(target));
      })
    );
    const first = beginWebPortalMaterialEpoch(target);
    expect(isWebPortalMaterialSuspended(target)).toBe(true);
    first.commitProjection();
    first.commitProjection();
    first.suspend();
    first.suspend();
    first.commitProjection();
    expect(states).toEqual([true, false, true]);
    expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(3);
    first.release();
    first.release();
    expect(states).toEqual([true, false, true, true]);
    expect(isWebPortalMaterialSuspended(target)).toBe(true);
    const next = beginWebPortalMaterialEpoch(target);
    expect(states).toEqual([true, false, true, true, true]);
    expect(isWebPortalMaterialSuspended(target)).toBe(true);
    next.commitProjection();
    expect(isWebPortalMaterialSuspended(target)).toBe(false);
    expect(target.parentNode).toBe(component);
    expect(projected).not.toHaveBeenCalled();
    next.release();
  });

  it('does not let stale epoch suspend or release affect its replacement', () => {
    const { target } = fixture();
    const first = beginWebPortalMaterialEpoch(target);
    first.commitProjection();
    first.suspend();
    const next = beginWebPortalMaterialEpoch(target);
    next.commitProjection();
    const generation = getWebPortalMaterialSuspensionGeneration(target);
    first.release();
    first.suspend();
    first.commitProjection();
    expect(isWebPortalMaterialSuspended(target)).toBe(false);
    expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(generation);
    next.release();
  });

  it('invalidates in-flight work before notifying and isolates hosts and other signals', () => {
    const f = fixture();
    const other = document.createElement('div');
    const epoch = beginWebPortalMaterialEpoch(f.target);
    epoch.commitProjection();
    const captured = getWebPortalMaterialSuspensionGeneration(f.target);
    let stale = false;
    retain(
      subscribeWebPortalMaterialSuspension(f.target, () => {
        stale = captured !== getWebPortalMaterialSuspensionGeneration(f.target);
        expect(isWebPortalMaterialSuspended(f.target)).toBe(true);
      })
    );
    register(f.scope, f.destination);
    notifyWebPortalProjection(f.target);
    expect(isWebPortalMaterialSuspended(f.target)).toBe(false);
    expect(getWebPortalMaterialSuspensionGeneration(f.target)).toBe(captured);
    epoch.suspend();
    expect(stale).toBe(true);
    expect(isWebPortalMaterialSuspended(other)).toBe(false);
    expect(getWebPortalMaterialSuspensionGeneration(other)).toBe(0);
  });

  it('serializes reentrant replacement without publishing stale suspension or undoing the new lease', () => {
    const { target } = fixture();
    const old = beginWebPortalMaterialEpoch(target);
    old.commitProjection();
    let replacement: ReturnType<typeof beginWebPortalMaterialEpoch> | null = null;
    retain(
      subscribeWebPortalMaterialSuspension(target, () => {
        if (replacement || !isWebPortalMaterialSuspended(target)) return;
        replacement = beginWebPortalMaterialEpoch(target);
        replacement.commitProjection();
      })
    );
    const observed: boolean[] = [];
    retain(
      subscribeWebPortalMaterialSuspension(target, () => {
        observed.push(isWebPortalMaterialSuspended(target));
      })
    );
    old.suspend();
    old.release();
    expect(observed).toEqual([false]);
    expect(isWebPortalMaterialSuspended(target)).toBe(false);
    (replacement as ReturnType<typeof beginWebPortalMaterialEpoch> | null)?.release();
  });

  it('never admits a pending epoch suspended or released before its first actual projection', () => {
    const { target } = fixture();
    const suspended = beginWebPortalMaterialEpoch(target);
    suspended.suspend();
    const suspendedGeneration = getWebPortalMaterialSuspensionGeneration(target);
    suspended.commitProjection();
    expect(isWebPortalMaterialSuspended(target)).toBe(true);
    expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(suspendedGeneration);
    const released = beginWebPortalMaterialEpoch(target);
    released.release();
    const releasedGeneration = getWebPortalMaterialSuspensionGeneration(target);
    released.commitProjection();
    expect(isWebPortalMaterialSuspended(target)).toBe(true);
    expect(getWebPortalMaterialSuspensionGeneration(target)).toBe(releasedGeneration);
  });
});
