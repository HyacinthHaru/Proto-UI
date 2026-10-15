// Orchestration model only. These images are synthetic; no GPU/browser acceptance.
import { webcrypto } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import type { OpticalFrame } from '../../../../../../packages/adapters/base/src/material/program';
import { runLiquidToggleDetailProbe } from './liquid-toggle-detail-probe';

const controls = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('../../../../../../packages/adapters/base/src/material/program', () => ({
  createWebOpticalProgram: controls.create,
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  controls.create.mockReset();
});

function fixture(rejectControl?: 'neutral' | 'zeroRefraction') {
  const images = new Map<string, { width: number; height: number; data: Uint8ClampedArray }>();
  let nextUri = 0,
    injected = false;
  const owners: { render: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
  controls.create.mockImplementation((_canvas: HTMLCanvasElement, diagnostic: string | null) => {
    const ownerIndex = owners.length;
    const render = vi.fn((frame: OpticalFrame) => {
      if (
        !injected &&
        ((rejectControl === 'neutral' && ownerIndex === 0) ||
          (rejectControl === 'zeroRefraction' && diagnostic === 'zero-refraction'))
      ) {
        injected = true;
        throw new Error('modeled-rendered-contrast-unsafe');
      }
      const outset = frame.geometry.paintOutset ?? 0;
      const width = 160 + 2 * outset,
        height = 48 + 2 * outset;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const sx = Math.min(159, Math.max(0, x - outset));
          const sy = Math.min(47, Math.max(0, y - outset));
          const n = frame.source.pixels[(sy * 160 + sx) * 4];
          data.set(
            frame.tint ? [12 + 0.4 * n, 24 + 0.6 * n, 54 + 0.8 * n, 255] : [n, n, n, 255],
            (y * width + x) * 4
          );
        }
      const uri = `data:image/png;base64,modeled-${++nextUri}`;
      images.set(uri, { width, height, data });
      return uri;
    });
    const dispose = vi.fn();
    owners.push({ render, dispose });
    return {
      render,
      dispose,
      inspect: () => ({ renders: render.mock.calls.length, modeled: true }),
    };
  });
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal(
    'ImageData',
    class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number
      ) {}
    }
  );
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      get width() {
        return images.get(this.src)!.width;
      }
      get height() {
        return images.get(this.src)!.height;
      }
      async decode() {
        if (!images.has(this.src)) throw new Error('Unknown modeled URI');
      }
    }
  );
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        public width: number,
        public height: number
      ) {}
      getContext() {
        let source = '';
        return {
          drawImage: (image: { src: string }) => {
            source = image.src;
          },
          getImageData: () => images.get(source),
        };
      }
    }
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        putImageData: vi.fn(),
        VENDOR: 1,
        RENDERER: 2,
        VERSION: 3,
        SHADING_LANGUAGE_VERSION: 4,
        getParameter: () => 'modeled-not-GPU',
      }) as never
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,modeled-source'
  );
  const host = document.createElement('div');
  host.scrollIntoView = vi.fn();
  document.body.append(host);
  return { host, owners };
}

it('keeps all 32 captures/16 pairs, fixed geometry and three separate owners without executing GPU code', async () => {
  const { host, owners } = fixture();
  const result = await runLiquidToggleDetailProbe(host);
  expect(controls.create).toHaveBeenCalledTimes(3);
  expect(controls.create.mock.calls.map(([, diagnostic]) => diagnostic)).toEqual([
    null,
    null,
    'zero-refraction',
  ]);
  expect(result.records).toHaveLength(32);
  expect(result.pairs).toHaveLength(16);
  expect(result.renderAttempts).toBe(96);
  expect(result.passed).toBe(true);
  expect(result.records.every((record) => record.sourceUnchanged && record.frameUnchanged)).toBe(
    true
  );
  expect(
    result.records.every(
      (record) => record.expectedSourceMinimumContrast > 8 && record.fallbackContrast >= 4.5
    )
  ).toBe(true);
  expect(
    result.records
      .filter((record) => record.phase === 'static')
      .every((record) => JSON.stringify(record.pixelRoi) === JSON.stringify(record.hostRoi))
  ).toBe(true);
  expect(result.records.find((record) => record.phase === 'pressed')!.pixelRoi).toEqual({
    left: 38,
    top: 26,
    right: 150,
    bottom: 50,
  });
  expect(
    result.pairs.every(
      (pair) => pair.sameSourceHistogram && pair.distinctSourcePixels && pair.status === 'measured'
    )
  ).toBe(true);
  expect(result.pairs.every((pair) => pair.result?.cellCount === 168)).toBe(true);
  // Identical modeled zero-refraction output cannot become a claim of optics.
  expect(result.records.every((record) => record.zeroRefractionDifference?.lumaRms === 0)).toBe(
    true
  );
  expect(result.scope).toContain('not provider/runtime/native acceptance');
  expect(
    owners.every(
      (owner) => owner.render.mock.calls.length === 32 && owner.dispose.mock.calls.length === 1
    )
  ).toBe(true);
});

it.each(['neutral', 'zeroRefraction'] as const)(
  'retains a %s rejection, blocks its pair and continues every remaining attempt',
  async (rejected) => {
    const { host, owners } = fixture(rejected);
    const result = await runLiquidToggleDetailProbe(host);
    expect(result.records).toHaveLength(32);
    expect(result.pairs).toHaveLength(16);
    expect(result.renderAttempts).toBe(96);
    expect(result.passed).toBe(false);
    expect(result.records[0].controls[rejected]).toEqual({
      status: 'rejected',
      stage: 'render',
      reason: 'modeled-rendered-contrast-unsafe',
    });
    const blocked = result.pairs.filter((pair) => pair.status === 'blocked');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].blockers).toContain(
      `source-1:${rejected}:render:modeled-rendered-contrast-unsafe`
    );
    expect(blocked[0].result === null).toBe(rejected === 'neutral');
    expect(
      owners.every(
        (owner) => owner.render.mock.calls.length === 32 && owner.dispose.mock.calls.length === 1
      )
    ).toBe(true);
  }
);
