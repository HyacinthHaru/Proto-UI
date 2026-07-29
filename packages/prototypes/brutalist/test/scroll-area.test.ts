import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { styleContains } from '../../test-utils/style';
import {
  BrutalistScrollAreaRoot,
  BrutalistScrollAreaViewport,
  BrutalistScrollAreaScrollbar,
  BrutalistScrollAreaThumb,
  BrutalistScrollAreaCorner,
} from '../src/scroll-area';

const ScrollAreaRootElement = AdaptToWebComponent(BrutalistScrollAreaRoot);
const ScrollAreaViewportElement = AdaptToWebComponent(BrutalistScrollAreaViewport);
const ScrollAreaScrollbarElement = AdaptToWebComponent(BrutalistScrollAreaScrollbar);
const ScrollAreaThumbElement = AdaptToWebComponent(BrutalistScrollAreaThumb);
const ScrollAreaCornerElement = AdaptToWebComponent(BrutalistScrollAreaCorner);

async function flushViewReconciliation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/brutalist: scroll-area', () => {
  it('projects the five-part Base anatomy as a consumer-sized visual shell', async () => {
    const root = new ScrollAreaRootElement();
    const viewport = new ScrollAreaViewportElement();
    const scrollbar = new ScrollAreaScrollbarElement();
    const thumb = new ScrollAreaThumbElement();
    const corner = new ScrollAreaCornerElement();
    scrollbar.appendChild(thumb);
    root.append(viewport, scrollbar, corner);
    document.body.appendChild(root);
    await flushViewReconciliation();

    expect(styleContains(root, 'h-full')).toBe(true);
    expect(styleContains(root, 'w-full')).toBe(true);
    expect(styleContains(root, 'rounded-none')).toBe(true);
    expect(styleContains(root, 'border-2')).toBe(true);
    expect(styleContains(root, 'overflow-hidden')).toBe(true);
    expect(styleContains(viewport, 'overflow-auto')).toBe(true);
    expect(styleContains(scrollbar, 'bg-lavender')).toBe(true);
    expect(styleContains(scrollbar, 'border-l-2')).toBe(true);
    expect(styleContains(scrollbar, 'absolute')).toBe(true);
    expect(styleContains(scrollbar, 'inset-0')).toBe(true);
    expect(styleContains(scrollbar, 'left-auto')).toBe(true);
    expect(styleContains(thumb, 'bg-foreground')).toBe(true);
    expect(styleContains(corner, 'bg-foreground')).toBe(true);
    expect(styleContains(corner, 'absolute')).toBe(true);
    expect(styleContains(corner, 'bottom-0')).toBe(true);
    expect(styleContains(corner, 'right-0')).toBe(true);
    expect(styleContains(corner, 'h-4')).toBe(true);
    expect(styleContains(corner, 'w-4')).toBe(true);

    root.remove();
  });

  it('projects the horizontal scrollbar geometry without adding behavior', async () => {
    const scrollbar = new ScrollAreaScrollbarElement();
    setElementProps(scrollbar, { orientation: 'horizontal' });
    document.body.appendChild(scrollbar);
    await flushViewReconciliation();

    expect(styleContains(scrollbar, 'h-4')).toBe(true);
    expect(styleContains(scrollbar, 'w-full')).toBe(true);
    expect(styleContains(scrollbar, 'flex-col')).toBe(true);
    expect(styleContains(scrollbar, 'border-t-2')).toBe(true);
    expect(styleContains(scrollbar, 'absolute')).toBe(true);
    expect(styleContains(scrollbar, 'inset-0')).toBe(true);
    expect(styleContains(scrollbar, 'top-auto')).toBe(true);
    expect(scrollbar.getExposes().orientation.get()).toBe('horizontal');

    scrollbar.remove();
  });
});
