import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { tabsContent, tabsList, tabsRoot, tabsTrigger } from '../src/tabs';

AdaptToWebComponent(tabsRoot as any);
AdaptToWebComponent(tabsList as any);
AdaptToWebComponent(tabsTrigger as any);
AdaptToWebComponent(tabsContent as any);

describe('prototypes/brutalist: tabs', () => {
  it('keeps every Tabs part named and runs a square Neo-Brutalist compound family', async () => {
    expect(tabsRoot.name).toBe('brutalist-tabs-root');
    expect(tabsList.name).toBe('brutalist-tabs-list');
    expect(tabsTrigger.name).toBe('brutalist-tabs-trigger');
    expect(tabsContent.name).toBe('brutalist-tabs-content');

    const root = document.createElement('brutalist-tabs-root') as any;
    const list = document.createElement('brutalist-tabs-list') as any;
    const triggerA = document.createElement('brutalist-tabs-trigger') as any;
    const triggerB = document.createElement('brutalist-tabs-trigger') as any;
    const contentA = document.createElement('brutalist-tabs-content') as any;
    const contentB = document.createElement('brutalist-tabs-content') as any;

    setElementProps(root, { defaultValue: 'a' });
    setElementProps(triggerA, { value: 'a' });
    setElementProps(triggerB, { value: 'b' });
    setElementProps(contentA, { value: 'a' });
    setElementProps(contentB, { value: 'b' });

    list.appendChild(triggerA);
    list.appendChild(triggerB);
    root.appendChild(list);
    root.appendChild(contentA);
    root.appendChild(contentB);
    document.body.appendChild(root);
    await Promise.resolve();
    await Promise.resolve();

    expect(styleContains(list, 'rounded-none')).toBe(true);
    expect(styleContains(list, 'shadow-[5px_5px_0_0_#000]')).toBe(true);
    expect(styleContains(triggerA, 'rounded-none')).toBe(true);
    expect(styleContains(triggerA, 'data-[selected]:bg-main')).toBe(true);
    expect(styleContains(contentA, 'rounded-none')).toBe(true);
    expect(styleContains(contentA, 'shadow-[8px_8px_0_0_#000]')).toBe(true);
    expect(root.getExposes().value.get()).toBe('a');
    expect(triggerA.getExposes().selected.get()).toBe(true);

    triggerB.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getExposes().value.get()).toBe('b');
    expect(triggerB.getExposes().selected.get()).toBe(true);

    root.remove();
    await Promise.resolve();
  });
});
