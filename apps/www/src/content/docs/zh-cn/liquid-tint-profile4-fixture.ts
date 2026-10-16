// Historical derived shaders retain the liquidGL MIT notice below.
// Upstream kernel pin: 88f681ab7035fd55b04f63edff1841e32c4199e9.
// Source: packages/adapters/base/src/material/liquidgl-kernel.generated.ts
/*!
MIT License

Copyright (c) NaughtyDuk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Exclusion of Assets

The MIT License above applies only to the source code of this project (the
contents of the `scripts/` and `package/` directories). It does NOT apply to
the contents of the `assets/` directory (including but not limited to the
audio files under `assets/audio/` and `assets/fonts/`), which are provided
for demonstration purposes only and may not be copied, redistributed, or
reused outside of this repository without separate permission from their
respective rights holders.

---

Support Open Source

If this project has been useful to you, please consider supporting its
continued open-source development at https://liquidgl.naughtyduk.com

*/
/** Frozen Proto UI first-party derived profile4 shaders for historical test routes only.
 * Source: 2b8757f4516da60d3a3b31e9ec4df7401b3d3195,
 * tree bf899df185407f326a43dca40f2a65f9a20dcab0. These literal bytes preserve
 * the historical kernel; they are never a production profile or profile5 evidence.
 * Do not regenerate these snapshots from the current production adapter.
 */
export const TINT_PROFILE4_FIXTURE = Object.freeze({
  head: '2b8757f4516da60d3a3b31e9ec4df7401b3d3195',
  tree: 'bf899df185407f326a43dca40f2a65f9a20dcab0',
  static: Object.freeze({
    profile: 'pui-regular-style-tint-4',
    bytes: 10692,
    sha256: '1ad0356cc23940e6f50d6e63db167588ace5750e83638ead5ae7506597312e7d',
  }),
  contact: Object.freeze({
    profile: 'pui-regular-style-tint-contact-4',
    bytes: 10945,
    sha256: '83cacf5404ddefb6680b0b9efa7818c21de42252561a85b4a539833744e453cb',
  }),
} as const);
export const tintProfile4Fragment = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        varying vec2 v_uv;
        uniform sampler2D u_tex;
        uniform vec2  u_resolution;
        uniform vec2  u_textureResolution;
        uniform vec4  u_bounds;
        uniform float u_refraction;
        uniform float u_aberration;
        uniform float u_bevelDepth;
        uniform float u_bevelWidth;
        uniform float u_frost;
        uniform float u_radius;
        uniform float u_time;
        uniform bool  u_specular;
        uniform float u_revealProgress;
        uniform int   u_revealType;
        uniform float u_tiltX;
        uniform float u_tiltY;
        uniform float u_magnify;
        uniform vec2  u_subpixel;
        uniform vec2  u_boxSize;
        uniform vec4  u_tint;
        uniform sampler2D u_stack;
        uniform vec4 u_stackMapping;
        uniform vec4 u_stackRegion;
        uniform vec4 u_interaction;
        uniform float u_interactionRadius;
        uniform sampler2D u_shadow;
        uniform vec4 u_shadowMapping;

        vec4 sampleSource(vec2 uv) {
          vec4 background = texture2D(u_tex, uv);
          vec2 screenUV = u_stackMapping.xy + uv * u_stackMapping.zw;
          if (u_stackRegion.z > 0.0 &&
              all(greaterThanEqual(screenUV, u_stackRegion.xy)) &&
              all(lessThanEqual(screenUV, u_stackRegion.xy + u_stackRegion.zw))) {
            vec4 lower = texture2D(u_stack, vec2(screenUV.x, 1.0 - screenUV.y));
            return lower + background * (1.0 - lower.a);
          }
          return background;
        }

        float udRoundBox( vec2 p, vec2 b, float r ) {
          return length(max(abs(p)-b+r,0.0))-r;
        }

        vec2 cornerNormal( vec2 p, vec2 b, float r, vec2 fallback ) {
          vec2 q = abs(p) - b + r;
          vec2 m = max(q, 0.0);
          float l = length(m);
          if (l <= 0.0) return fallback;
          float w = smoothstep(0.0, max(r * 0.5, 1.0), min(m.x, m.y));
          if (w <= 0.0) return fallback;
          vec2 s = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
          return normalize(mix(fallback, s * (m / l), w));
        }

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec2 deformPoint(vec2 point) {
          if (u_interactionRadius <= 0.0) return point;
          vec2 centre = (vec2(u_interaction.x, 1.0 - u_interaction.y) - 0.5) * u_boxSize;
          float reach = u_interactionRadius * min(u_boxSize.x, u_boxSize.y);
          float influence = 1.0 - smoothstep(0.0, reach, length(point - centre));
          return point - vec2(u_interaction.z, -u_interaction.w) * u_boxSize * influence;
        }

        float edgeFactor(vec2 p_px, vec2 b_px, float radius_px){
          float d = -udRoundBox(p_px, b_px, radius_px);
          float bevel_px = u_bevelWidth * min(u_boxSize.x, u_boxSize.y);
          return 1.0 - smoothstep(0.0, bevel_px, d);
        }

        uniform float u_styleTintLightForeground;
        uniform float u_styleTintLuminanceBound;
        vec3 styleTintLinear(vec3 value) {
          return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)),
                     step(vec3(0.04045), value));
        }
        vec3 styleTintSrgb(vec3 value) {
          return mix(value * 12.92, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055,
                     step(vec3(0.0031308), value));
        }
        void main(){
          vec2 lensUV = (v_uv * u_resolution - u_subpixel) / u_boxSize;
          vec2 originalPoint = (lensUV - 0.5) * u_boxSize;
          vec2 p_px = deformPoint(originalPoint);
          vec2 b_px = 0.5 * u_boxSize;
          vec2 p = p_px / u_boxSize.y;
          float dmask = udRoundBox(p_px, b_px, u_radius);
          float inShape = 1.0 - smoothstep(-0.5, 0.5, dmask);
          float shadowAlpha = 0.0;
          if (u_shadowMapping.z > 0.0 && inShape < 1.0) {
            vec2 shadowUV = u_shadowMapping.xy + vec2(lensUV.x, 1.0 - lensUV.y) * u_shadowMapping.zw;
            shadowAlpha = texture2D(u_shadow, shadowUV).r * 0.1 * (1.0 - inShape);
            if (u_revealType == 1) shadowAlpha *= u_revealProgress;
            float noise = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
            shadowAlpha = floor(shadowAlpha * 255.0 + noise) / 255.0;
          }
          if (inShape <= 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, shadowAlpha);
            return;
          }

          float edge = edgeFactor(p_px, b_px, u_radius);
          float min_dimension = min(u_resolution.x, u_resolution.y);
          float offsetAmt = (edge * u_refraction + pow(edge, 10.0) * u_bevelDepth);
          float centreBlend = smoothstep(0.15, 0.45, length(p));
          vec2 refractDir = cornerNormal(p_px, b_px, u_radius, normalize(p + vec2(0.000001)));
          if (u_interactionRadius > 0.0) {
            vec2 gradient = vec2(
              udRoundBox(deformPoint(originalPoint + vec2(0.5, 0.0)), b_px, u_radius) - udRoundBox(deformPoint(originalPoint - vec2(0.5, 0.0)), b_px, u_radius),
              udRoundBox(deformPoint(originalPoint + vec2(0.0, 0.5)), b_px, u_radius) - udRoundBox(deformPoint(originalPoint - vec2(0.0, 0.5)), b_px, u_radius)
            );
            if (length(gradient) > 0.0001) refractDir = normalize(mix(refractDir, normalize(gradient), min(length(p_px - originalPoint), 1.0)));
          }
          vec2 offset = refractDir * offsetAmt * centreBlend;

          float tiltRefractionScale = 0.05;
          vec2 tiltOffset = vec2(tan(radians(u_tiltY)), -tan(radians(u_tiltX))) * tiltRefractionScale;

          vec2 localUV = (lensUV - 0.5) / u_magnify + 0.5;
          vec2 flippedUV = vec2(localUV.x, 1.0 - localUV.y);
          vec2 mapped = u_bounds.xy + flippedUV * u_bounds.zw;
          vec2 refracted = mapped + offset - tiltOffset;

          float oob = max(max(-refracted.x, refracted.x - 1.0), max(-refracted.y, refracted.y - 1.0));
          float blend = 1.0 - smoothstep(0.0, 0.01, oob);
          vec2 sampleUV = mix(mapped, refracted, blend);

          vec4 baseCol   = sampleSource(mapped);

          vec2 texel = 1.0 / u_textureResolution;
          vec4 refrCol;

          vec2 chroma = offset * u_aberration;

          if (u_frost > 0.0) {
              float radius = u_frost * 4.0;
              vec4 sum = vec4(0.0);
              const int SAMPLES = 16;

              for (int i = 0; i < SAMPLES; i++) {
                  float angle = random(v_uv + float(i)) * 6.283185;
                  float dist = sqrt(random(v_uv - float(i))) * radius;
                  vec2 foff = vec2(cos(angle), sin(angle)) * texel * dist;
                  if (u_aberration > 0.0) {
                      sum.r += sampleSource(sampleUV + foff - chroma).r;
                      sum.g += sampleSource(sampleUV + foff).g;
                      sum.b += sampleSource(sampleUV + foff + chroma).b;
                      sum.a += sampleSource(sampleUV + foff).a;
                  } else {
                      sum += sampleSource(sampleUV + foff);
                  }
              }
              refrCol = sum / float(SAMPLES);
          } else {
              refrCol = sampleSource(sampleUV);
              refrCol += sampleSource(sampleUV + vec2( texel.x, 0.0));
              refrCol += sampleSource(sampleUV + vec2(-texel.x, 0.0));
              refrCol += sampleSource(sampleUV + vec2(0.0,  texel.y));
              refrCol += sampleSource(sampleUV + vec2(0.0, -texel.y));
              refrCol /= 5.0;

              if (u_aberration > 0.0) {
                  refrCol.r = sampleSource(sampleUV - chroma).r;
                  refrCol.b = sampleSource(sampleUV + chroma).b;
              }
          }

          if (refrCol.a < 0.1) {
              refrCol = baseCol;
          }

          float diff = clamp(length(refrCol.rgb - baseCol.rgb) * 4.0, 0.0, 1.0);

          float antiHalo = (1.0 - centreBlend) * diff;

          vec4 final    = refrCol;

          // The opt-in style tint is applied after all lighting below.

          if (u_specular) {
            vec2 lp1 = vec2(sin(u_time*0.2), cos(u_time*0.3))*0.6 + 0.5;
            vec2 lp2 = vec2(sin(u_time*-0.4+1.5), cos(u_time*0.25-0.5))*0.6 + 0.5;
            float h = 0.0;
            h += (1.0 - smoothstep(0.0,0.4,distance((p_px + b_px) / u_boxSize, lp1)))*0.1;
            h += (1.0 - smoothstep(0.0,0.5,distance((p_px + b_px) / u_boxSize, lp2)))*0.08;
            final.rgb += h;
          }


          // Retain the admitted optical source's spatial tone and chroma.
          // The safe bound is luminance, not a narrow per-channel solid-fill band.
          vec3 styleTintDetail = clamp(final.rgb, 0.0, 1.0);
          vec3 styleTintBase = styleTintLinear(u_tint.rgb);
          vec3 styleTintWeights = vec3(0.2126, 0.7152, 0.0722);
          float styleTintTone = dot(styleTintDetail, styleTintWeights);
          vec3 styleTintHue = mix(styleTintBase, styleTintLinear(styleTintDetail), 0.25);
          float styleTintBoundCode = styleTintSrgb(vec3(u_styleTintLuminanceBound)).r;
          float styleTintTargetCode = mix(
            styleTintBoundCode + (1.0 - styleTintBoundCode) * styleTintTone,
            styleTintBoundCode * styleTintTone, u_styleTintLightForeground);
          float styleTintTarget = styleTintLinear(vec3(styleTintTargetCode)).r;
          // 2^-12 remains normal at the inherited minimum mediump precision.
          // Both branches must stay finite, including black/white endpoints.
          vec3 styleTintDark = styleTintHue *
            (styleTintTarget /
             max(dot(styleTintHue, styleTintWeights), 0.000244140625));
          vec3 styleTintComplement = vec3(1.0) - styleTintHue;
          vec3 styleTintLight = vec3(1.0) - styleTintComplement *
            ((1.0 - styleTintTarget) /
             max(dot(styleTintComplement, styleTintWeights), 0.000244140625));
          // Gamut clipping only moves farther onto the foreground-safe side:
          // down in luminance for light text, up for dark text. Readback guards
          // still reject any finite-precision or near-opaque contrast failure.
          final.rgb = styleTintSrgb(clamp(mix(styleTintLight, styleTintDark,
                                             u_styleTintLightForeground), 0.0, 1.0));

          if (u_revealType == 1) {
              final.rgb *= u_revealProgress;
              final.a  *= u_revealProgress;
          }

          final.rgb *= inShape;
          final.a = final.a * inShape + shadowAlpha;

          gl_FragColor = final;
        }`;
export const tintProfile4ContactFragment = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        varying vec2 v_uv;
        uniform sampler2D u_tex;
        uniform vec2  u_resolution;
        uniform vec2  u_textureResolution;
        uniform vec4  u_bounds;
        uniform float u_refraction;
        uniform float u_aberration;
        uniform float u_bevelDepth;
        uniform float u_bevelWidth;
        uniform float u_frost;
        uniform float u_radius;
        uniform float u_time;
        uniform float u_contactShape;
        uniform bool  u_specular;
        uniform float u_revealProgress;
        uniform int   u_revealType;
        uniform float u_tiltX;
        uniform float u_tiltY;
        uniform float u_magnify;
        uniform vec2  u_subpixel;
        uniform vec2  u_boxSize;
        uniform vec4  u_tint;
        uniform sampler2D u_stack;
        uniform vec4 u_stackMapping;
        uniform vec4 u_stackRegion;
        uniform vec4 u_interaction;
        uniform float u_interactionRadius;
        uniform sampler2D u_shadow;
        uniform vec4 u_shadowMapping;

        vec4 sampleSource(vec2 uv) {
          vec4 background = texture2D(u_tex, uv);
          vec2 screenUV = u_stackMapping.xy + uv * u_stackMapping.zw;
          if (u_stackRegion.z > 0.0 &&
              all(greaterThanEqual(screenUV, u_stackRegion.xy)) &&
              all(lessThanEqual(screenUV, u_stackRegion.xy + u_stackRegion.zw))) {
            vec4 lower = texture2D(u_stack, vec2(screenUV.x, 1.0 - screenUV.y));
            return lower + background * (1.0 - lower.a);
          }
          return background;
        }

        float udRoundBox( vec2 p, vec2 b, float r ) {
          return length(max(abs(p)-b+r,0.0))-r;
        }

        vec2 cornerNormal( vec2 p, vec2 b, float r, vec2 fallback ) {
          vec2 q = abs(p) - b + r;
          vec2 m = max(q, 0.0);
          float l = length(m);
          if (l <= 0.0) return fallback;
          float w = smoothstep(0.0, max(r * 0.5, 1.0), min(m.x, m.y));
          if (w <= 0.0) return fallback;
          vec2 s = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
          return normalize(mix(fallback, s * (m / l), w));
        }

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec2 deformPoint(vec2 point) {
          if (u_interactionRadius <= 0.0) return point;
          vec2 centre = (vec2(u_interaction.x, 1.0 - u_interaction.y) - 0.5) * u_boxSize;
          float reach = u_interactionRadius * min(u_boxSize.x, u_boxSize.y);
          float influence = 1.0 - smoothstep(0.0, reach, length(point - centre));
          return point - vec2(u_interaction.z, -u_interaction.w) * u_boxSize * influence;
        }

        float edgeFactor(vec2 p_px, vec2 b_px, float radius_px){
          float d = -udRoundBox(p_px, b_px, radius_px);
          float bevel_px = u_bevelWidth * min(u_boxSize.x, u_boxSize.y);
          return 1.0 - smoothstep(0.0, bevel_px, d);
        }

        uniform float u_styleTintLightForeground;
        uniform float u_styleTintLuminanceBound;
        vec3 styleTintLinear(vec3 value) {
          return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)),
                     step(vec3(0.04045), value));
        }
        vec3 styleTintSrgb(vec3 value) {
          return mix(value * 12.92, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055,
                     step(vec3(0.0031308), value));
        }
        void main(){
          vec2 lensUV = (v_uv * u_resolution - u_subpixel) / u_boxSize;
          vec2 originalPoint = (lensUV - 0.5) * u_boxSize;
          vec2 p_px = deformPoint(originalPoint);
          float dilation = 1.0 + 0.045 * clamp(u_contactShape, 0.0, 1.0);
          vec2 b_px = 0.5 * u_boxSize * dilation;
          float shapeRadius = min(u_radius * dilation, min(b_px.x, b_px.y));
          vec2 p = p_px / u_boxSize.y;
          float dmask = udRoundBox(p_px, b_px, shapeRadius);
          float inShape = 1.0 - smoothstep(-0.5, 0.5, dmask);
          float shadowAlpha = 0.0;
          if (u_shadowMapping.z > 0.0 && inShape < 1.0) {
            vec2 shadowUV = u_shadowMapping.xy + vec2(lensUV.x, 1.0 - lensUV.y) * u_shadowMapping.zw;
            shadowAlpha = texture2D(u_shadow, shadowUV).r * 0.1 * (1.0 - inShape);
            if (u_revealType == 1) shadowAlpha *= u_revealProgress;
            float noise = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
            shadowAlpha = floor(shadowAlpha * 255.0 + noise) / 255.0;
          }
          if (inShape <= 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, shadowAlpha);
            return;
          }

          float edge = edgeFactor(p_px, b_px, shapeRadius);
          float min_dimension = min(u_resolution.x, u_resolution.y);
          float offsetAmt = (edge * u_refraction + pow(edge, 10.0) * u_bevelDepth);
          float centreBlend = smoothstep(0.15, 0.45, length(p));
          vec2 refractDir = cornerNormal(p_px, b_px, shapeRadius, normalize(p + vec2(0.000001)));
          if (u_interactionRadius > 0.0) {
            vec2 gradient = vec2(
              udRoundBox(deformPoint(originalPoint + vec2(0.5, 0.0)), b_px, shapeRadius) - udRoundBox(deformPoint(originalPoint - vec2(0.5, 0.0)), b_px, shapeRadius),
              udRoundBox(deformPoint(originalPoint + vec2(0.0, 0.5)), b_px, shapeRadius) - udRoundBox(deformPoint(originalPoint - vec2(0.0, 0.5)), b_px, shapeRadius)
            );
            if (length(gradient) > 0.0001) refractDir = normalize(mix(refractDir, normalize(gradient), min(length(p_px - originalPoint), 1.0)));
          }
          vec2 offset = refractDir * offsetAmt * centreBlend;

          float tiltRefractionScale = 0.05;
          vec2 tiltOffset = vec2(tan(radians(u_tiltY)), -tan(radians(u_tiltX))) * tiltRefractionScale;

          vec2 localUV = (lensUV - 0.5) / u_magnify + 0.5;
          vec2 flippedUV = vec2(localUV.x, 1.0 - localUV.y);
          vec2 mapped = u_bounds.xy + flippedUV * u_bounds.zw;
          vec2 refracted = mapped + offset - tiltOffset;

          float oob = max(max(-refracted.x, refracted.x - 1.0), max(-refracted.y, refracted.y - 1.0));
          float blend = 1.0 - smoothstep(0.0, 0.01, oob);
          vec2 sampleUV = mix(mapped, refracted, blend);

          vec4 baseCol   = sampleSource(mapped);

          vec2 texel = 1.0 / u_textureResolution;
          vec4 refrCol;

          vec2 chroma = offset * u_aberration;

          if (u_frost > 0.0) {
              float radius = u_frost * 4.0;
              vec4 sum = vec4(0.0);
              const int SAMPLES = 16;

              for (int i = 0; i < SAMPLES; i++) {
                  float angle = random(v_uv + float(i)) * 6.283185;
                  float dist = sqrt(random(v_uv - float(i))) * radius;
                  vec2 foff = vec2(cos(angle), sin(angle)) * texel * dist;
                  if (u_aberration > 0.0) {
                      sum.r += sampleSource(sampleUV + foff - chroma).r;
                      sum.g += sampleSource(sampleUV + foff).g;
                      sum.b += sampleSource(sampleUV + foff + chroma).b;
                      sum.a += sampleSource(sampleUV + foff).a;
                  } else {
                      sum += sampleSource(sampleUV + foff);
                  }
              }
              refrCol = sum / float(SAMPLES);
          } else {
              refrCol = sampleSource(sampleUV);
              refrCol += sampleSource(sampleUV + vec2( texel.x, 0.0));
              refrCol += sampleSource(sampleUV + vec2(-texel.x, 0.0));
              refrCol += sampleSource(sampleUV + vec2(0.0,  texel.y));
              refrCol += sampleSource(sampleUV + vec2(0.0, -texel.y));
              refrCol /= 5.0;

              if (u_aberration > 0.0) {
                  refrCol.r = sampleSource(sampleUV - chroma).r;
                  refrCol.b = sampleSource(sampleUV + chroma).b;
              }
          }

          if (refrCol.a < 0.1) {
              refrCol = baseCol;
          }

          float diff = clamp(length(refrCol.rgb - baseCol.rgb) * 4.0, 0.0, 1.0);

          float antiHalo = (1.0 - centreBlend) * diff;

          vec4 final    = refrCol;

          // The opt-in style tint is applied after all lighting below.

          if (u_specular) {
            vec2 point = (p_px + b_px) / u_boxSize;
            vec2 contact = vec2(u_interaction.x, 1.0 - u_interaction.y);
            float localLight = 1.0 - smoothstep(0.0, 0.42, distance(point, contact));
            float rimLight = pow(clamp(edge, 0.0, 1.0), 2.0);
            float active = clamp(u_interactionRadius, 0.0, 1.0);
            final.rgb += vec3(0.035 + localLight * active * (0.075 + rimLight * 0.10));
          }


          // Retain the admitted optical source's spatial tone and chroma.
          // The safe bound is luminance, not a narrow per-channel solid-fill band.
          vec3 styleTintDetail = clamp(final.rgb, 0.0, 1.0);
          vec3 styleTintBase = styleTintLinear(u_tint.rgb);
          vec3 styleTintWeights = vec3(0.2126, 0.7152, 0.0722);
          float styleTintTone = dot(styleTintDetail, styleTintWeights);
          vec3 styleTintHue = mix(styleTintBase, styleTintLinear(styleTintDetail), 0.25);
          float styleTintBoundCode = styleTintSrgb(vec3(u_styleTintLuminanceBound)).r;
          float styleTintTargetCode = mix(
            styleTintBoundCode + (1.0 - styleTintBoundCode) * styleTintTone,
            styleTintBoundCode * styleTintTone, u_styleTintLightForeground);
          float styleTintTarget = styleTintLinear(vec3(styleTintTargetCode)).r;
          // 2^-12 remains normal at the inherited minimum mediump precision.
          // Both branches must stay finite, including black/white endpoints.
          vec3 styleTintDark = styleTintHue *
            (styleTintTarget /
             max(dot(styleTintHue, styleTintWeights), 0.000244140625));
          vec3 styleTintComplement = vec3(1.0) - styleTintHue;
          vec3 styleTintLight = vec3(1.0) - styleTintComplement *
            ((1.0 - styleTintTarget) /
             max(dot(styleTintComplement, styleTintWeights), 0.000244140625));
          // Gamut clipping only moves farther onto the foreground-safe side:
          // down in luminance for light text, up for dark text. Readback guards
          // still reject any finite-precision or near-opaque contrast failure.
          final.rgb = styleTintSrgb(clamp(mix(styleTintLight, styleTintDark,
                                             u_styleTintLightForeground), 0.0, 1.0));

          if (u_revealType == 1) {
              final.rgb *= u_revealProgress;
              final.a  *= u_revealProgress;
          }

          final.rgb *= inShape;
          final.a = final.a * inShape + shadowAlpha;

          gl_FragColor = final;
        }`;
