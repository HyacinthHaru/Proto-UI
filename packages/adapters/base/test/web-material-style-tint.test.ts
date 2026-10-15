import { describe, expect, it } from 'vitest';
import {
  styleTintFragment,
  styleTintContactFragment,
  styleTintLightForeground,
} from '../src/material/style-tint-profile';
import { fragment } from '../src/material/liquidgl-kernel.generated';
import { contactFragment } from '../src/material/contact-profile';
import { colorContrast, type OpaqueRgba } from '../src/material/style';

// Independent numeric oracle for the finite shader contract; these tests prove
// numerical bounds, not GPU execution or exact native shader output.
const linear = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const srgb = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
function oracle(fill: OpaqueRgba, light: boolean, sample: number[]): OpaqueRgba {
  const detail = sample.map((x) => Math.max(0, Math.min(1, x)));
  const output = fill
    .slice(0, 3)
    .map((x, i) =>
      srgb(
        light
          ? linear(x) * (0.68 + 0.32 * detail[i])
          : linear(x) + (1 - linear(x)) * 0.32 * detail[i]
      )
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
    'never crosses the fallback luminance bound, including saturated highlights',
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
          for (let channel = 0; channel < 3; channel++)
            if (light) expect(output[channel]).toBeLessThanOrEqual(fill[channel] + 1e-12);
            else expect(output[channel]).toBeGreaterThanOrEqual(fill[channel] - 1e-12);
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
      oracle(fill, true, [lum(rgb), lum(rgb), lum(rgb)])
        .slice(0, 3)
        .map((c) => Math.round(c * 255));
    expect(legacy(chromatic)).toEqual(legacy(neutral));
  });
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
      expect(profile).toContain('0.68 + 0.32 * styleTintDetail');
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
