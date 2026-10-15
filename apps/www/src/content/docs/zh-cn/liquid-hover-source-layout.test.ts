import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCanvasBackdropLease,
  inspectCanvasBackdrop,
} from '../../../../../../packages/adapters/base/src/material/source';
import { contactPaintOutset } from '../../../../../../packages/adapters/base/src/material/contact-profile';

// Real admission implementation, injected geometry from a62 native receipts.
// This is a deterministic fixture regression, not browser/layout/GPU evidence.
const pageSource = readFileSync('apps/www/src/pages/en/test/liquid-glass-hover.astro', 'utf8');
const authoredReserve = Number(
  pageSource.match(/scene\.mount\.style\.paddingBottom = '(\d+)px'/)?.[1] ?? 0
);
const cases = [
  ['button', 130.546875, 38],
  ['toggle', 148.6875, 38],
  ['collapsible', 416, 46],
  ['select', 141.953125, 38],
  ['dropdown', 153.921875, 38],
] as const;
const rect = (x: number, y: number, w: number, h: number) => new DOMRect(x, y, w, h);
function layout(width: number, height: number, reserve: number, edge = false) {
  const scope = document.createElement('div');
  const canvas = document.createElement('canvas');
  const mount = document.createElement('div');
  const subject = document.createElement('button');
  const destination = document.createElement('div');
  destination.dataset.materialOverlayMount = '';
  destination.style.height = '0px';
  mount.append(subject);
  scope.append(canvas, mount, destination);
  document.body.append(scope);
  const inset = edge ? 0 : 48;
  const sourceHeight = height + reserve + inset * 2;
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 512, sourceHeight));
  vi.spyOn(subject, 'getBoundingClientRect').mockReturnValue(rect(inset, inset, width, height));
  vi.spyOn(mount, 'getBoundingClientRect').mockReturnValue(
    rect(inset, inset, 416, height + reserve)
  );
  // Existing scene destination is real flow at mount.bottom, even at zero height.
  vi.spyOn(destination, 'getBoundingClientRect').mockReturnValue(
    rect(inset, inset + height + reserve, 416, 0)
  );
  vi.spyOn(canvas, 'getContext').mockReturnValue({
    getImageData: () => ({ data: new Uint8ClampedArray(512 * sourceHeight * 4).fill(255) }),
  } as any);
  const lease = createCanvasBackdropLease(scope, canvas);
  lease.draw(() => {});
  return { subject, scope, lease, outset: contactPaintOutset(width, height) };
}
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
describe('hover positive fixture keeps the portal destination beyond the contact footprint', () => {
  for (const [part, width, height] of cases) {
    it(`${part}: unchanged guard admits the authored positive layout`, () => {
      const f = layout(width, height, authoredReserve);
      expect(inspectCanvasBackdrop(f.subject, f.lease.current(), f.outset)).toMatchObject({
        valid: true,
      });
      expect(authoredReserve).toBeGreaterThan(f.outset);
    });
    it(`${part}: a62 zero-reserve destination still rejects expanded paint`, () => {
      const f = layout(width, height, 0);
      expect(inspectCanvasBackdrop(f.subject, f.lease.current(), 0).valid).toBe(true);
      expect(inspectCanvasBackdrop(f.subject, f.lease.current(), f.outset)).toMatchObject({
        valid: false,
        reason: 'source-overlapping-content',
      });
    });
  }
  it('keeps a genuinely overlapping neighboring box rejected after positive reserve', () => {
    const f = layout(130, 38, authoredReserve);
    const neighbor = document.createElement('span');
    f.scope.append(neighbor);
    vi.spyOn(neighbor, 'getBoundingClientRect').mockReturnValue(rect(180, 48, 8, 38));
    expect(inspectCanvasBackdrop(f.subject, f.lease.current(), f.outset)).toMatchObject({
      valid: false,
      reason: 'source-overlapping-content',
    });
  });
  it('keeps the deliberate source-edge negative rejected after reserve', () => {
    const f = layout(130, 38, authoredReserve, true);
    expect(inspectCanvasBackdrop(f.subject, f.lease.current(), f.outset)).toMatchObject({
      valid: false,
      reason: 'source-bounds-unavailable',
    });
  });
});
