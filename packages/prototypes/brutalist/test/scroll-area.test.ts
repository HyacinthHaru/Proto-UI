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
    const root = document.createElement('brutalist-scroll-area-root') as any;
    const viewport = document.createElement('brutalist-scroll-area-viewport') as any;
    const scrollbar = document.createElement('brutalist-scroll-area-scrollbar') as any;
    const thumb = document.createElement('brutalist-scroll-area-thumb') as any;
    const corner = document.createElement('brutalist-scroll-area-corner') as any;
    scrollbar.appendChild(thumb);
    root.append(viewport, scrollbar, corner);
    document.body.appendChild(root);
    await Promise.resolve();
    await Promise.resolve();

    expect(styleContains(root, 'rounded-none')).toBe(true);
    expect(styleContains(root, 'border-2')).toBe(true);
    expect(styleContains(root, 'overflow-hidden')).toBe(true);
    expect(styleContains(viewport, 'overflow-auto')).toBe(true);
    expect(styleContains(scrollbar, 'bg-lavender')).toBe(true);
    expect(styleContains(thumb, 'bg-foreground')).toBe(true);

    root.remove();
  });
});
