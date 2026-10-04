import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { definePrototype } from '@proto.ui/core';
import {
  COLLAPSIBLE_FAMILY,
  asCollapsibleContent,
  asCollapsibleRoot,
  asCollapsibleTrigger,
  collapsibleContent,
  collapsibleRoot,
  collapsibleTrigger,
} from '../src/collapsible';

for (const [role, prototype] of [
  ['root', collapsibleRoot],
  ['trigger', collapsibleTrigger],
  ['content', collapsibleContent],
] as const) {
  AdaptToWebComponent(prototype, { registerAs: `x-collapsible-base-${role}` });
}

async function flush() {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

async function until(predicate: () => boolean) {
  for (let index = 0; index < 20; index++) {
    await flush();
    if (predicate()) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  throw new Error('Collapsible consumer did not reach the expected committed state.');
}

function fixture(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {}
) {
  const root = document.createElement('x-collapsible-base-root') as any;
  const trigger = document.createElement('x-collapsible-base-trigger') as any;
  const content = document.createElement('x-collapsible-base-content') as any;
  const requests: Array<{ open: boolean; reason: string }> = [];
  root.addEventListener('openChange', (event: Event) => {
    requests.push((event as CustomEvent).detail);
  });
  setElementProps(root, rootProps);
  setElementProps(content, contentProps);
  trigger.textContent = 'Disclosure';
  content.textContent = 'Inline content';
  root.append(trigger, content);
  return { root, trigger, content, requests };
}

describe('Base Collapsible consumer contract', () => {
  it('commits uncontrolled requests, initializes defaultOpen once and emits no synchronization events', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-UNCONTROLLED
    const { root, trigger, content, requests } = fixture({ defaultOpen: true });
    try {
      document.body.append(root);
      await until(() => trigger.getAttribute('aria-expanded') === 'true');
      expect(requests).toEqual([]);
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await until(() => trigger.getAttribute('aria-expanded') === 'false');
      expect(root.getExposes().open.get()).toBe(false);
      expect(content.getExposes().hidden.get()).toBe(true);
      expect(requests).toEqual([{ open: false, reason: 'pointer' }]);

      setElementProps(root, { defaultOpen: false });
      setElementProps(root, { defaultOpen: true });
      await flush();
      expect(root.getExposes().open.get()).toBe(false);
      expect(requests).toHaveLength(1);

      root.getExposes().openCollapsible();
      await until(() => trigger.getAttribute('aria-expanded') === 'true');
      root.getExposes().openCollapsible();
      expect(requests).toEqual([
        { open: false, reason: 'pointer' },
        { open: true, reason: 'programmatic' },
      ]);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('keeps controlled expansion and presence canonical until the owner accepts a request', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-CONTROLLED
    const { root, trigger, content, requests } = fixture({ open: false, defaultOpen: true });
    try {
      document.body.append(root);
      await until(() => trigger.getAttribute('aria-expanded') === 'false');
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      root.getExposes().toggle();
      await flush();
      expect(requests).toEqual([
        { open: true, reason: 'pointer' },
        { open: true, reason: 'programmatic' },
      ]);
      expect(root.getExposes().open.get()).toBe(false);
      expect(trigger.getExposes().expanded.get()).toBe(false);
      expect(content.getExposes().open.get()).toBe(false);
      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      setElementProps(root, { open: true, defaultOpen: true });
      await until(() => !!trigger.getAttribute('aria-controls'));
      root.getExposes().close();
      await flush();
      expect(root.getExposes().open.get()).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(content.getExposes().hidden.get()).toBe(false);
      expect(requests).toHaveLength(3);
      expect(requests[2]).toEqual({ open: false, reason: 'programmatic' });
      setElementProps(root, { open: false });
      await until(() => !trigger.hasAttribute('aria-controls'));
      expect(requests).toHaveLength(3);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('keeps every part canonical when the owner accepts synchronously inside openChange', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-CONTROLLED: nested owner acceptance.
    const { root, trigger, content, requests } = fixture({ open: false });
    root.addEventListener('openChange', (event: Event) => {
      setElementProps(root, { open: (event as CustomEvent).detail.open });
    });
    try {
      document.body.append(root);
      await until(() => trigger.tabIndex === 0);
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(root.getExposes().open.get()).toBe(true);
      expect(trigger.getExposes().expanded.get()).toBe(true);
      expect(content.getExposes().open.get()).toBe(true);
      expect(content.getExposes().hidden.get()).toBe(false);
      await until(() => trigger.getAttribute('aria-controls') === content.id && !!content.id);
      root.getExposes().close();
      await flush();
      expect(root.getExposes().open.get()).toBe(false);
      expect(trigger.getExposes().expanded.get()).toBe(false);
      expect(content.getExposes().open.get()).toBe(false);
      await until(() => !trigger.hasAttribute('aria-controls'));
      expect(requests).toEqual([
        { open: true, reason: 'pointer' },
        { open: false, reason: 'programmatic' },
      ]);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('reconciles reused parts with the new domain instead of retaining the former Root facts', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-DOMAIN-ISOLATION: live logical reuse.
    const source = fixture({ defaultOpen: true });
    const destination = fixture({ open: false, disabled: true });
    const host = document.createElement('div');
    host.append(source.root, destination.root);
    try {
      document.body.append(host);
      await until(() => source.trigger.getAttribute('aria-expanded') === 'true');
      destination.trigger.remove();
      destination.content.remove();
      await flush();
      destination.root.append(source.trigger, source.content);
      await flush();
      expect(source.root.getExposes().open.get()).toBe(true);
      expect(destination.root.getExposes().open.get()).toBe(false);
      expect(source.trigger.getExposes().expanded.get()).toBe(false);
      expect(source.trigger.getExposes().disabled.get()).toBe(true);
      expect(source.trigger.tabIndex).toBe(-1);
      expect(source.content.getExposes().open.get()).toBe(false);
      expect(source.content.getExposes().hidden.get()).toBe(true);
      await until(() => !source.trigger.hasAttribute('aria-controls'));
      setElementProps(destination.root, { open: true, disabled: false });
      await until(() => !!source.trigger.getAttribute('aria-controls'));
      expect(source.trigger.getAttribute('aria-controls')).toBe(source.content.id);
      expect(source.trigger.tabIndex).toBe(0);
      expect(source.requests).toEqual([]);
      expect(destination.requests).toEqual([]);
    } finally {
      host.remove();
      await flush();
    }
  });

  it('rejects an already-created Trigger moved into a domain with an existing Trigger', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-ANATOMY-CARDINALITY: reuse is not creation.
    const source = fixture();
    const destination = fixture();
    const host = document.createElement('div');
    host.append(source.root, destination.root);
    try {
      document.body.append(host);
      await until(() => source.trigger.tabIndex === 0 && destination.trigger.tabIndex === 0);
      expect(() => destination.root.append(source.trigger)).toThrowError(
        expect.objectContaining({ code: 'COLLAPSIBLE_DUPLICATE_PART' })
      );
    } finally {
      source.trigger.remove();
      host.remove();
      await flush();
    }
  });

  it('wakes a detached reused Content when its new Root is already open', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-L1-LIFECYCLE: no mounted update can wake this view.
    const source = fixture();
    const destination = fixture({ defaultOpen: true });
    const host = document.createElement('div');
    host.append(source.root, destination.root);
    try {
      document.body.append(host);
      await until(() => !!destination.trigger.getAttribute('aria-controls'));
      const logicalOpen = source.content.getExposes().open;
      expect(logicalOpen.get()).toBe(false);
      destination.content.remove();
      await flush();
      destination.root.append(source.content);
      await until(
        () =>
          destination.trigger.getAttribute('aria-controls') === source.content.id &&
          !!source.content.id
      );
      expect(source.content.getExposes().open).toBe(logicalOpen);
      expect(logicalOpen.get()).toBe(true);
      expect(source.content.getExposes().hidden.get()).toBe(false);
      expect(source.root.getExposes().open.get()).toBe(false);
      expect(source.trigger.hasAttribute('aria-controls')).toBe(false);
      expect(source.requests).toEqual([]);
      expect(destination.requests).toEqual([]);
    } finally {
      host.remove();
      await flush();
    }
  });

  it('rejects an already-created Content moved into a domain with an existing Content', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-ANATOMY-CARDINALITY: Content has its own lifetime.
    const source = fixture({ defaultOpen: true });
    const destination = fixture({ defaultOpen: true });
    const host = document.createElement('div');
    host.append(source.root, destination.root);
    try {
      document.body.append(host);
      await until(
        () =>
          !!source.trigger.getAttribute('aria-controls') &&
          !!destination.trigger.getAttribute('aria-controls')
      );
      expect(() => destination.root.append(source.content)).toThrowError(
        expect.objectContaining({ code: 'COLLAPSIBLE_DUPLICATE_PART' })
      );
    } finally {
      source.content.remove();
      host.remove();
      await flush();
    }
  });

  it('suppresses disabled requests and focus without rewriting open or blocking controlled input', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-DISABLED
    const { root, trigger, content, requests } = fixture({ open: true, disabled: true });
    try {
      document.body.append(root);
      await until(() => trigger.getAttribute('aria-disabled') === 'true');
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      root.getExposes().close();
      root.getExposes().toggle();
      expect(root.getExposes().open.get()).toBe(true);
      expect(content.getExposes().open.get()).toBe(true);
      expect(trigger.tabIndex).toBe(-1);
      expect(requests).toEqual([]);

      setElementProps(root, { open: false, disabled: true });
      await until(() => trigger.getAttribute('aria-expanded') === 'false');
      expect(requests).toEqual([]);
      setElementProps(trigger, { disabled: true });
      setElementProps(root, { open: false, disabled: false });
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(requests).toEqual([]);
      expect(trigger.tabIndex).toBe(-1);
      setElementProps(trigger, { disabled: false });
      await until(() => trigger.tabIndex === 0);
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(requests).toEqual([{ open: true, reason: 'pointer' }]);
      expect(root.getExposes().open.get()).toBe(false);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('uses one Enter/Space activation route and does not add roving or content focus', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-ACTIVATION
    const { root, trigger, content, requests } = fixture();
    try {
      document.body.append(root);
      await until(() => trigger.tabIndex === 0);
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      trigger.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      await until(() => trigger.getAttribute('aria-expanded') === 'true');
      expect(requests).toEqual([{ open: true, reason: 'keyboard' }]);
      expect(document.activeElement).toBe(trigger);
      expect(content.hasAttribute('role')).toBe(false);
      expect(content.hasAttribute('tabindex')).toBe(false);
      for (const key of ['ArrowDown', 'Home', 'End']) {
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }
      expect(requests).toHaveLength(1);
      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      trigger.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      trigger.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      await until(() => trigger.getAttribute('aria-expanded') === 'false');
      expect(requests).toEqual([
        { open: true, reason: 'keyboard' },
        { open: false, reason: 'keyboard' },
      ]);
      expect(document.activeElement).toBe(trigger);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('withdraws detached controls, restores reserved identity and retains keepMounted content', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-RELATIONSHIP
    // T-BASE-COLLAPSIBLE-0001-CASE-L1-LIFECYCLE
    // T-BASE-COLLAPSIBLE-0001-CASE-KEEP-MOUNTED
    const { root, trigger, content, requests } = fixture({ defaultOpen: true });
    try {
      document.body.append(root);
      await until(() => !!trigger.getAttribute('aria-controls'));
      const identity = content.id;
      const openHandle = content.getExposes().open;
      expect(trigger.getAttribute('aria-controls')).toBe(identity);
      for (let cycle = 0; cycle < 2; cycle++) {
        root.getExposes().close();
        await until(() => !trigger.hasAttribute('aria-controls'));
        expect(openHandle.get()).toBe(false);
        root.getExposes().openCollapsible();
        await until(() => trigger.getAttribute('aria-controls') === identity);
        expect(content.id).toBe(identity);
        expect(content.getExposes().open).toBe(openHandle);
      }
      setElementProps(content, { keepMounted: true });
      root.getExposes().close();
      await until(() => content.getAttribute('aria-hidden') === 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(identity);
      expect(content.textContent).toContain('Inline content');
      expect(content.getExposes().hidden.get()).toBe(true);
      const before = requests.length;
      setElementProps(content, { keepMounted: false });
      await until(() => !trigger.hasAttribute('aria-controls'));
      expect(requests).toHaveLength(before);
    } finally {
      root.remove();
      await flush();
    }
  });

  it('isolates nested and adjacent domains and removes terminal targets before replacement', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-DOMAIN-ISOLATION
    // T-BASE-COLLAPSIBLE-0001-CASE-TERMINAL-CLEANUP
    const outer = fixture({ defaultOpen: true });
    const nested = fixture({ defaultOpen: true });
    const adjacent = fixture({ defaultOpen: true });
    const host = document.createElement('div');
    outer.root.append(nested.root);
    host.append(outer.root, adjacent.root);
    try {
      document.body.append(host);
      await until(() =>
        [outer, nested, adjacent].every((part) => !!part.trigger.getAttribute('aria-controls'))
      );
      const identities = [outer, nested, adjacent].map(({ trigger, content }) => {
        expect(trigger.getAttribute('aria-controls')).toBe(content.id);
        return content.id;
      });
      expect(new Set(identities).size).toBe(3);
      nested.trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(nested.root.getExposes().open.get()).toBe(false);
      expect(outer.root.getExposes().open.get()).toBe(true);
      expect(adjacent.root.getExposes().open.get()).toBe(true);
      outer.content.remove();
      await until(() => !outer.trigger.hasAttribute('aria-controls'));
      const replacement = document.createElement('x-collapsible-base-content') as any;
      replacement.textContent = 'Replacement content';
      outer.root.append(replacement);
      await until(
        () => outer.trigger.getAttribute('aria-controls') === replacement.id && !!replacement.id
      );
      expect(replacement.getExposes().open.get()).toBe(true);
      const staleToggle = adjacent.root.getExposes().toggle;
      adjacent.root.remove();
      await flush();
      expect(() => staleToggle()).toThrow();
    } finally {
      host.remove();
      await flush();
    }
  });

  it('rejects a second same-domain part without enforcing minimum during construction', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-ANATOMY-CARDINALITY
    const root = document.createElement('x-collapsible-base-root') as any;
    const trigger = document.createElement('x-collapsible-base-trigger');
    const first = document.createElement('x-collapsible-base-content');
    const second = document.createElement('x-collapsible-base-content');
    try {
      document.body.append(root);
      root.append(trigger);
      await flush();
      root.append(first);
      await flush();
      expect(() => root.append(second)).toThrowError(
        expect.objectContaining({ code: 'COLLAPSIBLE_DUPLICATE_PART' })
      );
      second.remove();
    } finally {
      root.remove();
      await flush();
    }
  });

  it('composes all three authored asHooks without inheriting another Base protocol', async () => {
    // T-BASE-COLLAPSIBLE-0001-CASE-AUTHORING-CONSUMER
    // T-BASE-COLLAPSIBLE-0001-CASE-ANATOMY-CARDINALITY: minimum after readiness.
    const Root = definePrototype({
      name: 'x-collapsible-authored-root',
      setup(def) {
        asCollapsibleRoot();
        let run: any;
        def.lifecycle.onCreated((created) => {
          run = created;
        });
        def.expose.method('composition', () =>
          run.anatomy
            .parts(COLLAPSIBLE_FAMILY)
            .map((part: { role: string }) => part.role)
            .sort()
        );
      },
    });
    const Trigger = definePrototype({
      name: 'x-collapsible-authored-trigger',
      setup() {
        asCollapsibleTrigger();
      },
    });
    const Content = definePrototype({
      name: 'x-collapsible-authored-content',
      setup() {
        asCollapsibleContent();
      },
    });
    for (const prototype of [Root, Trigger, Content]) AdaptToWebComponent(prototype);
    const root = document.createElement(Root.name) as any;
    const trigger = document.createElement(Trigger.name) as any;
    const content = document.createElement(Content.name) as any;
    setElementProps(content, { keepMounted: true });
    trigger.textContent = 'Authored disclosure';
    content.textContent = 'Authored content';
    root.append(trigger, content);
    try {
      document.body.append(root);
      await until(() => trigger.tabIndex === 0);
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await until(() => trigger.getAttribute('aria-expanded') === 'true');
      expect(root.getExposes().open.get()).toBe(true);
      expect(content.getExposes().hidden.get()).toBe(false);
      expect(trigger.getAttribute('role')).toBe('button');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(root.getExposes().composition()).toEqual(['content', 'root', 'trigger']);
    } finally {
      root.remove();
      await flush();
    }
  });
});
