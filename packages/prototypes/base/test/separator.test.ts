import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import separatorRoot from '../src/separator';

AdaptToWebComponent(separatorRoot);

describe('prototypes/base: separator', () => {
  it('hides decorative separators from the accessibility tree', async () => {
    const el = document.createElement('base-separator-root');
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.tabIndex).toBe(-1);
    el.remove();
  });

  it('projects semantic role and orientation without interaction', async () => {
    const el = document.createElement('base-separator-root');
    setElementProps(el, { decorative: false, orientation: 'vertical' });
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
    expect(el.tabIndex).toBe(-1);
    el.remove();
  });
});
