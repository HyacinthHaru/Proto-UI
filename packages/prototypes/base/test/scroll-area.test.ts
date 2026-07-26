import { afterEach, describe, expect, it } from 'vitest';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  scrollAreaRoot,
  scrollAreaScrollbar,
  scrollAreaThumb,
  scrollAreaViewport,
} from '../src/scroll-area';

AdaptToWebComponent(scrollAreaRoot as any);
AdaptToWebComponent(scrollAreaViewport as any);
AdaptToWebComponent(scrollAreaScrollbar as any);
AdaptToWebComponent(scrollAreaThumb as any);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function mockViewportMetrics(
  viewport: HTMLElement,
  metrics: {
    clientHeight: number;
    clientWidth: number;
    scrollHeight: number;
    scrollWidth: number;
  }
) {
  let scrollTop = 0;
  let scrollLeft = 0;
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, get: () => metrics.clientHeight },
    clientWidth: { configurable: true, get: () => metrics.clientWidth },
    scrollHeight: { configurable: true, get: () => metrics.scrollHeight },
    scrollWidth: { configurable: true, get: () => metrics.scrollWidth },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    },
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    },
  });
}

function createScrollArea() {
  const root = document.createElement('base-scroll-area-root') as any;
  const viewport = document.createElement('base-scroll-area-viewport') as any;
  const scrollbar = document.createElement('base-scroll-area-scrollbar') as any;
  const thumb = document.createElement('base-scroll-area-thumb') as any;
  mockViewportMetrics(viewport, {
    clientHeight: 100,
    clientWidth: 100,
    scrollHeight: 400,
    scrollWidth: 100,
  });
  const content = document.createElement('div');
  content.style.height = '400px';
  viewport.appendChild(content);
  scrollbar.appendChild(thumb);
  root.append(viewport, scrollbar);
  document.body.appendChild(root);
  return { root, viewport, scrollbar, thumb, content };
}

afterEach(async () => {
  document.body.replaceChildren();
  await flush();
});

describe('prototypes/base: scroll-area', () => {
  it('publishes viewport metrics on scroll', async () => {
    const { viewport } = createScrollArea();
    await flush();
    viewport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await flush();

    expect(viewport.getExposes().clientHeight.get()).toBe(100);
    expect(viewport.getExposes().scrollHeight.get()).toBe(400);

    viewport.scrollTop = 40;
    viewport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await flush();
    expect(viewport.getExposes().scrollTop.get()).toBe(40);
  });

  it('updates thumb ratios from metrics', async () => {
    const { viewport, thumb } = createScrollArea();
    await flush();
    viewport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await flush();

    const size = thumb.getExposes().sizeRatio.get();
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(1);

    viewport.scrollTop = 50;
    viewport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await flush();
    expect(thumb.getExposes().offsetRatio.get()).toBeGreaterThan(0);
  });

  it('thumb pointer drag requests scroll position changes', async () => {
    const { viewport, thumb } = createScrollArea();
    await flush();
    viewport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await flush();

    thumb.dispatchEvent(
      Object.assign(new Event('pointerdown', { bubbles: true }), {
        clientY: 10,
        pointerId: 1,
      })
    );
    thumb.dispatchEvent(
      Object.assign(new Event('pointermove', { bubbles: true }), {
        clientY: 40,
        pointerId: 1,
      })
    );
    await flush();
    expect(viewport.getExposes().scrollTop.get()).toBeGreaterThan(0);
  });
});
