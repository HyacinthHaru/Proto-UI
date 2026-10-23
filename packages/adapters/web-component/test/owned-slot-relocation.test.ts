import {
  claimWebComponentOwnedRelocation,
  isWebComponentOwnedRelocating,
  withWebComponentOwnedRelocation,
} from '../src/owned-relocation';
import { afterEach, expect, it } from 'vitest';
import { definePrototype, tw } from '@proto.ui/core';
import { AdaptToWebComponent } from '../src';
let sequence = 0;
afterEach(() => document.body.replaceChildren());
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};
it('parent Template recommit retains the live caller child decoration owner', async () => {
  let setups = 0,
    renders = 0;
  const child = definePrototype({
    name: `owned-slot-child-${++sequence}`,
    setup(def) {
      setups++;
      const target = def.feedback.style.declareDecoration();
      def.feedback.style.to(target).use(tw('bg-black'));
      return (r) => {
        renders++;
        return [r.decoration(target), r.slot()];
      };
    },
  });
  const parent = definePrototype({
    name: `owned-slot-parent-${++sequence}`,
    setup() {
      return (r) => r.el('section', r.slot());
    },
  });
  AdaptToWebComponent(child);
  AdaptToWebComponent(parent);
  const host = document.createElement(parent.name) as HTMLElement & { update(): void },
    nested = document.createElement(child.name);
  const input = document.createElement('input');
  input.value = 'retain';
  nested.append(input);
  host.append(nested);
  document.body.append(host);
  await settle();
  const leaf = nested.querySelector('[data-pui-owned-decoration]');
  expect(leaf).not.toBeNull();
  const before = renders;
  host.update();
  await settle();
  expect(setups).toBe(1);
  expect(renders).toBe(before);
  expect(nested.querySelector('[data-pui-owned-decoration]')).toBe(leaf);
  expect(nested.querySelector('input')).toBe(input);
  expect(input.value).toBe('retain');
});

it('ordinary child owner updates remain rejected rather than silently reusing a structural view', async () => {
  const proto = definePrototype({
    name: `owned-slot-explicit-${++sequence}`,
    setup(def) {
      const target = def.feedback.style.declareDecoration();
      return (r) => [r.decoration(target), r.slot()];
    },
  });
  AdaptToWebComponent(proto);
  const host = document.createElement(proto.name) as HTMLElement & {
    update(): void;
    setProps(props: Record<string, unknown>): void;
  };
  document.body.append(host);
  await settle();
  const leaf = host.firstChild;
  expect(() => host.update()).toThrow('decoration structural rebind unsupported');
  expect(host.firstChild).toBe(leaf);
  expect(() => host.setProps({ unused: 'changed' })).toThrow(
    'decoration structural rebind unsupported'
  );
  expect(host.firstChild).toBe(leaf);
});

it('authenticates the whole destination ancestry and permanently consumes a reconnect allowance', () => {
  const origin = document.createElement('div'),
    destination = document.createElement('section'),
    other = document.createElement('aside'),
    root = document.createElement('div'),
    child = document.createElement('span');
  root.append(child);
  origin.append(root);
  document.body.append(origin, destination, other);
  withWebComponentOwnedRelocation([root], destination, () => {
    expect(isWebComponentOwnedRelocating(child)).toBe(false);
    destination.append(root);
    const receipt = claimWebComponentOwnedRelocation(child);
    expect(receipt?.()).toBe(true);
    other.append(destination);
    expect(receipt?.()).toBe(false);
    document.body.append(destination);
    expect(receipt?.()).toBe(false);
    other.append(child);
    expect(isWebComponentOwnedRelocating(child)).toBe(false);
    root.append(child);
    expect(claimWebComponentOwnedRelocation(child)).toBeNull();
    expect(receipt?.()).toBe(false);
  });
  expect(isWebComponentOwnedRelocating(child)).toBe(false);
});
it('nested moves cannot renew an already consumed outer reconnect receipt', () => {
  const origin = document.createElement('div'),
    destination = document.createElement('section'),
    nested = document.createElement('aside'),
    root = document.createElement('div');
  origin.append(root);
  document.body.append(origin, destination, nested);
  withWebComponentOwnedRelocation([root], destination, () => {
    destination.append(root);
    const outer = claimWebComponentOwnedRelocation(root);
    expect(outer?.()).toBe(true);
    withWebComponentOwnedRelocation([root], nested, () => {
      nested.append(root);
      expect(claimWebComponentOwnedRelocation(root)?.()).toBe(true);
      expect(outer?.()).toBe(false);
    });
    destination.append(root);
    expect(claimWebComponentOwnedRelocation(root)).toBeNull();
    expect(outer?.()).toBe(false);
  });
  expect(isWebComponentOwnedRelocating(root)).toBe(false);
});
it('foreign documents and throwing moves cannot retain relocation authority', () => {
  const origin = document.createElement('div'),
    destination = document.createElement('section'),
    root = document.createElement('div');
  origin.append(root);
  document.body.append(origin, destination);
  expect(() =>
    withWebComponentOwnedRelocation([root], destination, () => {
      destination.append(root);
      expect(claimWebComponentOwnedRelocation(root)?.()).toBe(true);
      throw new Error('move failed');
    })
  ).toThrow('move failed');
  expect(isWebComponentOwnedRelocating(root)).toBe(false);
  const foreign = document.implementation.createHTMLDocument();
  withWebComponentOwnedRelocation([root], destination, () => {
    foreign.adoptNode(root);
    expect(claimWebComponentOwnedRelocation(root)).toBeNull();
  });
  expect(isWebComponentOwnedRelocating(root)).toBe(false);
});

it('a reentrant author same-parent reconnect cannot reuse the adapter allowance', () => {
  const origin = document.createElement('div'),
    destination = document.createElement('section');
  document.body.append(origin, destination);
  const observations: boolean[] = [];
  let reenter = false;
  class Probe extends HTMLElement {
    connectedCallback() {
      const receipt = claimWebComponentOwnedRelocation(this);
      if (!reenter) return;
      observations.push(!!receipt?.());
      if (receipt) {
        this.parentNode!.appendChild(this);
        observations.push(receipt());
      }
    }
  }
  const name = `owned-slot-reentry-${++sequence}`;
  customElements.define(name, Probe);
  const host = document.createElement(name);
  origin.append(host);
  reenter = true;
  withWebComponentOwnedRelocation([host], destination, () => destination.append(host));
  expect(observations).toEqual([true, false, false]);
  expect(isWebComponentOwnedRelocating(host)).toBe(false);
});

it('cleans up partially acquired authority when a caller descendant accessor throws', () => {
  const destination = document.createElement('section'),
    root = document.createElement('div');
  document.body.append(destination);
  destination.append(root);
  Object.defineProperty(root, 'shadowRoot', {
    configurable: true,
    get() {
      throw new Error('caller accessor');
    },
  });
  expect(() => withWebComponentOwnedRelocation([root], destination, () => {})).toThrow(
    'caller accessor'
  );
  expect(isWebComponentOwnedRelocating(root)).toBe(false);
  delete (root as any).shadowRoot;
});

it('a queued disconnected connect reaction consumes rather than preserves its move allowance', async () => {
  let renders = 0;
  const proto = definePrototype({
    name: `owned-slot-disconnected-${++sequence}`,
    setup() {
      return (r) => {
        renders++;
        return r.slot();
      };
    },
  });
  AdaptToWebComponent(proto);
  const origin = document.createElement('div'),
    destination = document.createElement('section');
  const child = document.createElement(proto.name) as HTMLElement & { connectedCallback(): void };
  origin.append(child);
  document.body.append(origin, destination);
  await settle();
  const before = renders;
  withWebComponentOwnedRelocation([child], destination, () => {
    child.remove();
    // Model a queued original reaction after an earlier ancestor callback detached it.
    child.connectedCallback();
    destination.append(child);
  });
  await settle();
  expect(renders).toBeGreaterThan(before);
  expect(isWebComponentOwnedRelocating(child)).toBe(false);
});
