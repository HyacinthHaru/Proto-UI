import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { dropdownContent, dropdownItem, dropdownRoot, dropdownTrigger } from '../src/dropdown';

AdaptToWebComponent(dropdownRoot as any);
AdaptToWebComponent(dropdownTrigger as any);
AdaptToWebComponent(dropdownContent as any);
AdaptToWebComponent(dropdownItem as any);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/brutalist: dropdown', () => {
  it('opens a square hard-shadowed action menu with item active styles', async () => {
    expect(dropdownRoot.name).toBe('brutalist-dropdown-root');
    expect(dropdownTrigger.name).toBe('brutalist-dropdown-trigger');
    expect(dropdownContent.name).toBe('brutalist-dropdown-content');
    expect(dropdownItem.name).toBe('brutalist-dropdown-item');

    const root = document.createElement('brutalist-dropdown-root') as any;
    const trigger = document.createElement('brutalist-dropdown-trigger') as any;
    const content = document.createElement('brutalist-dropdown-content') as any;
    const item = document.createElement('brutalist-dropdown-item') as any;
    setElementProps(item, { value: 'profile', textValue: 'Profile' });
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
    expect(styleContains(content, 'shadow-[8px_8px_0_0_#000]')).toBe(true);
    item.dispatchEvent(new CustomEvent('pointer.enter'));
    await flush();
    expect(styleContains(item, 'rounded-none')).toBe(true);
    expect(item.getExposes().active.get()).toBe(true);
    expect(styleContains(item, 'bg-main')).toBe(true);
  });
});
