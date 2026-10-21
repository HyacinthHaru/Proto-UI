import { afterEach, describe, expect, it, vi } from 'vitest';
import { enhanceCodeExampleTabs } from './code-example-tabs';

const projections: ReturnType<typeof enhanceCodeExampleTabs>[] = [];
afterEach(() => {
  for (const projection of projections.splice(0).reverse()) projection.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function fixture() {
  document.body.innerHTML = `<section data-code-example>
    <div data-code-toolbar><div role="tablist" aria-label="Host">
      <button id="a" role="tab" aria-selected="true">React</button>
      <button id="b" role="tab" aria-selected="false">Web Components</button>
    </div></div>
    <section role="tabpanel" aria-labelledby="a"><pre>exact react source</pre></section>
    <section role="tabpanel" aria-labelledby="b" hidden><pre>exact wc source</pre></section>
  </section>`;
  const root = document.querySelector<HTMLElement>('[data-code-example]')!;
  const list = root.querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  return { root, list, tabs, panels };
}

describe('CodeExample real legacy Tabs enhancement', () => {
  it('uses real underline Tabs, retains source nodes, and restores native owners on cleanup', async () => {
    const { root, list, tabs, panels } = fixture();
    const source = panels.map((panel) => panel.querySelector('pre'));
    const projection = enhanceCodeExampleTabs({ list, tabs, panels, onSelect() {} });
    projections.push(projection);
    await Promise.resolve();
    const triggers = [...root.querySelectorAll<HTMLElement>('[data-code-example-projected-tab]')];
    for (const trigger of triggers) {
      const panelId = trigger.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      const content = document.getElementById(panelId!);
      expect(content?.getAttribute('role')).toBe('tabpanel');
      expect(content?.getAttribute('aria-labelledby')).toBe(trigger.id);
    }
    expect(root.querySelectorAll('[data-code-example-projected-tab]')).toHaveLength(2);
    expect(root.querySelector('[data-code-example-projected-tab]')?.getAttribute('data-pui-style')).toContain('bg-transparent');
    expect(list.parentElement!.hidden).toBe(true);
    expect(panels.map((panel) => panel.querySelector('pre'))).toEqual(source);
    expect(panels.every((panel) => panel.isConnected)).toBe(true);
    expect(panels.every((panel) => !panel.hasAttribute('role'))).toBe(true);
    projection.destroy();
    expect(root.querySelector('[data-code-example-tabs-projection]')).toBeNull();
    expect(list.parentElement!.hidden).toBe(false);
    expect(panels.map((panel) => panel.parentElement)).toEqual([root, root]);
    expect(panels.map((panel) => panel.getAttribute('aria-labelledby'))).toEqual(['a', 'b']);
  });

  it.each(['list', 'content'])('restores source and fallback if the real %s fails role admission', (part) => {
    const { root, list, tabs, panels } = fixture();
    const source = panels.map((panel) => panel.querySelector('pre'));
    const getAttribute = Element.prototype.getAttribute;
    vi.spyOn(Element.prototype, 'getAttribute').mockImplementation(function (this: Element, name: string) {
      if (name === 'role' && this.localName.endsWith(`tabs-${part}`)) return null;
      return getAttribute.call(this, name);
    });
    expect(() => enhanceCodeExampleTabs({ list, tabs, panels, onSelect() {} })).toThrow('native controls retained');
    expect(root.querySelector('[data-code-example-tabs-projection]')).toBeNull();
    expect(list.parentElement!.hidden).toBe(false);
    expect(panels.map((panel) => panel.parentElement)).toEqual([root, root]);
    expect(panels.map((panel) => panel.querySelector('pre'))).toEqual(source);
    expect(panels.map((panel) => panel.getAttribute('role'))).toEqual(['tabpanel', 'tabpanel']);
    expect(panels.map((panel) => panel.getAttribute('aria-labelledby'))).toEqual(['a', 'b']);
  });

  it('retains an in-progress native keyboard interaction rather than hiding its focused tab', () => {
    const { root, list, tabs, panels } = fixture();
    tabs[0].focus();
    projections.push(enhanceCodeExampleTabs({ list, tabs, panels, onSelect() {} }));
    expect(root.querySelector('[data-code-example-tabs-projection]')).toBeNull();
    expect(document.activeElement).toBe(tabs[0]);
    expect(list.parentElement!.hidden).toBe(false);
  });

  it('does not reparent a panel containing the active source viewport', () => {
    const { root, list, tabs, panels } = fixture();
    const pre = panels[0].querySelector('pre')!;
    pre.tabIndex = 0;
    pre.focus();
    projections.push(enhanceCodeExampleTabs({ list, tabs, panels, onSelect() {} }));
    expect(root.querySelector('[data-code-example-tabs-projection]')).toBeNull();
    expect(document.activeElement).toBe(pre);
    expect(panels[0].parentElement).toBe(root);
  });

  it('does not accept a bubbled nested Tabs valueChange as a host change', () => {
    const { root, list, tabs, panels } = fixture();
    const changes: number[] = [];
    projections.push(enhanceCodeExampleTabs({ list, tabs, panels, onSelect: (index) => changes.push(index) }));
    panels[0].dispatchEvent(new CustomEvent('valueChange', { bubbles: true, detail: { value: '1' } }));
    expect(changes).toEqual([]);
    root.querySelector('[data-code-example-tabs-projection]')!.dispatchEvent(new CustomEvent('valueChange', { detail: { value: '1' } }));
    expect(changes).toEqual([1]);
  });
});
