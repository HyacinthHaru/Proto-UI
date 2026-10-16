// @vitest-environment node
// Independent modeled controls. No production shader, browser or native GPU is executed.
import { describe, expect, it } from 'vitest';
import {
  createLiquidToggleDetailStimulus,
  evaluateLiquidToggleDetailPair,
  LIQUID_TOGGLE_DETAIL_POLICY,
  measureLiquidToggleRefractionDifference,
  type DetailImage,
  type DetailRgb8,
} from './liquid-toggle-detail-metrics';

const roi = { left: 16, top: 16, right: 112, bottom: 48 };
const white: DetailRgb8 = [255, 255, 255];
function map(
  image: DetailImage,
  operation: (rgb: DetailRgb8, x: number, y: number) => DetailRgb8
): DetailImage {
  const data = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const at = (y * image.width + x) * 4;
      data.set(
        [...operation([image.data[at], image.data[at + 1], image.data[at + 2]], x, y), 255],
        at
      );
    }
  return { width: image.width, height: image.height, data };
}
function positive(image: DetailImage) {
  return map(image, ([value]) => [12 + 0.4 * value, 24 + 0.6 * value, 54 + 0.8 * value]);
}
function pair(kind: 'checker' | 'bands' = 'checker') {
  return [
    createLiquidToggleDetailStimulus(kind),
    createLiquidToggleDetailStimulus(kind, true),
  ] as const;
}
function evaluate(
  references: readonly [DetailImage, DetailImage],
  outputs: readonly [DetailImage, DetailImage]
) {
  return evaluateLiquidToggleDetailPair({
    first: { reference: references[0], output: outputs[0] },
    reordered: { reference: references[1], output: outputs[1] },
    roi,
    foregroundSrgb8: white,
  });
}
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
function noise(image: DetailImage, seed: number, isoluminant = false) {
  const random = rng(seed);
  return map(image, () => {
    if (!isoluminant) return [random() * 100, random() * 100, random() * 100];
    const red = Math.round(random() * 128),
      blue = 96 + Math.round(random() * 64);
    // Hundreds of RGB triplets, constant code-value luma to rounding (<1 code).
    return [red, (60 - 0.2126 * red - 0.0722 * blue) / 0.7152, blue];
  });
}
function colorCount(image: DetailImage) {
  const colors = new Set<string>();
  for (let at = 0; at < image.data.length; at += 4)
    colors.add(`${image.data[at]},${image.data[at + 1]},${image.data[at + 2]}`);
  return colors.size;
}
function linear(code: number) {
  const n = code / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}
function srgb(n: number) {
  return 255 * (n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055);
}
// Intentionally independent of the production profile and its imports.
function attenuatedMapping(image: DetailImage) {
  const fill: DetailRgb8 = [0, 97, 204];
  return map(
    image,
    (rgb) =>
      fill.map((n, channel) =>
        srgb(linear(n) * (0.68 + (0.32 * rgb[channel]) / 255))
      ) as unknown as DetailRgb8
  );
}
function shiftAndBlur(image: DetailImage, offsetX: number) {
  return map(image, (_rgb, x, y) => {
    const result = [0, 0, 0];
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const sourceX = Math.max(0, Math.min(image.width - 1, x + dx + offsetX));
        const sourceY = Math.max(0, Math.min(image.height - 1, y + dy));
        const at = (sourceY * image.width + sourceX) * 4;
        for (let channel = 0; channel < 3; channel++)
          result[channel] += image.data[at + channel] / 25;
      }
    return result as unknown as DetailRgb8;
  });
}

describe('predeclared inner-content detail policy', () => {
  it('freezes engineering thresholds independently of renderer output', () => {
    expect(Object.isFrozen(LIQUID_TOGGLE_DETAIL_POLICY)).toBe(true);
    expect(LIQUID_TOGGLE_DETAIL_POLICY).toMatchObject({
      minimumLumaSpan: 8,
      minimumSpatialCorrelation: 0.7,
      minimumGradientCosine: 0.6,
      minimumDeltaRms: 4,
      minimumDeltaCorrelation: 0.7,
      changedCellLuma: 4,
      minimumChangedFraction: 0.25,
      minimumContrast: 4.5,
    });
  });

  it.each(['checker', 'bands'] as const)(
    'accepts a substantial independent source-response operator on %s',
    (kind) => {
      const references = pair(kind),
        outputs = references.map(positive) as [DetailImage, DetailImage];
      const histogram = (image: DetailImage) => Array.from(image.data).sort((a, b) => a - b);
      expect(histogram(references[0])).toEqual(histogram(references[1]));
      expect(references[0].data).not.toEqual(references[1].data);
      const result = evaluate(references, outputs);
      expect(result.failures).toEqual([]);
      expect(result.passed).toBe(true);
      expect(result.cellCount).toBe(192);
      expect(result.pair.deltaCorrelation).toBeGreaterThan(0.99);
      expect(
        result.frames.every(
          (frame) => frame.outputLumaSpan > 30 && frame.minimumForegroundContrast >= 4.5
        )
      ).toBe(true);
      expect(result.evidenceScope).toBe('pure-inner-content-engineering-diagnostic');
    }
  );

  it('accepts blurred/displaced signal only with a correctly registered reference', () => {
    const source = pair(),
      references = source.map((image) => shiftAndBlur(image, 16)) as [DetailImage, DetailImage];
    const outputs = references.map(positive) as [DetailImage, DetailImage];
    expect(evaluate(references, outputs).passed).toBe(true);
    expect(evaluate(source, outputs).passed).toBe(false);
  });

  it('rejects flat fill even when excluded border pixels provide many colors', () => {
    const references = pair();
    const outputs = references.map((image, index) => {
      const random = rng(19 + index);
      return map(image, (_rgb, x, y) =>
        x < roi.left || x >= roi.right || y < roi.top || y >= roi.bottom
          ? [random() * 255, random() * 255, random() * 255]
          : [0, 70, 130]
      );
    }) as [DetailImage, DetailImage];
    expect(colorCount(outputs[0])).toBeGreaterThan(20);
    const result = evaluate(references, outputs);
    expect(result.passed).toBe(false);
    expect(result.frames[0].outputLumaSpan).toBe(0);
    expect(result.failures).toContain('pair:insufficient-source-response');
  });

  it('rejects deterministic many-color noise despite nonzero image differences', () => {
    const references = pair(),
      outputs = references.map((image, i) => noise(image, 121 + i)) as [DetailImage, DetailImage];
    expect(colorCount(outputs[0])).toBeGreaterThan(1000);
    expect(outputs[0].data).not.toEqual(outputs[1].data);
    const result = evaluate(references, outputs);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('pair:unrelated-source-response');
    expect(result.frames[0].spatialCorrelation).toBeLessThan(0.7);
  });

  it('rejects equal-code-luma chromatic noise; many different colors are not evidence of source structure', () => {
    const references = pair(),
      outputs = references.map((image, i) => noise(image, 912 + i, true)) as [
        DetailImage,
        DetailImage,
      ];
    expect(colorCount(outputs[0])).toBeGreaterThan(1000);
    const result = evaluate(references, outputs);
    expect(result.passed).toBe(false);
    expect(result.frames[0].outputLumaSpan).toBeLessThan(1);
    expect(result.failures).toContain('pair:unrelated-source-response');
  });

  it('rejects a source-independent highlight with visible spatial variation', () => {
    const references = pair(),
      highlight = map(references[0], (_rgb, x) => [x / 2, x / 2, x / 2]);
    const result = evaluate(references, [highlight, highlight]);
    expect(result.frames[0].outputLumaSpan).toBeGreaterThan(8);
    expect(result.passed).toBe(false);
    expect(result.pair.outputDeltaRms).toBe(0);
    expect(result.failures).toContain('pair:insufficient-source-response');
  });

  it('rejects source-correlated one-code response even with perfect correlation', () => {
    const references = pair(),
      outputs = references.map((image) =>
        map(image, ([value]) => {
          const n = value === 80 ? 51 : 50;
          return [n, n, n];
        })
      ) as [DetailImage, DetailImage];
    const result = evaluate(references, outputs);
    expect(result.frames[0].spatialCorrelation).toBeCloseTo(1);
    expect(result.pair.deltaCorrelation).toBeCloseTo(1);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('frame-0:insufficient-detail-amplitude');
  });

  it.each(['checker', 'bands'] as const)(
    'rejects the 0.68+0.32 flattened envelope on dark %s for amplitude',
    (kind) => {
      const references = pair(kind),
        outputs = references.map(attenuatedMapping) as [DetailImage, DetailImage];
      const result = evaluate(references, outputs);
      expect(result.frames[0].spatialCorrelation).toBeGreaterThan(0.99);
      expect(result.frames[0].minimumForegroundContrast).toBeGreaterThanOrEqual(4.5);
      expect(result.frames[0].outputLumaSpan).toBeLessThan(8);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('frame-0:insufficient-detail-amplitude');
    }
  );

  it('rejects stale output after an equal-histogram source reorder', () => {
    const references = pair(),
      first = positive(references[0]);
    const result = evaluate(references, [first, first]);
    expect(result.frames[0].outputLumaSpan).toBeGreaterThan(8);
    expect(result.frames[0].spatialCorrelation).toBeGreaterThan(0.99);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('pair:unrelated-source-response');
  });

  it('keeps the 4.5 guard separate from visible and correlated source response', () => {
    const references = pair(),
      outputs = references.map((image) => map(image, ([n]) => [170 + n, 170 + n, 170 + n])) as [
        DetailImage,
        DetailImage,
      ];
    const result = evaluate(references, outputs);
    expect(result.frames[0].outputLumaSpan).toBeGreaterThan(8);
    expect(result.pair.deltaCorrelation).toBeGreaterThan(0.99);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('frame-0:foreground-contrast');
  });

  it('checks native pixel contrast and alpha rather than hiding bad pixels in averages', () => {
    const references = pair(),
      outputs = references.map(positive) as [DetailImage, DetailImage];
    const at = (20 * outputs[0].width + 20) * 4;
    (outputs[0].data as Uint8ClampedArray).set([255, 255, 255, 255], at);
    let result = evaluate(references, outputs);
    expect(result.frames[0].minimumForegroundContrast).toBe(1);
    expect(result.failures).toContain('frame-0:foreground-contrast');
    (outputs[0].data as Uint8ClampedArray).set([0, 50, 100, 254], at);
    result = evaluate(references, outputs);
    expect(result.failures).toContain('frame-0:nonopaque-roi');
  });

  it('reports identical zero-refraction output as zero and an owned displacement as distinct', () => {
    const source = createLiquidToggleDetailStimulus('bands'),
      zero = positive(source);
    expect(measureLiquidToggleRefractionDifference(zero, zero, roi)).toEqual({
      fullyOpaque: true,
      lumaRms: 0,
      meanAbsoluteLumaDifference: 0,
      changedCellFractionAtOneCode: 0,
    });
    const shifted = positive(shiftAndBlur(source, 4));
    const result = measureLiquidToggleRefractionDifference(shifted, zero, roi);
    expect(result.lumaRms).toBeGreaterThan(4);
    expect(result.changedCellFractionAtOneCode).toBeGreaterThan(0.25);
  });

  it('rejects malformed data, mismatched geometry, partial cells and undersized ROI', () => {
    const references = pair(),
      outputs = references.map(positive) as [DetailImage, DetailImage];
    const input = {
      first: { reference: references[0], output: outputs[0] },
      reordered: { reference: references[1], output: outputs[1] },
      roi,
      foregroundSrgb8: white,
    };
    expect(() => evaluateLiquidToggleDetailPair({ ...input, roi: { ...roi, right: 111 } })).toThrow(
      'whole cells'
    );
    expect(() =>
      evaluateLiquidToggleDetailPair({
        ...input,
        roi: { left: 16, top: 16, right: 20, bottom: 20 },
      })
    ).toThrow('too few cells');
    expect(() =>
      evaluateLiquidToggleDetailPair({
        ...input,
        first: { ...input.first, output: { ...outputs[0], width: 64 } },
      })
    ).toThrow('registered');
    expect(() =>
      evaluateLiquidToggleDetailPair({ ...input, foregroundSrgb8: [NaN, 0, 0] })
    ).toThrow('foreground');
    const bad = { ...outputs[0], data: Array.from(outputs[0].data) };
    bad.data[(20 * bad.width + 20) * 4] = NaN;
    expect(() =>
      evaluateLiquidToggleDetailPair({ ...input, first: { reference: references[0], output: bad } })
    ).toThrow('invalid channel');
  });
});
