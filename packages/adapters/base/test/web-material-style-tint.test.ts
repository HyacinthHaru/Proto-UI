import { describe, expect, it } from 'vitest';
import {
  styleTintFragment,
  styleTintContactFragment,
  styleTintLightForeground,
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
function oracle(fill: OpaqueRgba, light: boolean, sample: number[]): OpaqueRgba {
  const weights = [0.2126, 0.7152, 0.0722];
  const dot = (rgb: number[]) => rgb.reduce((sum, c, i) => sum + c * weights[i], 0);
  const detail = sample.map((x) => Math.max(0, Math.min(1, x)));
  const base = fill.slice(0, 3).map(linear);
  const hue = base.map((c, i) => 0.75 * c + 0.25 * linear(detail[i]));
  const direction = light ? hue : hue.map((c) => 1 - c);
  const target = light ? dot(base) * dot(detail) : (1 - dot(base)) * (1 - dot(detail));
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
    'retains the fallback luminance bound while allowing source chroma, including saturated highlights',
    (fill, foreground) => {
      const light = styleTintLightForeground(fill, foreground),
        baseline = colorContrast(fill, foreground);
      let count = 0;
      for (let n = 0; n <= 255; n++)
        for (const sample of [
          [n / 255, n / 255, n / 255],
          [n / 255, 1 - n / 255, 0.4],
          [2, 2, 2],
          [-1, -1, -1],
        ]) {
          const output = oracle(fill, light, sample);
          count++;
          expect(output.every(Number.isFinite)).toBe(true);
          expect(output.every((x) => x >= 0 && x <= 1 + 1e-12)).toBe(true);
          expect(colorContrast(output, foreground)).toBeGreaterThanOrEqual(baseline - 1e-9);
          // Unlike the retired narrow-band profile, channels may cross the
          // fill independently; the foreground safety bound is luminance.
          const lum = (color: OpaqueRgba) =>
            color
              .slice(0, 3)
              .reduce((sum, c, i) => sum + linear(c) * [0.2126, 0.7152, 0.0722][i], 0);
          if (light) expect(lum(output)).toBeLessThanOrEqual(lum(fill) + 1e-12);
          else expect(lum(output)).toBeGreaterThanOrEqual(lum(fill) - 1e-12);
        }
      expect(count).toBeGreaterThan(0);
      expect(oracle(fill, light, [0, 0, 0])).not.toEqual(oracle(fill, light, [1, 1, 1]));
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
      oracle(fill, true, rgb)
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
      const a = oracle(fill, true, gray),
        b = oracle(fill, true, chroma);
      const quantized = (rgb: OpaqueRgba) => rgb.slice(0, 3).map((c) => Math.round(c * 255));
      expect(quantized(a)).not.toEqual(quantized(b));
      expect(colorContrast(a, foreground)).toBeCloseTo(colorContrast(b, foreground), 10);
    }
  });
  it('keeps pure red backdrop changes visible even when the accent red channel is zero', () => {
    const fill = pairs[0][0];
    const a = oracle(fill, true, [0.1, 0.2, 0.3]);
    const b = oracle(fill, true, [0.8, 0.2, 0.3]);
    expect(a[0]).toBeGreaterThan(0);
    expect(b[0]).toBeGreaterThan(a[0]);
    expect(colorContrast(a, pairs[0][1])).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(b, pairs[0][1])).toBeGreaterThanOrEqual(4.5);
  });
  it('handles zero chromatic denominators without inventing detail for extreme safe-side palettes', () => {
    const black: OpaqueRgba = [0, 0, 0, 1];
    const white: OpaqueRgba = [1, 1, 1, 1];
    for (const sample of [
      [0, 0, 0],
      [0.4, 0.6, 0.8],
      [1, 1, 1],
    ]) {
      expect(oracle(black, true, sample)).toEqual(black);
      for (const channel of oracle(white, false, sample)) expect(channel).toBeCloseTo(1, 12);
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
              true,
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
      expect(profile).toContain('styleTintBaseLuma * styleTintTone');
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
