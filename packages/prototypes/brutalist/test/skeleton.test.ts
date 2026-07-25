import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { BrutalistSkeletonRoot } from '../src/skeleton';

AdaptToWebComponent(BrutalistSkeletonRoot as any);

describe('prototypes/brutalist: skeleton', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-skeleton-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);
    expect(styleContains(el, 'bg-lavender')).toBe(true);

    el.remove();
  });
});
