import { describe, expect, it } from 'vitest';
import {
  styleTintFragment,
  styleTintContactFragment,
  styleTintLightForeground,
  styleTintEnvelope,
  styleTintProfile,
  styleTintContactProfile,
} from '../src/material/style-tint-profile';
import { fragment } from '../src/material/liquidgl-kernel.generated';
import { contactFragment } from '../src/material/contact-profile';
import { colorContrast, type OpaqueRgba } from '../src/material/style';
import {
  createLiquidToggleDetailStimulus,
  evaluateLiquidToggleDetailPair,
  type DetailImage,
} from '../../../../apps/www/src/content/docs/zh-cn/liquid-toggle-detail-metrics';

// Independent numeric oracle for the finite shader contract; these tests prove
// numerical bounds, not GPU execution or exact native shader output.
const linear = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const srgb = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
function oracle(
  fill: OpaqueRgba,
  foreground: OpaqueRgba,
  sample: number[],
  old = false
): OpaqueRgba {
  const envelope = styleTintEnvelope(fill, foreground);
  const light = envelope.lightForeground;
  const weights = [0.2126, 0.7152, 0.0722];
  const dot = (rgb: number[]) => rgb.reduce((sum, c, i) => sum + c * weights[i], 0);
  const detail = sample.map((x) => Math.max(0, Math.min(1, x)));
  const base = fill.slice(0, 3).map(linear);
  const hue = base.map((c, i) => 0.75 * c + 0.25 * linear(detail[i]));
  const direction = light ? hue : hue.map((c) => 1 - c);
  const boundCode = srgb(envelope.luminanceBound);
  const targetCode = light ? boundCode * dot(detail) : boundCode + (1 - boundCode) * dot(detail);
  // Retain the exact profile-2 map as a same-input historical control.
  const target = old
    ? light
      ? dot(base) * dot(detail)
      : (1 - dot(base)) * (1 - dot(detail))
    : light
      ? linear(targetCode)
      : 1 - linear(targetCode);
  const ratio = target / Math.max(dot(direction), 0.000244140625);
  const output = direction.map((c) =>
    srgb(Math.max(0, Math.min(1, light ? c * ratio : 1 - c * ratio)))
  );
  return [output[0], output[1], output[2], 1];
}
const pairs: readonly (readonly [OpaqueRgba, OpaqueRgba])[] = [
  [
    [0, 97 / 255, 204 / 255, 1],
    [1, 1, 1, 1],
  ],
  [
    [10 / 255, 108 / 255, 219 / 255, 1],
    [1, 1, 1, 1],
  ],
  [
    [0.85, 0.7, 0.95, 1],
    [0.05, 0.05, 0.05, 1],
  ],
  [
    [0.08, 0.12, 0.18, 1],
    [0.75, 0.8, 0.85, 1],
  ],
];
describe('bounded style-fill profile: independent numeric oracle, no GPU claim', () => {
  it.each(pairs)(
    'retains the reserved foreground bound while allowing source chroma and saturated highlights',
    (fill, foreground) => {
      const {
        lightForeground: light,
        luminanceBound,
        worstForeground,
      } = styleTintEnvelope(fill, foreground);
      let count = 0;
      for (let n = 0; n <= 255; n++)
        for (const sample of [
          [n / 255, n / 255, n / 255],
          [n / 255, 1 - n / 255, 0.4],
          [2, 2, 2],
          [-1, -1, -1],
        ]) {
          const output = oracle(fill, foreground, sample);
          count++;
          expect(output.every(Number.isFinite)).toBe(true);
          expect(output.every((x) => x >= 0 && x <= 1 + 1e-12)).toBe(true);
          expect(colorContrast(output, worstForeground)).toBeGreaterThanOrEqual(4.5);
          // Unlike the retired narrow-band profile, channels may cross the
          // fill independently; the foreground safety bound is luminance.
          const lum = (color: OpaqueRgba) =>
            color
              .slice(0, 3)
              .reduce((sum, c, i) => sum + linear(c) * [0.2126, 0.7152, 0.0722][i], 0);
          if (light) expect(lum(output)).toBeLessThanOrEqual(luminanceBound + 1e-12);
          else expect(lum(output)).toBeGreaterThanOrEqual(luminanceBound - 1e-12);
        }
      expect(count).toBeGreaterThan(0);
      expect(oracle(fill, foreground, [0, 0, 0])).not.toEqual(oracle(fill, foreground, [1, 1, 1]));
    }
  );
  it('retains source chroma that an equal-luminance scalar would erase at 8-bit output', () => {
    const fill = pairs[1][0];
    const neutral = [0.2, 0.2, 0.2];
    const chromatic = [
      0.2,
      srgb((linear(0.2) * (0.7152 + 0.0722) - linear(0.35) * 0.0722) / 0.7152),
      0.35,
    ];
    const lum = (rgb: number[]) =>
      rgb.reduce((sum, c, i) => sum + linear(c) * [0.2126, 0.7152, 0.0722][i], 0);
    expect(lum(chromatic)).toBeCloseTo(lum(neutral), 12);
    const quantized = (rgb: number[]) =>
      oracle(fill, pairs[1][1], rgb)
        .slice(0, 3)
        .map((c) => Math.round(c * 255));
    expect(quantized(chromatic)).not.toEqual(quantized(neutral));
    // The retired scalar loses this actual source distinction entirely.
    const legacy = (rgb: number[]) =>
      fill.slice(0, 3).map((c) => Math.round(srgb(linear(c) * (0.68 + 0.32 * lum(rgb))) * 255));
    expect(legacy(chromatic)).toEqual(legacy(neutral));
  });
  it('retains chroma independently of the new perceptual code-luma tone', () => {
    const gray = [0.2, 0.2, 0.2];
    const chroma = [0.2, (0.2 * (0.7152 + 0.0722) - 0.8 * 0.0722) / 0.7152, 0.8];
    const codeLuma = (rgb: number[]) =>
      rgb.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    expect(codeLuma(chroma)).toBeCloseTo(codeLuma(gray), 12);
    for (const [fill, foreground] of pairs.slice(0, 2)) {
      const a = oracle(fill, foreground, gray),
        b = oracle(fill, foreground, chroma);
      const quantized = (rgb: OpaqueRgba) => rgb.slice(0, 3).map((c) => Math.round(c * 255));
      expect(quantized(a)).not.toEqual(quantized(b));
      expect(colorContrast(a, foreground)).toBeCloseTo(colorContrast(b, foreground), 10);
    }
  });
  it('keeps pure red backdrop changes visible even when the accent red channel is zero', () => {
    const fill = pairs[0][0];
    const a = oracle(fill, pairs[0][1], [0.1, 0.2, 0.3]);
    const b = oracle(fill, pairs[0][1], [0.8, 0.2, 0.3]);
    expect(a[0]).toBeGreaterThan(0);
    expect(b[0]).toBeGreaterThan(a[0]);
    expect(colorContrast(a, pairs[0][1])).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(b, pairs[0][1])).toBeGreaterThanOrEqual(4.5);
  });
  it('explicitly changes collapsed black/white envelopes while keeping zero denominators finite', () => {
    const black: OpaqueRgba = [0, 0, 0, 1];
    const white: OpaqueRgba = [1, 1, 1, 1];
    for (const [fill, foreground] of [
      [black, white],
      [white, black],
    ]) {
      const outputs = [
        [0, 0, 0],
        [0.4, 0.6, 0.8],
        [1, 1, 1],
      ].map((sample) => oracle(fill, foreground, sample));
      expect(outputs.flat().every(Number.isFinite)).toBe(true);
      expect(outputs[0]).not.toEqual(outputs[2]);
      const old = oracle(fill, foreground, [0.4, 0.6, 0.8], true);
      old.forEach((channel, i) => expect(channel).toBeCloseTo(fill[i], 12));
    }
  });
  it.each(['checker', 'bands'] as const)(
    'maps authored %s stimuli above the independently frozen inner-detail engineering floor',
    (kind) => {
      const first = createLiquidToggleDetailStimulus(kind);
      const reordered = createLiquidToggleDetailStimulus(kind, true);
      for (const [fill, foreground] of pairs.slice(0, 2)) {
        const map = (image: DetailImage): DetailImage => {
          const data = new Uint8ClampedArray(image.data.length);
          for (let at = 0; at < data.length; at += 4) {
            const color = oracle(
              fill,
              foreground,
              [image.data[at], image.data[at + 1], image.data[at + 2]].map((c) => c / 255)
            );
            data.set(
              color.map((c) => Math.round(c * 255)),
              at
            );
          }
          return { width: image.width, height: image.height, data };
        };
        const report = evaluateLiquidToggleDetailPair({
          first: { reference: first, output: map(first) },
          reordered: { reference: reordered, output: map(reordered) },
          roi: { left: 16, top: 16, right: 112, bottom: 48 },
          foregroundSrgb8: [foreground[0] * 255, foreground[1] * 255, foreground[2] * 255],
        });
        expect(report.failures).toEqual([]);
        expect(report.passed).toBe(true);
        // This is only the numeric map stage, not blur/refraction/committed GPU paint.
        expect(report.evidenceScope).toBe('pure-inner-content-engineering-diagnostic');
      }
    }
  );
  it('refuses unreadable or nonopaque palette pairs before selecting a profile', () => {
    for (const [fill, fg] of [
      [
        [1, 1, 1, 1],
        [0.9, 0.9, 0.9, 1],
      ],
      [
        [0, 0, 0, 0.5],
        [1, 1, 1, 1],
      ],
      [
        [NaN, 0, 0, 1],
        [1, 1, 1, 1],
      ],
    ] as const)
      expect(() => styleTintLightForeground(fill as unknown as OpaqueRgba, fg)).toThrow(
        'invalid-style-tint-palette'
      );
  });
  it('maps all lighting before contrast bounding and preserves the source refraction code', () => {
    for (const profile of [styleTintFragment, styleTintContactFragment]) {
      expect(profile.indexOf('vec3 styleTintDetail')).toBeGreaterThan(
        profile.indexOf('if (u_specular)')
      );
      expect(profile.indexOf('vec3 styleTintDetail')).toBeLessThan(
        profile.lastIndexOf('if (u_revealType == 1)')
      );
      expect(profile).toContain('refracted = mapped + offset - tiltOffset');
      expect(profile).not.toContain('0.68 + 0.32 * styleTintDetail');
      expect(profile).toContain('uniform float u_styleTintLuminanceBound;');
      expect(profile).toContain('styleTintBoundCode * styleTintTone');
      expect(profile).toContain('styleTintLinear(vec3(styleTintTargetCode)).r');
      expect(profile).not.toContain('styleTintBaseLuma');
      expect(profile).toContain('0.000244140625');
      expect(profile).toContain('styleTintLinear(styleTintDetail), 0.25');
      expect(profile).toContain('vec3 styleTintDetail = clamp(final.rgb, 0.0, 1.0)');
      expect(profile).not.toContain('clamp(dot(styleTintLinear');
      expect(profile).not.toContain(
        'final.rgb = mix(final.rgb, final.rgb * u_tint.rgb, u_tint.a);'
      );
      expect(profile).not.toContain('smoothstep(0.4,0.0');
    }
    for (const neutral of [fragment, contactFragment])
      expect(neutral).not.toContain('styleTintDetail');
  });
});

const frozenPairs = [
  ...pairs,
  [
    [0, 0, 0, 1],
    [1, 1, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [0, 0, 0, 1],
  ],
] as readonly (readonly [OpaqueRgba, OpaqueRgba])[];
const frozenGrids = [
  [16, 48, 80],
  [96, 128, 160],
  [176, 208, 240],
  [192, 208, 224],
  [224, 239, 254],
];
const frozenLevels = [0, 32, 64, 96, 128, 160, 192, 224, 255];
function raster(colors: readonly number[][], columns = 9): DetailImage {
  return {
    width: columns * 4,
    height: (colors.length / columns) * 4,
    data: Uint8Array.from(
      Array.from({ length: colors.length * 16 }, (_, pixel) => {
        const x = pixel % (columns * 4),
          y = Math.floor(pixel / (columns * 4));
        return [
          ...colors[Math.floor(y / 4) * columns + Math.floor(x / 4)].map((c) =>
            Math.round(c * 255)
          ),
          255,
        ];
      }).flat()
    ),
  };
}
function evaluate(
  sources: number[][][],
  outputs: number[][][],
  foreground: OpaqueRgba,
  columns = 9
) {
  const reference = sources.map((s) => raster(s, columns)),
    output = outputs.map((s) => raster(s, columns));
  return evaluateLiquidToggleDetailPair({
    first: { reference: reference[0], output: output[0] },
    reordered: { reference: reference[1], output: output[1] },
    roi: { left: 0, top: 0, right: reference[0].width, bottom: reference[0].height },
    foregroundSrgb8: [foreground[0] * 255, foreground[1] * 255, foreground[2] * 255],
  });
}
function outputs(sources: number[][][], fill: OpaqueRgba, foreground: OpaqueRgba, old = false) {
  return sources.map((image) =>
    image.map((sample) => oracle(fill, foreground, sample, old).slice(0, 3))
  );
}

describe('profile 4 frozen foreground envelope (arithmetic, not GPU acceptance)', () => {
  it('uses a distinct identity and rounds every independently frozen endpoint inward to float32', () => {
    expect(styleTintProfile).toBe('pui-regular-style-tint-4');
    expect(styleTintContactProfile).toBe('pui-regular-style-tint-contact-4');
    // Fixed independent 32-step solver results, before uniform conversion.
    const expected = [
      0.15342621431014267, 0.15342621431014267, 0.2626990541705438, 0.07198668649802203,
      0.15342621431014267, 0.24456064436506586,
    ];
    frozenPairs.forEach(([fill, foreground], index) => {
      const envelope = styleTintEnvelope(fill, foreground),
        bound = envelope.luminanceBound;
      expect(Math.fround(bound)).toBe(bound);
      expect(Math.abs(bound - expected[index])).toBeLessThan(3e-8);
      if (envelope.lightForeground) expect(bound).toBeLessThanOrEqual(expected[index]);
      else expect(bound).toBeGreaterThanOrEqual(expected[index]);
      expect(envelope.worstForeground).toEqual([
        ...foreground
          .slice(0, 3)
          .map((c) =>
            Math.max(0, Math.min(1, c + ((envelope.lightForeground ? -1 : 1) * 1.5) / 255))
          ),
        1,
      ]);
    });
  });
  it('refuses empty budgets even when the original nominal pair passes admission', () => {
    const gray: OpaqueRgba = [0.46, 0.46, 0.46, 1];
    for (const fill of [
      [0, 0, 0, 1],
      [1, 1, 1, 1],
    ] as const) {
      expect(colorContrast(fill, gray)).toBeGreaterThanOrEqual(4.5);
      expect(() => styleTintEnvelope(fill, gray)).toThrow('style-tint-empty-budget');
    }
  });
  it.each(['original30', 'holdout504'] as const)(
    'retains every old pass on frozen %s inputs',
    (kind) => {
      const grids =
        kind === 'original30'
          ? frozenGrids
          : frozenLevels.flatMap((a, i) =>
              frozenLevels
                .slice(i + 1)
                .flatMap((b, j) => frozenLevels.slice(i + j + 2).map((c) => [a, b, c]))
            );
      let oldPass = 0,
        nextPass = 0,
        oldPassLoss = 0,
        collapsedGains = 0;
      frozenPairs.forEach(([fill, foreground], palette) => {
        for (const grid of grids) {
          const first = grid.flatMap((r) =>
            grid.flatMap((g) => grid.map((b) => [r / 255, g / 255, b / 255]))
          );
          const sources = [first, first.map((_, i) => first[(10 * i + 7) % 27])];
          const old = evaluate(sources, outputs(sources, fill, foreground, true), foreground);
          const next = evaluate(sources, outputs(sources, fill, foreground), foreground);
          oldPass += Number(old.passed);
          nextPass += Number(next.passed);
          oldPassLoss += Number(old.passed && !next.passed);
          collapsedGains += Number(palette >= 4 && !old.passed && next.passed);
          // The current host result is quantized before the unchanged evaluator.
          for (const image of outputs(sources, fill, foreground))
            for (const rgb of image) {
              const quantized: OpaqueRgba = [
                Math.round(rgb[0] * 255) / 255,
                Math.round(rgb[1] * 255) / 255,
                Math.round(rgb[2] * 255) / 255,
                1,
              ];
              expect(
                colorContrast(quantized, styleTintEnvelope(fill, foreground).worstForeground)
              ).toBeGreaterThanOrEqual(4.5);
            }
          if (kind === 'original30' && palette === 3 && grid[0] === 224) {
            expect(old.passed).toBe(false);
            expect(next.passed).toBe(false);
            expect(old.frames[0].outputLumaSpan).toBeCloseTo(1.83272, 5);
            expect(old.pair.outputDeltaRms).toBeCloseTo(1.00211, 5);
            expect(next.frames[0].outputLumaSpan).toBeCloseTo(7.17568, 5);
            expect(next.pair.outputDeltaRms).toBeCloseTo(3.91628772181003, 10);
            expect(next.failures).toContain('frame-0:insufficient-detail-amplitude');
            expect(next.failures).toContain('pair:insufficient-source-response');
          }
        }
      });
      expect(oldPassLoss).toBe(0);
      expect([oldPass, nextPass]).toEqual(kind === 'original30' ? [10, 29] : [326, 504]);
      if (kind === 'holdout504') expect(collapsedGains).toBe(168);
    }
  );
  it('retains all twelve 16/80 Toggle controls and rejects full-amplitude unrelated noise', () => {
    let pass = 0,
      rejected = 0;
    for (const [fill, foreground] of frozenPairs)
      for (const checker of [true, false]) {
        const first = Array.from({ length: 192 }, (_, i) => {
          const x = i % 24,
            y = Math.floor(i / 24);
          const high =
            (checker ? Math.floor(x / 4) + Math.floor(y / 4) : 1 + Math.floor(x / 4)) % 2;
          return Array(3).fill((high ? 80 : 16) / 255);
        });
        const sources = [first, first.map((rgb) => rgb.map((c) => 96 / 255 - c))];
        expect(evaluate(sources, outputs(sources, fill, foreground), foreground, 24).passed).toBe(
          true
        );
        pass++;
        const noise = [121, 122].map((seed) => {
          let state = seed;
          const take = () => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return (state >>> 0) / 2 ** 32;
          };
          return Array.from({ length: 192 }, () => {
            const u = take();
            return u < 1 / 8 ? [0, 0, 0] : u > 7 / 8 ? [1, 1, 1] : [take(), take(), take()];
          });
        });
        const report = evaluate(sources, outputs(noise, fill, foreground), foreground, 24);
        expect(report.passed).toBe(false);
        rejected++;
        for (const frame of report.frames) {
          expect(frame.outputLumaSpan).toBeGreaterThanOrEqual(8);
          expect(frame.minimumForegroundContrast).toBeGreaterThanOrEqual(4.5);
        }
        expect(report.pair.outputDeltaRms).toBeGreaterThanOrEqual(4);
        expect(report.pair.changedCellFraction).toBeGreaterThanOrEqual(0.25);
        expect(report.failures.some((f) => f.includes('unrelated'))).toBe(true);
      }
    expect([pass, rejected]).toEqual([12, 12]);
  });
});
