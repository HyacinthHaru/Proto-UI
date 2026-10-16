import { describe, expect, it } from 'vitest';
import { observeOwnedMaterialPaint } from './material-paint-observation';

function fixture(
  patch: Record<string, string | undefined> = {},
  marker: string | null = 'contact-v1'
) {
  const image = 'url("data:image/png;base64,AAAA")';
  const style = {
    backgroundImage: 'none',
    backdropFilter: 'none',
    borderLeftWidth: '1px',
    borderTopWidth: '1px',
  };
  const pseudo = {
    backgroundImage: image,
    left: '-10px',
    top: '-10px',
    width: '118px',
    height: '58px',
    content: '""',
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: '-1',
    visibility: 'visible',
    opacity: '1',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    ...patch,
  };
  const element = {
    ownerDocument: {
      defaultView: { getComputedStyle: (_el: unknown, part?: string) => (part ? pseudo : style) },
    },
    style: { getPropertyValue: (name: string) => (name === '--pui-material-image' ? image : '') },
    dataset: { materialQuality: 'self-optical', materialSource: 'visible-app-canvas' },
    getAttribute: () => marker,
    getBoundingClientRect: () => ({ width: 100, height: 40 }),
    querySelectorAll: () => [],
  } as unknown as Element;
  return { element, style, pseudo };
}

describe('owned optical paint observation, independent of quality metadata', () => {
  it('accepts only this host committed contact image with its real expanded geometry', () => {
    const { element } = fixture();
    expect(observeOwnedMaterialPaint(element)).toMatchObject({
      committed: true,
      geometryMatches: true,
      carrier: 'contact-v1',
      expectedCarrierGeometry: { left: -10, top: -10, width: 118, height: 58 },
    });
  });
  it.each([
    { backgroundImage: 'none' },
    { backgroundImage: 'url("data:image/png;base64,BBBB")' },
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
  ])('rejects corrupted carrier despite self-optical metadata: %j', (patch) => {
    const { element } = fixture(patch);
    expect(observeOwnedMaterialPaint(element).committed).toBe(false);
  });
  it('does not use an unowned pseudo image or a descendant as proof', () => {
    const { element } = fixture({}, null);
    expect(observeOwnedMaterialPaint(element)).toMatchObject({ image: 'none', committed: false });
  });
  it('rejects an unknown marker and duplicate host paint', () => {
    expect(observeOwnedMaterialPaint(fixture({}, 'foreign').element).committed).toBe(false);
    const { element, style } = fixture();
    style.backgroundImage = 'url("data:image/png;base64,AAAA")';
    expect(observeOwnedMaterialPaint(element).committed).toBe(false);
  });
  it('retains the existing direct-host path without claiming contact geometry', () => {
    const { element, style } = fixture({}, null);
    style.backgroundImage = 'url("data:image/png;base64,AAAA")';
    expect(observeOwnedMaterialPaint(element)).toMatchObject({ committed: true, carrier: null });
  });
});
