import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { selectContent, selectItem, selectRoot, selectTrigger, selectValue } from '../src/select';

AdaptToWebComponent(selectRoot as any);
AdaptToWebComponent(selectTrigger as any);
AdaptToWebComponent(selectValue as any);
AdaptToWebComponent(selectContent as any);
AdaptToWebComponent(selectItem as any);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/brutalist: select', () => {
  it('opens a square hard-shadowed select surface with option styles', async () => {
    expect(selectRoot.name).toBe('brutalist-select-root');
    expect(selectTrigger.name).toBe('brutalist-select-trigger');
    expect(selectValue.name).toBe('brutalist-select-value');
    expect(selectContent.name).toBe('brutalist-select-content');
    expect(selectItem.name).toBe('brutalist-select-item');

    const root = document.createElement('brutalist-select-root') as any;
    const trigger = document.createElement('brutalist-select-trigger') as any;
    const value = document.createElement('brutalist-select-value') as any;
    const content = document.createElement('brutalist-select-content') as any;
    const item = document.createElement('brutalist-select-item') as any;
    setElementProps(root, { defaultValue: 'a' });
    setElementProps(item, { value: 'a' });
    trigger.appendChild(value);
    content.appendChild(item);
    root.append(trigger, content);
    document.body.appendChild(root);
    await flush();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(root.getExposes().open.get()).toBe(true);
    expect(styleContains(trigger, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'shadow-[8px_8px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(item, 'rounded-none')).toBe(true);
    expect(styleContains(item, 'data-[selected]:bg-main')).toBe(true);
  });
});
