import { contactFragment } from './contact-profile';
import { fragment } from './liquidgl-kernel.generated';
import { colorContrast, opaqueRgba, type OpaqueRgba } from './style';

/** First-party, opt-in regular style-fill profile. No Apple equivalence or
 * author parameters. Refraction and contact still sample the admitted source;
 * the complete light contribution is mapped inside the fallback contrast bound.
 * The original neutral shaders remain byte-for-byte unchanged. */
export const styleTintProfile = 'pui-regular-style-tint-2';
export const styleTintContactProfile = 'pui-regular-style-tint-contact-2';

function luminance(value: OpaqueRgba) {
  const linear = value
    .slice(0, 3)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function styleTintLightForeground(fill: OpaqueRgba, foreground: OpaqueRgba): boolean {
  if (!opaqueRgba(fill) || !opaqueRgba(foreground) || colorContrast(fill, foreground) < 4.5)
    throw new Error('invalid-style-tint-palette');
  return luminance(foreground) > luminance(fill);
}

const helpers = `
        uniform float u_styleTintLightForeground;
        vec3 styleTintLinear(vec3 value) {
          return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)),
                     step(vec3(0.04045), value));
        }
        vec3 styleTintSrgb(vec3 value) {
          return mix(value * 12.92, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055,
                     step(vec3(0.0031308), value));
        }
`;
const mapping = `
          // Retain the admitted optical source's spatial tone and chroma.
          // The safe bound is luminance, not a narrow per-channel solid-fill band.
          vec3 styleTintDetail = clamp(final.rgb, 0.0, 1.0);
          vec3 styleTintBase = styleTintLinear(u_tint.rgb);
          vec3 styleTintWeights = vec3(0.2126, 0.7152, 0.0722);
          float styleTintTone = dot(styleTintDetail, styleTintWeights);
          vec3 styleTintHue = mix(styleTintBase, styleTintLinear(styleTintDetail), 0.25);
          float styleTintBaseLuma = dot(styleTintBase, styleTintWeights);
          // 2^-12 remains normal at the inherited minimum mediump precision.
          // Both branches must stay finite, including black/white endpoints.
          vec3 styleTintDark = styleTintHue *
            (styleTintBaseLuma * styleTintTone /
             max(dot(styleTintHue, styleTintWeights), 0.000244140625));
          vec3 styleTintComplement = vec3(1.0) - styleTintHue;
          vec3 styleTintLight = vec3(1.0) - styleTintComplement *
            ((1.0 - styleTintBaseLuma) * (1.0 - styleTintTone) /
             max(dot(styleTintComplement, styleTintWeights), 0.000244140625));
          // Gamut clipping only moves farther onto the original safe side:
          // down in luminance for light text, up for dark text. Readback guards
          // still reject any finite-precision or near-opaque contrast failure.
          final.rgb = styleTintSrgb(clamp(mix(styleTintLight, styleTintDark,
                                             u_styleTintLightForeground), 0.0, 1.0));

`;
function derive(source: string): string {
  const tint = '          final.rgb = mix(final.rgb, final.rgb * u_tint.rgb, u_tint.a);';
  const reveal = '          if (u_revealType == 1) {';
  const main = '        void main(){';
  if ([tint, reveal, main].some((anchor) => source.split(anchor).length !== 2))
    throw new Error('style-tint-profile-upstream-drift');
  return (
    source
      .replace(tint, '          // The opt-in style tint is applied after all lighting below.')
      // Correct the derivative's two static light ramps without changing the
      // historical neutral literal. Reversed smoothstep edges are undefined GLSL.
      .replace(
        'smoothstep(0.4,0.0,distance((p_px + b_px) / u_boxSize, lp1))',
        '(1.0 - smoothstep(0.0,0.4,distance((p_px + b_px) / u_boxSize, lp1)))'
      )
      .replace(
        'smoothstep(0.5,0.0,distance((p_px + b_px) / u_boxSize, lp2))',
        '(1.0 - smoothstep(0.0,0.5,distance((p_px + b_px) / u_boxSize, lp2)))'
      )
      .replace(main, helpers + main)
      .replace(reveal, mapping + reveal)
  );
}
export const styleTintFragment = derive(fragment);
export const styleTintContactFragment = derive(contactFragment);
