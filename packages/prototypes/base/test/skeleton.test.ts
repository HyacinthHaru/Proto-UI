import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import skeletonRoot from '../src/skeleton';

AdaptToWebComponent(skeletonRoot);

describe('prototypes/base: skeleton', () => {
  it('is a hidden, non-interactive visual placeholder', async () => {
    const el = document.createElement('base-skeleton-root');
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(el.tabIndex).toBe(-1);
    el.remove();
  });
});
