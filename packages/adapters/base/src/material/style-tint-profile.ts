import { contactFragment } from './contact-profile';
import { fragment } from './liquidgl-kernel.generated';
import { colorContrast, opaqueRgba, type OpaqueRgba } from './style';

/** First-party, opt-in regular style-fill profile. No Apple equivalence or
 * author parameters. Refraction and contact still sample the admitted source;
 * the complete light contribution is mapped inside the fallback contrast bound.
 * The original neutral shaders remain byte-for-byte unchanged. */
export const styleTintProfile = 'pui-regular-style-tint-1';
export const styleTintContactProfile = 'pui-regular-style-tint-contact-1';

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
          // Lighting is included before the bounded tint map, never added after it.
          float styleTintDetail = clamp(dot(styleTintLinear(clamp(final.rgb, 0.0, 1.0)),
                                            vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
          vec3 styleTintBase = styleTintLinear(u_tint.rgb);
          vec3 styleTintDark = styleTintBase * (0.68 + 0.32 * styleTintDetail);
          vec3 styleTintLight = mix(styleTintBase, vec3(1.0), 0.32 * styleTintDetail);
          final.rgb = styleTintSrgb(mix(styleTintLight, styleTintDark,
                                        u_styleTintLightForeground));

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
