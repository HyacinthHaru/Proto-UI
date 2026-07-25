import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { BrutalistAvatarRoot, BrutalistAvatarImage, BrutalistAvatarFallback } from '../src/avatar';

AdaptToWebComponent(BrutalistAvatarRoot as any);
AdaptToWebComponent(BrutalistAvatarImage as any);
AdaptToWebComponent(BrutalistAvatarFallback as any);

describe('prototypes/brutalist: avatar', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-avatar-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);

    el.remove();
  });
});
