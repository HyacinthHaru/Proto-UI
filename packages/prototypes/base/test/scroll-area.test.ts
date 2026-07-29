import { afterEach, describe, expect, it } from 'vitest';
import {
  AdaptToWebComponent,
  setElementProps,
  type WebComponentAdapterElement,
} from '@proto.ui/adapter-web-component';
import {
  scrollAreaRoot,
  scrollAreaScrollbar,
  scrollAreaThumb,
  scrollAreaViewport,
} from '../src/scroll-area';

const ScrollAreaRootElement = AdaptToWebComponent(scrollAreaRoot);
const ScrollAreaViewportElement = AdaptToWebComponent(scrollAreaViewport);
const ScrollAreaScrollbarElement = AdaptToWebComponent(scrollAreaScrollbar);
const ScrollAreaThumbElement = AdaptToWebComponent(scrollAreaThumb);

type ViewportElement = WebComponentAdapterElement<typeof scrollAreaViewport>;
type ThumbElement = WebComponentAdapterElement<typeof scrollAreaThumb>;

type MutableMetrics = {
  clientHeight: number;
  clientWidth: number;
  scrollHeight: number;
  scrollWidth: number;
  scrollTop?: number;
  scrollLeft?: number;
};

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function mockViewportMetrics(viewport: ViewportElement, metrics: MutableMetrics): void {
  let scrollTop = metrics.scrollTop ?? 0;
  let scrollLeft = metrics.scrollLeft ?? 0;
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

function pointerEvent(type: string, point: { clientX?: number; clientY?: number }): Event {
  return Object.assign(new Event(type, { bubbles: true }), point);
}

function createScrollArea(
  orientation: 'horizontal' | 'vertical' = 'vertical',
  metrics: MutableMetrics = {
    clientHeight: 100,
    clientWidth: 120,
    scrollHeight: 400,
    scrollWidth: 600,
  }
): {
  viewport: ViewportElement;
  thumb: ThumbElement;
} {
  const root = new ScrollAreaRootElement();
  const viewport = new ScrollAreaViewportElement();
  const scrollbar = new ScrollAreaScrollbarElement();
  const thumb = new ScrollAreaThumbElement();
  setElementProps(scrollbar, { orientation });
  setElementProps(thumb, { orientation });
  mockViewportMetrics(viewport, metrics);
  scrollbar.appendChild(thumb);
  root.append(viewport, scrollbar);
  document.body.appendChild(root);
  return { viewport, thumb };
}

async function publishMetrics(viewport: ViewportElement): Promise<void> {
  viewport.dispatchEvent(new Event('scroll'));
  await flush();
}

afterEach(async () => {
  document.body.replaceChildren();
  await flush();
});

describe('prototypes/base: scroll-area behavior', () => {
  it('publishes all viewport metrics from the host scroll surface', async () => {
    const { viewport } = createScrollArea('vertical', {
      clientHeight: 100,
      clientWidth: 120,
      scrollHeight: 400,
      scrollWidth: 600,
      scrollTop: 40,
      scrollLeft: 30,
    });
    await flush();
    await publishMetrics(viewport);

    const exposes = viewport.getExposes();
    expect(exposes.clientHeight.get()).toBe(100);
    expect(exposes.clientWidth.get()).toBe(120);
    expect(exposes.scrollHeight.get()).toBe(400);
    expect(exposes.scrollWidth.get()).toBe(600);
    expect(exposes.scrollTop.get()).toBe(40);
    expect(exposes.scrollLeft.get()).toBe(30);
  });

  it.each([['vertical', 0.25, 0.5] as const, ['horizontal', 0.2, 0.25] as const])(
    'derives exact %s thumb size and offset ratios',
    async (orientation, size, offset) => {
      const { viewport, thumb } = createScrollArea(orientation, {
        clientHeight: 100,
        clientWidth: 120,
        scrollHeight: 400,
        scrollWidth: 600,
        scrollTop: 150,
        scrollLeft: 120,
      });
      await flush();
      await publishMetrics(viewport);

      expect(thumb.getExposes().sizeRatio.get()).toBe(size);
      expect(thumb.getExposes().offsetRatio.get()).toBe(offset);
    }
  );

  it('keeps zero-size metrics finite and stable', async () => {
    const { viewport, thumb } = createScrollArea('vertical', {
      clientHeight: 0,
      clientWidth: 0,
      scrollHeight: 0,
      scrollWidth: 0,
    });
    await flush();
    await publishMetrics(viewport);

    expect(thumb.getExposes().sizeRatio.get()).toBe(1);
    expect(thumb.getExposes().offsetRatio.get()).toBe(0);
  });

  it.each([
    ['vertical', 'scrollTop', 'clientY', 25, 100] as const,
    ['horizontal', 'scrollLeft', 'clientX', 24, 120] as const,
  ])(
    'maps %s drag travel to the corresponding scroll range',
    async (orientation, scrollKey, clientKey, delta, expected) => {
      const { viewport, thumb } = createScrollArea(orientation);
      await flush();
      await publishMetrics(viewport);

      thumb.dispatchEvent(pointerEvent('pointerdown', { [clientKey]: 10 }));
      thumb.dispatchEvent(pointerEvent('pointermove', { [clientKey]: 10 + delta }));
      await flush();

      expect(viewport.getExposes()[scrollKey].get()).toBe(expected);
    }
  );

  it('does not replay an omitted axis from an older drag request', async () => {
    const { viewport, thumb } = createScrollArea('vertical');
    await flush();
    await publishMetrics(viewport);

    thumb.dispatchEvent(pointerEvent('pointerdown', { clientY: 10 }));
    thumb.dispatchEvent(pointerEvent('pointermove', { clientY: 35 }));
    thumb.dispatchEvent(pointerEvent('pointerup', { clientY: 35 }));
    await flush();
    expect(viewport.scrollTop).toBe(100);

    viewport.scrollTop = 40;
    await publishMetrics(viewport);
    setElementProps(thumb, { orientation: 'horizontal' });
    await flush();
    thumb.dispatchEvent(pointerEvent('pointerdown', { clientX: 10 }));
    thumb.dispatchEvent(pointerEvent('pointermove', { clientX: 34 }));
    await flush();

    expect(viewport.scrollTop).toBe(40);
    expect(viewport.scrollLeft).toBe(120);
  });

  it('clamps drag requests and stops applying movement after pointer up', async () => {
    const { viewport, thumb } = createScrollArea('vertical');
    await flush();
    await publishMetrics(viewport);

    thumb.dispatchEvent(pointerEvent('pointerdown', { clientY: 50 }));
    thumb.dispatchEvent(pointerEvent('pointermove', { clientY: 500 }));
    await flush();
    expect(viewport.getExposes().scrollTop.get()).toBe(300);

    thumb.dispatchEvent(pointerEvent('pointermove', { clientY: -500 }));
    await flush();
    expect(viewport.getExposes().scrollTop.get()).toBe(0);

    thumb.dispatchEvent(pointerEvent('pointerup', { clientY: -500 }));
    thumb.dispatchEvent(pointerEvent('pointermove', { clientY: 50 }));
    await flush();
    expect(viewport.getExposes().scrollTop.get()).toBe(0);
  });
});
