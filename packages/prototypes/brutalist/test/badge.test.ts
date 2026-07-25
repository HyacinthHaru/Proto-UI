import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { BrutalistBadgeRoot } from '../src/badge';

AdaptToWebComponent(BrutalistBadgeRoot as any);

describe('prototypes/brutalist: badge', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-badge-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'bg-canary')).toBe(true);
    expect(styleContains(el, 'font-mono')).toBe(true);

    el.remove();
  });
});
