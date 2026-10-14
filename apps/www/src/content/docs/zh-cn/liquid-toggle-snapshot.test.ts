import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeLiquidToggleSnapshot } from './liquid-toggle-snapshot';
import { observeOwnedMaterialPaint } from './material-paint-observation';

const imageA = 'url("data:image/png;base64,AAAA")';
const imageB = 'url("data:image/png;base64,BBBB")';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});
function fixture(onDecode: (call: number) => void | Promise<void> = () => {}) {
  const host = document.createElement('button');
  host.setAttribute('aria-pressed', 'false');
  host.setAttribute('aria-disabled', 'false');
  host.setAttribute('data-pui-material-carrier', 'contact-v1');
  host.style.setProperty('--pui-material-image', imageA);
  Object.assign(host.dataset, {
    materialQuality: 'self-optical',
    materialReason: 'rendered',
    materialSource: 'visible-app-canvas',
    materialFrame: '1',
    materialSourceRevision: '7',
    materialPhase: 'rest',
    materialMotion: 'press',
    materialContactSession: '1',
  });
  document.body.append(host);
  const css = {
    backgroundColor: 'rgb(0, 0, 0)',
    color: 'rgb(255, 255, 255)',
    backgroundImage: 'none',
    borderTopLeftRadius: '9999px',
    borderTopWidth: '1px',
    borderRightWidth: '1px',
    borderBottomWidth: '1px',
    borderLeftWidth: '1px',
    borderTopColor: 'rgb(255, 255, 255)',
    textDecorationLine: 'none',
    boxShadow: 'none',
    opacity: '1',
    pointerEvents: 'auto',
    backdropFilter: 'none',
    getPropertyValue: () => 'rgb(255, 255, 255)',
  };
  const pseudo = {
    backgroundImage: imageA,
    content: '""',
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: '-1',
    visibility: 'visible',
    opacity: '1',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    left: '-10px',
    top: '-10px',
    width: '118px',
    height: '58px',
  };
  let rect = new DOMRect(40, 50, 100, 40);
  vi.spyOn(host, 'getBoundingClientRect').mockImplementation(() => rect);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (_el, part) => (part ? pseudo : css) as unknown as CSSStyleDeclaration
  );
  vi.stubGlobal('CSS', { supports: () => true });
  class Canvas {
    constructor(
      public width: number,
      public height: number
    ) {}
    getContext() {
      return {
        fillStyle: '',
        clearRect() {},
        fillRect() {},
        drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray([20, 40, 60, 255, 80, 100, 120, 255]) }),
      };
    }
  }
  vi.stubGlobal('OffscreenCanvas', Canvas);
  const decode = vi.fn(async () => {
    await onDecode(decode.mock.calls.length);
  });
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      get width() {
        return this.src.includes('BBBB') ? 218 : 118;
      }
      height = 58;
      decode = decode;
    }
  );
  return {
    host,
    css,
    pseudo,
    decode,
    updateImage() {
      pseudo.backgroundImage = imageB;
      host.style.setProperty('--pui-material-image', imageB);
      host.dataset.materialFrame = '2';
      host.dataset.materialSourceRevision = '8';
    },
    resize() {
      rect = new DOMRect(40, 50, 110, 40);
      pseudo.width = '130px';
      pseudo.left = '-11px';
      pseudo.top = '-11px';
      pseudo.height = '60px';
    },
  };
}
describe('Liquid Toggle immutable committed snapshot (modeled decode timing, not native paint)', () => {
  it('rejects mixed pre-decode image and live post-decode CSS by resampling the new commit', async () => {
    const f = fixture((call) => {
      if (call === 1) f.updateImage();
    });
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.image).toBe(imageB);
    expect(facts.carrier.image).toBe(facts.image);
    expect(facts.receipt).toMatchObject({ frame: '2', sourceRevision: '8' });
    expect(facts.paint.image).toBe(facts.image);
    expect(facts.paint.committed).toBe(true);
    expect(facts.pixels?.width).toBe(218);
    expect(f.decode).toHaveBeenCalledTimes(2);
  });
  it('captures receipt, CSS and paint on the same stable commit', async () => {
    const f = fixture();
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.image).toBe(imageA);
    expect(facts.receipt).toMatchObject({ frame: '1', sourceRevision: '7' });
    expect(facts.paint).toMatchObject(observeOwnedMaterialPaint(f.host));
    expect(facts.snapshot).toEqual({ attempts: 1, verifiedAfterDecode: true });
    expect(f.decode).toHaveBeenCalledOnce();
  });
  it('detects a new receipt even when the encoded image is unchanged', async () => {
    const f = fixture((call) => {
      if (call === 1) {
        f.host.dataset.materialFrame = '2';
        f.host.setAttribute('aria-pressed', 'true');
        f.css.textDecorationLine = 'underline';
      }
    });
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.receipt.frame).toBe('2');
    expect(facts.active).toBe('true');
    expect(facts.underline).toBe('underline');
    expect(f.decode).toHaveBeenCalledTimes(2);
  });
  it('rechecks CSS and source receipts even when the image and frame counter are unchanged', async () => {
    const f = fixture((call) => {
      if (call === 1) {
        f.css.boxShadow = 'rgb(0, 0, 0) 0px 1px 2px';
        f.host.dataset.materialSourceRevision = '8';
      }
    });
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.receipt.frame).toBe('1');
    expect(facts.receipt.sourceRevision).toBe('8');
    expect(facts.shadow).toBe(f.css.boxShadow);
    expect(f.decode).toHaveBeenCalledTimes(2);
  });
  it('retries a superseded decode error but only accepts the replacement current snapshot', async () => {
    const f = fixture((call) => {
      if (call === 1) {
        f.updateImage();
        throw new Error('superseded image decode failed');
      }
    });
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.image).toBe(imageB);
    expect(facts.pixels?.width).toBe(218);
    expect(f.decode).toHaveBeenCalledTimes(2);
  });
  it('is self-contained when serialized like a Playwright evaluate callback', async () => {
    const f = fixture();
    const serialized = new Function(
      `return (${observeLiquidToggleSnapshot.toString()});`
    )() as typeof observeLiquidToggleSnapshot;
    const facts = await serialized(f.host);
    expect(facts.paint.committed).toBe(true);
    expect(facts.receipt.frame).toBe('1');
    expect(f.decode).toHaveBeenCalledOnce();
  });
  it('rechecks geometry instead of attaching later paint bounds to earlier CSS', async () => {
    const f = fixture((call) => {
      if (call === 1) f.resize();
    });
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.width).toBe(110);
    expect(facts.paint.hostGeometry.width).toBe(110);
    expect(facts.paint.geometryMatches).toBe(true);
    expect(f.decode).toHaveBeenCalledTimes(2);
  });
  it('does not turn a stable uncommitted carrier into accepted optical evidence', async () => {
    const f = fixture();
    f.pseudo.backgroundImage = imageB;
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.paint.committed).toBe(false);
    expect(f.decode).toHaveBeenCalledOnce();
  });
  it.each([
    { backgroundImage: 'none' },
    { backgroundImage: imageB },
    { left: '-9px' },
    { width: '100px' },
    { height: 'auto' },
    { content: '"author content"' },
    { position: 'relative' },
    { pointerEvents: 'auto' },
    { zIndex: '1' },
    { visibility: 'hidden' },
    { opacity: '0' },
    { backgroundSize: 'auto' },
    { backgroundRepeat: 'repeat' },
  ])('retains shared observer rejection for corrupted carrier %j', async (patch) => {
    const f = fixture();
    Object.assign(f.pseudo, patch);
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.paint).toMatchObject(observeOwnedMaterialPaint(f.host));
    expect(facts.paint.committed).toBe(false);
    expect(facts.snapshot.attempts).toBe(1);
  });
  it.each(['unknown-marker', 'duplicate-host-paint'])(
    'retains shared observer rejection for %s',
    async (condition) => {
      const f = fixture();
      if (condition === 'unknown-marker') f.host.setAttribute('data-pui-material-carrier', 'other');
      else f.css.backgroundImage = imageA;
      const facts = await observeLiquidToggleSnapshot(f.host);
      expect(facts.paint).toMatchObject(observeOwnedMaterialPaint(f.host));
      expect(facts.paint.committed).toBe(false);
      expect(facts.snapshot.attempts).toBe(1);
    }
  );
  it('keeps a stable decode error rather than retrying it away', async () => {
    const failure = new Error('corrupt committed image');
    const f = fixture(() => {
      throw failure;
    });
    await expect(observeLiquidToggleSnapshot(f.host)).rejects.toBe(failure);
    expect(f.decode).toHaveBeenCalledOnce();
  });
  it('fails boundedly when every decoded snapshot is superseded', async () => {
    const f = fixture((call) => {
      f.host.dataset.materialFrame = String(call + 1);
    });
    await expect(observeLiquidToggleSnapshot(f.host)).rejects.toThrow('did not stabilize after 4');
    expect(f.decode).toHaveBeenCalledTimes(4);
  });
  it('bounds a decode that never settles', async () => {
    vi.useFakeTimers();
    const f = fixture(() => new Promise(() => {}));
    const reading = observeLiquidToggleSnapshot(f.host);
    const rejected = expect(reading).rejects.toThrow('decode deadline');
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('observes ordinary fallback without fabricating a decoded image or commit', async () => {
    const f = fixture();
    f.host.removeAttribute('data-pui-material-carrier');
    f.host.dataset.materialQuality = 'opaque-fallback';
    const facts = await observeLiquidToggleSnapshot(f.host);
    expect(facts.image).toBe('none');
    expect(facts.paint.committed).toBe(false);
    expect(facts.pixels).toBeNull();
    expect(facts.snapshot).toEqual({ attempts: 1, verifiedAfterDecode: false });
    expect(f.decode).not.toHaveBeenCalled();
  });
});
