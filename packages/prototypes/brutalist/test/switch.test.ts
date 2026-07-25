import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { switchRoot, switchThumb } from '../src/switch';

AdaptToWebComponent(switchRoot as any);
AdaptToWebComponent(switchThumb as any);

describe('prototypes/brutalist: switch', () => {
  it('keeps root and thumb as named direct entries with square Neo-Brutalist surfaces', async () => {
    expect(switchRoot.name).toBe('brutalist-switch-root');
    expect(switchThumb.name).toBe('brutalist-switch-thumb');

    const root = document.createElement('brutalist-switch-root') as any;
    const thumb = document.createElement('brutalist-switch-thumb') as any;
    root.appendChild(thumb);
    document.body.appendChild(root);
    await Promise.resolve();
    await Promise.resolve();

    expect(styleContains(root, 'rounded-none')).toBe(true);
    expect(styleContains(root, 'border-2')).toBe(true);
    expect(styleContains(root, 'shadow-[3px_3px_0_0_#000]')).toBe(true);
    expect(styleContains(thumb, 'rounded-none')).toBe(true);
    expect(styleContains(thumb, 'shadow-[3px_3px_0_0_#000]')).toBe(true);

    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    expect(root.getExposes().checked.get()).toBe(true);
    expect(thumb.getExposes().isChecked()).toBe(true);
    expect(styleContains(root, 'data-[checked]:bg-sky')).toBe(true);
    expect(styleContains(thumb, 'data-[checked]:translate-x-5')).toBe(true);
    expect(styleContains(thumb, 'data-[checked]:bg-canary')).toBe(true);
    // Thumb travel mirrors the Shadcn root-padding swap: unchecked keeps the
    // thumb left, checked swaps padding to push it to the right.
    expect(styleContains(root, 'pr-5')).toBe(true);
    expect(styleContains(root, 'data-[checked]:pl-5')).toBe(true);
    expect(styleContains(root, 'data-[checked]:pr-0.5')).toBe(true);

    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(thumb.getExposes().pressed.get()).toBe(true);
    expect(styleContains(thumb, 'data-[pressed]:translate-x-px')).toBe(true);
    expect(styleContains(thumb, 'data-[pressed]:translate-y-px')).toBe(true);
    expect(styleContains(thumb, 'data-[pressed]:shadow-none')).toBe(true);
    root.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(thumb.getExposes().pressed.get()).toBe(false);

    root.remove();
    await Promise.resolve();
  });

  it('disabled switch suppresses checked changes while preserving disabled style', async () => {
    const root = document.createElement('brutalist-switch-root') as any;
    const thumb = document.createElement('brutalist-switch-thumb') as any;
    setElementProps(root, { disabled: true, defaultChecked: false });
    root.appendChild(thumb);
    document.body.appendChild(root);
    await Promise.resolve();
    await Promise.resolve();

    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.getExposes().checked.get()).toBe(false);
    expect(styleContains(root, 'data-[disabled]:opacity-50')).toBe(true);

    root.remove();
    await Promise.resolve();
  });
});
