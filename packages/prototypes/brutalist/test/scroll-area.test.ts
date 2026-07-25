import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  BrutalistScrollAreaRoot,
  BrutalistScrollAreaViewport,
  BrutalistScrollAreaScrollbar,
  BrutalistScrollAreaThumb,
  BrutalistScrollAreaCorner,
} from '../src/scroll-area';

AdaptToWebComponent(BrutalistScrollAreaRoot as any);
AdaptToWebComponent(BrutalistScrollAreaViewport as any);
AdaptToWebComponent(BrutalistScrollAreaScrollbar as any);
AdaptToWebComponent(BrutalistScrollAreaThumb as any);
AdaptToWebComponent(BrutalistScrollAreaCorner as any);

describe('prototypes/brutalist: scroll-area', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-scroll-area-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);

    el.remove();
  });
});
