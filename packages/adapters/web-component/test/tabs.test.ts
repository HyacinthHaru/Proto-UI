import { describe, expect, it } from 'vitest';
import { tabsContent, tabsList, tabsRoot, tabsTrigger } from '../../../prototypes/shadcn/src/tabs';
import { AdaptToWebComponent } from '../src/adapt';
import { setElementProps } from '../src/props';

async function flushReconciliation() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

describe('adapter-web-component: tabs content presence', () => {
  it('rematerializes a previously visited content after switching away and back', async () => {
    AdaptToWebComponent(tabsRoot, { registerAs: 'x-wc-tabs-root-remount' });
    AdaptToWebComponent(tabsList, { registerAs: 'x-wc-tabs-list-remount' });
    AdaptToWebComponent(tabsTrigger, { registerAs: 'x-wc-tabs-trigger-remount' });
    AdaptToWebComponent(tabsContent, { registerAs: 'x-wc-tabs-content-remount' });

    const root = document.createElement('x-wc-tabs-root-remount') as any;
    setElementProps(root, { defaultValue: 'a' });

    const list = document.createElement('x-wc-tabs-list-remount');
    const triggerA = document.createElement('x-wc-tabs-trigger-remount');
    setElementProps(triggerA, { value: 'a' });
    triggerA.textContent = 'A';
    const triggerB = document.createElement('x-wc-tabs-trigger-remount');
    setElementProps(triggerB, { value: 'b' });
    triggerB.textContent = 'B';
    list.append(triggerA, triggerB);

    const contentA = document.createElement('x-wc-tabs-content-remount') as any;
    setElementProps(contentA, { value: 'a' });
    contentA.textContent = 'A panel';
    const contentB = document.createElement('x-wc-tabs-content-remount') as any;
    setElementProps(contentB, { value: 'b' });
    contentB.textContent = 'B panel';
    root.append(list, contentA, contentB);
    document.body.appendChild(root);
    await flushReconciliation();

    expect(contentA.getExposes().current.get()).toBe(true);
    expect(contentA.hasAttribute('data-pui-view-detached')).toBe(false);
    expect(contentA.textContent).toBe('A panel');

    triggerB.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushReconciliation();

    expect(contentA.hasAttribute('data-pui-view-detached')).toBe(true);
    expect(contentB.hasAttribute('data-pui-view-detached')).toBe(false);
    expect(contentB.textContent).toBe('B panel');

    triggerA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushReconciliation();

    expect(contentA.getExposes().current.get()).toBe(true);
    expect(contentA.hasAttribute('data-pui-view-detached')).toBe(false);
    expect(contentA.hasAttribute('hidden')).toBe(false);
    expect(contentA.textContent).toBe('A panel');

    root.remove();
    await flushReconciliation();
  });
});
