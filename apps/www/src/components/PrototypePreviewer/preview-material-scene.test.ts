import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveWebPortalDestination } from '@proto.ui/adapter-base';
import { inspectCanvasBackdrop } from '@proto.ui/adapter-base/web-material';
import { createPreviewMaterialScene } from './preview-material-scene';
import { findPreviewMaterialProvider } from './preview-material-provider';

// Deterministic layout/source-lease evidence only. Pixels and layout below are
// stubs, never native optical evidence; the dedicated browser suite owns that.
const cleanups: Array<() => void> = [];
let width = 420;
let flowHeight = 40;
let frames: Map<number, FrameRequestCallback>;
let resizeCallbacks: ResizeObserverCallback[];
let rects: WeakMap<Element, DOMRect>;
const rect = (x: number, y: number, w: number, h: number) => new DOMRect(x, y, w, h);
beforeEach(() => {
  width = 420;
  flowHeight = 40;
  frames = new Map();
  resizeCallbacks = [];
  rects = new WeakMap();
  let id = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
    frames.set(++id, fn);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(fn: ResizeObserverCallback) {
        resizeCallbacks.push(fn);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (rects.has(this)) return rects.get(this)!;
    const element = this as HTMLElement;
    const scope = element.closest<HTMLElement>('[data-material-scene]');
    if (element === scope || element.matches('[data-material-backdrop]'))
      return rect(0, 0, width, parseFloat(scope!.style.minHeight) || flowHeight + 64);
    if (element.parentElement === scope && !element.matches('[data-material-overlay-mount]'))
      return rect(32, 32, width - 64, flowHeight);
    return rect(0, 0, 0, 0);
  });
  const computed = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const css = computed(element, pseudo);
    if (element.matches('[data-material-scene]'))
      Object.defineProperty(css, 'paddingBottom', { value: '32px', configurable: true });
    return css;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return {
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      fill() {},
      fillText() {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4).fill(255),
      }),
    } as any;
  });
});
afterEach(() => {
  for (const fn of cleanups.splice(0).reverse()) fn();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function scene(parent = document.body) {
  const scene = createPreviewMaterialScene(parent);
  scene.pause(true);
  cleanups.push(() => scene.dispose());
  return scene;
}
function resize() {
  for (const fn of resizeCallbacks) fn([], {} as ResizeObserver);
  for (const [id, fn] of [...frames]) {
    frames.delete(id);
    fn(0);
  }
}
describe('bounded visible Previewer source layout', () => {
  it('registers the real scope and preserves nested projected author ancestry', () => {
    const s = scene();
    const origin = document.createElement('span');
    const content = document.createElement('div');
    s.mount.append(origin);
    expect(resolveWebPortalDestination(origin, content)).toBe(s.overlayMount);
    s.overlayMount.append(content);
    const nestedOrigin = document.createElement('span');
    content.append(nestedOrigin);
    const nestedTarget = document.createElement('div');
    expect(resolveWebPortalDestination(nestedOrigin, nestedTarget)).toBe(s.overlayMount);
    expect(findPreviewMaterialProvider(content)).not.toBeNull();
    const sibling = document.createElement('div');
    document.body.append(sibling);
    expect(resolveWebPortalDestination(sibling, nestedTarget)).toBe(document.body);
    s.dispose();
    expect(resolveWebPortalDestination(origin, content)).toBe(document.body);
    expect(s.lease.current()).toBeNull();
  });
  it('uses actual flow extent, then reserves and removes popup plus full contact envelope', () => {
    const s = scene();
    expect(s.scope.style.maxWidth).toBe('32rem');
    expect(s.scope.style.minHeight).toBe('104px');
    const popup = document.createElement('div');
    s.overlayMount.append(popup);
    rects.set(popup, rect(32, 80, 200, 300));
    resize();
    // 80 + 300 + ceil(300 * .08 + 1) + 32.
    expect(s.scope.style.minHeight).toBe('437px');
    expect(s.lease.current()?.height).toBe(437);
    expect(popup.parentElement).toBe(s.overlayMount);
    popup.remove();
    resize();
    expect(s.scope.style.minHeight).toBe('104px');
    expect(s.lease.current()?.height).toBe(104);
  });
  it('rejects actual one-pixel coverage loss without weakening contains or outset checks', () => {
    const s = scene();
    const popup = document.createElement('div');
    s.overlayMount.append(popup);
    rects.set(popup, rect(32, 100, 200, 300));
    resize();
    const canvas = s.scope.querySelector('canvas')!;
    // Remove only the test layout reserve; source admission still sees the real
    // current canvas geometry, including the caller-specified full paintOutset.
    rects.set(canvas, rect(0, 0, 420, 424));
    s.redraw();
    expect(inspectCanvasBackdrop(popup, s.lease.current(), 25).reason).toBe(
      'source-bounds-unavailable'
    );
    rects.set(canvas, rect(0, 0, 420, 425));
    s.redraw();
    expect(inspectCanvasBackdrop(popup, s.lease.current(), 25).reason).toBe('visible-app-canvas');
    document.body.append(popup);
    expect(inspectCanvasBackdrop(popup, s.lease.current()).reason).toBe('source-scope-unavailable');
  });
  it('retains exact DPR and pixel budget boundaries rather than silently downsampling', () => {
    const s = scene();
    width = 512;
    flowHeight = 448;
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
    resize();
    expect(s.lease.current()).toMatchObject({ width: 1024, height: 1024 });
    flowHeight = 448.5;
    resize();
    expect(s.lease.current()).toBeNull();
    flowHeight = 448;
    resize();
    expect(s.lease.current()?.width).toBe(1024);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
    s.redraw();
    expect(s.lease.current()).toBeNull();
  });
  it('rejects fractional edge overflow and non-finite DPR without fabricating a smaller source', () => {
    const s = scene();
    width = 2048;
    flowHeight = 1;
    resize();
    expect(s.lease.current()).toMatchObject({ width: 2048, height: 65 });
    width = 2048.01;
    resize();
    expect(s.lease.current()).toBeNull();
    width = 400;
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(Number.NaN);
    s.redraw();
    expect(s.lease.current()).toBeNull();
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1.25);
    resize();
    expect(s.lease.current()).toMatchObject({ width: 500, height: 82 });
  });
  it('invalidates source withdrawal and cancels scheduled layout on disposal', () => {
    const s = scene();
    expect(s.lease.current()).not.toBeNull();
    s.sourceAvailable(false);
    expect(s.lease.current()).toBeNull();
    s.sourceAvailable(true);
    expect(s.lease.current()).not.toBeNull();
    for (const fn of resizeCallbacks) fn([], {} as ResizeObserver);
    expect(frames.size).toBeGreaterThan(0);
    s.dispose();
    expect(frames.size).toBe(0);
    expect(s.scope.isConnected).toBe(false);
  });
});
