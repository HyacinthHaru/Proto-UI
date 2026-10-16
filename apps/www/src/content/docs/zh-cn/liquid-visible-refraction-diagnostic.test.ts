// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  REFRACTION_POLICY,
  REFRACTION_SEQUENCE,
  strictWarpOffShader,
  structuredRefractionSource,
  measureRefractionCorrespondence,
  summarizeRefractionCoverage,
  refractionRegions,
  refractionCollectionBudget,
  terminalRefractionCoverage,
  summarizeRefractionSequence,
  collectRefractionCapabilities,
  bindRefractionCapability,
  type RefractionImage,
} from './liquid-visible-refraction-diagnostic';
import {
  styleTintFragment,
  styleTintContactFragment,
} from '../../../../../../packages/adapters/base/src/material/style-tint-profile';
import { fragment as neutralFragment } from '../../../../../../packages/adapters/base/src/material/liquidgl-kernel.generated';
import { contactFragment as neutralContactFragment } from '../../../../../../packages/adapters/base/src/material/contact-profile';
const image = (w = 120, h = 70, dpr = 1): RefractionImage =>
  structuredRefractionSource(w * dpr, h * dpr, dpr);
function transform(
  a: RefractionImage,
  sample: (x: number, y: number, c: number) => number
): RefractionImage {
  const data = new Uint8Array(a.data.length);
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++)
      for (let c = 0; c < 4; c++) data[(y * a.width + x) * 4 + c] = c === 3 ? 255 : sample(x, y, c);
  return { ...a, data };
}
const at = (a: RefractionImage, x: number, y: number, c: number) =>
  a.data[
    (Math.max(0, Math.min(a.height - 1, Math.round(y))) * a.width +
      Math.max(0, Math.min(a.width - 1, Math.round(x)))) *
      4 +
      c
  ];
const regions = (a: RefractionImage, dpr = 1) =>
  refractionRegions(
    {
      width: a.width / dpr,
      height: a.height / dpr,
      radius: 0,
      paintOutset: 0,
      dpr,
      bounds: [0, 0, 1, 1],
    },
    []
  );
// Mocked WebGL query/compile ABI only. These tests are not native GPU evidence.
function capabilityContext(
  options: {
    branch?: 'highp' | 'mediump';
    compilation?: 'both-pass' | 'both-fail' | 'missing';
    missingPrecision?: boolean;
    debugExtension?: boolean;
    lost?: boolean;
    missingStrings?: boolean;
  } = {}
) {
  const sources = new Map<object, string>(),
    deleted: object[] = [];
  const gl = {
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    VERSION: 7938,
    SHADING_LANGUAGE_VERSION: 35724,
    RENDERER: 7937,
    VENDOR: 7936,
    HIGH_FLOAT: 36338,
    MEDIUM_FLOAT: 36337,
    getParameter: (key: number) =>
      options.missingStrings
        ? null
        : {
            7938: 'WebGL 1.0 (mock)',
            35724: 'WebGL GLSL ES 1.0 (mock)',
            7937: 'mock masked renderer',
            7936: 'mock vendor',
            37446: 'mock unmasked renderer',
            37445: 'mock unmasked vendor',
          }[key],
    getShaderPrecisionFormat: (_kind: number, precision: number) =>
      options.missingPrecision
        ? null
        : precision === 36338 && options.branch === 'mediump'
          ? { rangeMin: 0, rangeMax: 0, precision: 0 }
          : { rangeMin: 127, rangeMax: 127, precision: precision === 36338 ? 23 : 10 },
    getExtension: () =>
      options.debugExtension
        ? { UNMASKED_RENDERER_WEBGL: 37446, UNMASKED_VENDOR_WEBGL: 37445 }
        : null,
    createShader: () => ({}),
    shaderSource: (shader: object, source: string) => sources.set(shader, source),
    compileShader: (_shader: object) => {},
    getShaderParameter: (shader: object) => {
      const source = sources.get(shader)!;
      if (options.compilation === 'missing') return null;
      if (options.compilation === 'both-pass') return true;
      if (options.compilation === 'both-fail') return false;
      if (source.includes('expected_highp')) return options.branch !== 'mediump';
      if (source.includes('expected_mediump')) return options.branch === 'mediump';
      return true;
    },
    getShaderInfoLog: () => 'mock compiler result',
    deleteShader: (shader: object) => deleted.push(shader),
    isContextLost: () => options.lost ?? false,
  };
  return { gl: gl as unknown as WebGLRenderingContext, sources, deleted };
}
describe('bounded visible-refraction diagnostics, never appearance acceptance', () => {
  it('has one surgical test-only warp edit and unchanged native sampler branch', () => {
    for (const s of [
      styleTintFragment,
      styleTintContactFragment,
      neutralFragment,
      neutralContactFragment,
    ]) {
      const anchor = s.includes('vec2 offset = finalOffset;')
        ? 'vec2 offset = finalOffset;'
        : 'vec2 offset = refractDir * offsetAmt * centreBlend;';
      const altered = strictWarpOffShader(s);
      expect(altered.replace(/(^[ \t]*)vec2 offset = vec2\(0\.0\);/m, `$1${anchor}`)).toBe(s);
      expect(altered).toContain('vec2 chroma = offset * u_aberration;');
      expect(altered).toContain('(lensUV - 0.5) / u_magnify + 0.5');
      expect(altered).toContain('if (u_aberration > 0.0)');
    }
    expect(() => strictWarpOffShader('no anchor')).toThrow('unique-offset');
    expect(() => strictWarpOffShader(styleTintFragment + styleTintFragment)).toThrow(
      'unique-offset'
    );
  });
  for (const lateWrite of [
    'offset = vec2(1.0);',
    'offset += vec2(1.0);',
    'offset.x = 1.0;',
    'offset.xy *= 2.0;',
    'offset[0] = 1.0;',
    'offset.x++;',
    '++offset.y;',
    'offset.y--;',
    '--offset.x;',
    'mutateOffset(offset);',
    'mutateOffsetComponent(offset[0]);',
    '  vec2 offset = finalOffset;',
  ])
    it(`rejects unapproved post-anchor offset use: ${lateWrite}`, () => {
      for (const source of [neutralFragment, styleTintFragment, styleTintContactFragment]) {
        const drift = source.replace(
          'vec2 refracted = mapped + offset - tiltOffset;',
          `${lateWrite}\nvec2 refracted = mapped + offset - tiltOffset;`
        );
        expect(() => strictWarpOffShader(drift)).toThrow('offset');
      }
    });
  it('rejects mixed anchors, comment-only anchors, and an early anchor with later final work', () => {
    expect(() =>
      strictWarpOffShader('// vec2 offset = refractDir * offsetAmt * centreBlend;')
    ).toThrow('offset');
    expect(() =>
      strictWarpOffShader(
        neutralFragment.replace(
          'vec2 refracted = mapped + offset - tiltOffset;',
          'vec2 finalOffset = offset;\nvec2 refracted = mapped + offset - tiltOffset;'
        )
      )
    ).toThrow('offset');
    expect(() => strictWarpOffShader(neutralFragment + '\nvec2 offset = finalOffset;')).toThrow(
      'offset'
    );
  });
  it('requires the final profile5 anchor after all additions and before source sampling', () => {
    for (const source of [styleTintFragment, styleTintContactFragment]) {
      expect(source).toContain('vec2 offset = finalOffset;');
      const altered = strictWarpOffShader(source);
      expect(altered.indexOf('finalOffset = oldOffset + budgetLambda * budgetDelta;')).toBeLessThan(
        altered.search(/^[ \t]*vec2 offset = vec2\(0\.0\);/m)
      );
      for (const drift of [
        source.replace('vec2 offset = finalOffset;', ''),
        source.replace(
          'vec2 offset = finalOffset;',
          'vec2 offset = refractDir * offsetAmt * centreBlend;'
        ),
        source.replace(
          'vec2 offset = finalOffset;',
          'vec4 tooEarly = sampleSource(mapped);\nvec2 offset = finalOffset;'
        ),
        source.replace(
          'vec2 refracted = mapped + offset - tiltOffset;',
          'finalOffset += vec2(0.1);\nvec2 refracted = mapped + offset - tiltOffset;'
        ),
        source
          .replace(
            'finalOffset = oldOffset + budgetLambda * budgetDelta;',
            'vec2 offset = finalOffset;\nfinalOffset = oldOffset + budgetLambda * budgetDelta;'
          )
          .replace(/\n[ \t]*vec2 offset = finalOffset;\n[ \t]*vec2 refracted/, '\nvec2 refracted'),
      ])
        expect(() => strictWarpOffShader(drift)).toThrow('offset');
    }
  });
  it('pins candidate profile5 shader identity separately from frozen image provenance', () => {
    expect(REFRACTION_POLICY.baselineTree).toBe('20bb2794c8ef1f71f6fac1ec649e033677c818cf');
    expect(REFRACTION_POLICY.shaderSha256.static).toBe(
      createHash('sha256').update(styleTintFragment).digest('hex')
    );
    expect(REFRACTION_POLICY.shaderSha256.contact).toBe(
      createHash('sha256').update(styleTintContactFragment).digest('hex')
    );
  });
  for (const branch of ['highp', 'mediump'] as const)
    it(`binds same-context ${branch} compile evidence to actual shader hashes without drawing`, async () => {
      const mock = capabilityContext({ branch });
      const capability = await collectRefractionCapabilities(mock.gl);
      expect(capability.branchProbe.selectedBranch).toBe(branch);
      expect(capability.branchProbe.status).toBe('identified');
      expect(capability.branchProbe.draws).toBe(0);
      expect(mock.deleted).toHaveLength(3);
      expect(new Set(mock.deleted).size).toBe(3);
      expect(capability.version).toEqual({ status: 'available', value: 'WebGL 1.0 (mock)' });
      expect(capability.renderer).toEqual({ status: 'available', value: 'mock masked renderer' });
      expect(capability.fragmentPrecision.HIGH_FLOAT.status).toBe('available');
      expect(capability.fragmentPrecision.MEDIUM_FLOAT.status).toBe('available');
      expect(capability.debugRenderer.status).toBe('unavailable');
      expect(JSON.stringify(capability.debugRenderer)).not.toContain('mock masked renderer');
      const actual = strictWarpOffShader(styleTintFragment);
      const bound = await bindRefractionCapability(
        capability,
        styleTintFragment,
        actual,
        true,
        true
      );
      expect(bound.status).toBe('identified');
      expect(bound.selectedPrecisionBranch).toBe(branch);
      expect(bound.refractionBranch).toBe(
        branch === 'highp' ? 'profile5-budgeted-shoulder' : 'profile5-retained-old-offset'
      );
      expect(bound.offsetControl).toBe('strict-final-offset-zero');
      if (branch === 'mediump')
        expect(capability.fragmentPrecision.HIGH_FLOAT).toEqual({
          status: 'available',
          value: { rangeMin: 0, rangeMax: 0, precision: 0, supported: false },
        });
      expect(bound.actualShaderSha256).toBe(createHash('sha256').update(actual).digest('hex'));
      expect(bound.originalShaderSha256).toBe(
        createHash('sha256').update(styleTintFragment).digest('hex')
      );
      expect(bound.capabilitySha256).toBe(
        createHash('sha256').update(JSON.stringify(capability)).digest('hex')
      );
      expect(bound.actualShaderSha256).not.toBe(bound.originalShaderSha256);
    });
  for (const compilation of ['both-pass', 'both-fail', 'missing'] as const)
    it(`does not infer a branch from precision when compile evidence is ${compilation}`, async () => {
      const { gl } = capabilityContext({ compilation });
      const capabilities = await collectRefractionCapabilities(gl);
      expect(capabilities.branchProbe.selectedBranch).toBe('unknown');
      expect(capabilities.branchProbe.status).toBe('unknown');
      const bound = await bindRefractionCapability(
        capabilities,
        styleTintFragment,
        styleTintFragment,
        true,
        true
      );
      expect(bound.status).toBe('unknown');
      expect(bound.refractionBranch).toBe('unknown');
    });
  it('retains unavailable queries, context loss and optional debug-extension absence honestly', async () => {
    const absent = await collectRefractionCapabilities(
      capabilityContext({ missingPrecision: true, missingStrings: true, lost: true }).gl
    );
    expect(absent.version.status).toBe('unavailable');
    expect(absent.renderer.status).toBe('unavailable');
    expect(absent.fragmentPrecision.HIGH_FLOAT.status).toBe('unavailable');
    expect(absent.fragmentPrecision.MEDIUM_FLOAT.status).toBe('unavailable');
    expect(absent.branchProbe.selectedBranch).toBe('unknown');
    expect(absent.debugRenderer).not.toHaveProperty('renderer');
    const present = await collectRefractionCapabilities(
      capabilityContext({ debugExtension: true }).gl
    );
    expect(present.debugRenderer).toEqual({
      status: 'available',
      renderer: { status: 'available', value: 'mock unmasked renderer' },
      vendor: { status: 'available', value: 'mock unmasked vendor' },
    });
  });
  it('retains shader allocation failures, missing compiler logs and thrown capability queries', async () => {
    const failed = capabilityContext();
    failed.gl.createShader = () => null;
    failed.gl.getExtension = () => {
      throw new Error('mock extension query unavailable');
    };
    failed.gl.getShaderPrecisionFormat = () => {
      throw new Error('mock precision query unavailable');
    };
    const missing = await collectRefractionCapabilities(failed.gl);
    expect(missing.branchProbe.selectedBranch).toBe('unknown');
    expect(
      missing.branchProbe.probes.every((probe) => probe.compiled.status === 'unavailable')
    ).toBe(true);
    expect(missing.fragmentPrecision.HIGH_FLOAT.status).toBe('unavailable');
    expect(missing.debugRenderer.status).toBe('unavailable');
    const noLog = capabilityContext();
    noLog.gl.getShaderInfoLog = () => null;
    const evidence = await collectRefractionCapabilities(noLog.gl);
    expect(evidence.branchProbe.probes.every((probe) => probe.log?.status === 'unavailable')).toBe(
      true
    );
  });
  it('withholds branch binding for uncompiled, unlinked, altered-guard or macro-overridden shaders', async () => {
    const capabilities = await collectRefractionCapabilities(capabilityContext().gl);
    for (const [compiled, linked] of [
      [false, true],
      [true, false],
      [null, true],
    ] as const) {
      const bound = await bindRefractionCapability(
        capabilities,
        styleTintFragment,
        styleTintFragment,
        compiled,
        linked
      );
      expect(bound.status).toBe('unknown');
    }
    for (const source of [
      'precision mediump float; void main() {}',
      `#define GL_FRAGMENT_PRECISION_HIGH 1\n${styleTintFragment}`,
      styleTintFragment.replace('#ifdef GL_FRAGMENT_PRECISION_HIGH', '#if 1'),
    ]) {
      const bound = await bindRefractionCapability(
        capabilities,
        styleTintFragment,
        source,
        true,
        true
      );
      expect(bound.status).toBe('unknown');
    }
  });
  it('freezes source and regions without post-measurement selection', () => {
    const a = image();
    expect(createHash('sha256').update(a.data).digest('hex')).toBe(
      createHash('sha256').update(image().data).digest('hex')
    );
    expect(regions(a).length).toBeGreaterThan(10);
    expect(REFRACTION_SEQUENCE.map((f) => f.sourceShiftRasterX)).toEqual([0, 0, 0, 0, 0, 0, 6]);
    expect(REFRACTION_SEQUENCE[5].contact).toEqual(REFRACTION_SEQUENCE[6].contact);
    expect(REFRACTION_POLICY.maximumDraws).toBe(144);
    expect(REFRACTION_POLICY.productAccepted).toBe(false);
  });
  for (const dpr of [1, 2])
    it(`calibrates zero/known nonrigid displacement in CSS pixels at DPR ${dpr}`, () => {
      const a = image(240, 120, dpr),
        r = regions(a, dpr);
      const zero = measureRefractionCorrespondence(a, a, r, dpr);
      expect(zero.verdict).toBe('no-resolved-nonrigid-displacement');
      const moved = transform(a, (x, y, c) =>
        at(a, x - (y < a.height / 3 ? -4 : y < (2 * a.height) / 3 ? 4 : -4) * dpr, y, c)
      );
      const measured = measureRefractionCorrespondence(a, moved, r, dpr);
      expect(measured.verdict).toBe('resolved-nonrigid-correspondence');
      expect(measured.nonrigidRmsCss).toBeGreaterThan(1);
      expect(measured.acceptedTracks).toBeGreaterThanOrEqual(6);
      const errors = measured.tracks.map((t) =>
        Math.abs(t.dx - (t.y < a.height / 3 ? -4 : t.y < (2 * a.height) / 3 ? 4 : -4))
      );
      expect(errors.reduce((sum, e) => sum + e, 0) / errors.length).toBeLessThan(0.5);
      for (const track of measured.tracks.filter(
        (t) => Math.min(Math.abs(t.y / dpr - 40), Math.abs(t.y / dpr - 80)) > 4
      )) {
        expect(
          Math.abs(track.dx - (track.y / dpr < 40 ? -4 : track.y / dpr < 80 ? 4 : -4))
        ).toBeLessThanOrEqual(0.75);
        expect(Math.abs(track.dy)).toBeLessThanOrEqual(0.75);
      }
      expect(measured.support.fullShapeAbsenceProved).toBe(false);
    }, 15_000);
  for (const kind of [
    'brightness',
    'tint',
    'blur',
    'noise',
    'rigid-translation',
    'rigid-rotation',
    'affine-scale',
    'affine-shear',
  ])
    it(`rejects ${kind} as bending or reports insufficient signal`, () => {
      const a = image(),
        r = regions(a);
      const b = transform(a, (x, y, c) => {
        if (kind === 'brightness') return at(a, x, y, c) * 0.7 + 20;
        if (kind === 'tint') return at(a, x, y, c) * [0.7, 0.8, 0.9][c] + [20, 15, 10][c];
        if (kind === 'noise') return 80 + ((x * 73 + y * 139 + c * 47 + x * y * 11) % 130);
        if (kind === 'rigid-translation') return at(a, x - 3, y + 2, c);
        if (kind === 'affine-scale')
          return at(
            a,
            (x - a.width / 2) / 1.04 + a.width / 2,
            (y - a.height / 2) / 1.04 + a.height / 2,
            c
          );
        if (kind === 'affine-shear') return at(a, x - 0.05 * (y - a.height / 2), y, c);
        if (kind === 'rigid-rotation') {
          const t = 0.025,
            xx = x - a.width / 2,
            yy = y - a.height / 2;
          return at(
            a,
            xx * Math.cos(t) + yy * Math.sin(t) + a.width / 2,
            -xx * Math.sin(t) + yy * Math.cos(t) + a.height / 2,
            c
          );
        }
        let sum = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) sum += at(a, x + dx, y + dy, c);
        return sum / 25;
      });
      expect(measureRefractionCorrespondence(a, b, r).verdict).not.toBe(
        'resolved-nonrigid-correspondence'
      );
    });
  it('reports flat, clipped, malformed, or unbound samples honestly', () => {
    const a = image(),
      flat = transform(a, () => 160);
    expect(measureRefractionCorrespondence(flat, flat, regions(a)).verdict).toBe(
      'insufficient-spatial-signal'
    );
    const clipped = { ...a, data: new Uint8Array(a.data) };
    for (let at = 3; at < clipped.data.length; at += 4) clipped.data[at] = 249;
    expect(measureRefractionCorrespondence(a, clipped, regions(a)).verdict).toBe(
      'insufficient-spatial-signal'
    );
    const beyond = transform(a, (x, y, c) =>
      at(a, x - (REFRACTION_POLICY.matcher.searchRadiusCss + 12), y, c)
    );
    expect(measureRefractionCorrespondence(a, beyond, regions(a)).verdict).not.toBe(
      'resolved-nonrigid-correspondence'
    );
    expect(() => measureRefractionCorrespondence(a, { ...a, width: 1 }, regions(a))).toThrow(
      'dimensions'
    );
    expect(() => measureRefractionCorrespondence(a, a, regions(a), 0)).toThrow('dpr');
  });
  it('cannot turn blocked, interrupted, missing, or fallback native evidence into a complete report', () => {
    expect(
      summarizeRefractionCoverage(['a'], { a: { status: 'blocked', executed: false } }).status
    ).toBe('blocked-before-native-execution');
    expect(
      summarizeRefractionCoverage(['a'], { a: { status: 'passed', executed: false } }).status
    ).toBe('incomplete-native-diagnostic');
    expect(
      summarizeRefractionCoverage(['a'], { a: { status: 'passed', executed: true } }).status
    ).toBe('collected-native-diagnostic');
    expect(summarizeRefractionCoverage(['a'], {}).productAccepted).toBe(false);
  });
  it('enforces observed draw/time budgets and preserves terminal failures', () => {
    expect(refractionCollectionBudget(144, 100, 1000)).toBe(900);
    expect(() => refractionCollectionBudget(145, 100, 1000)).toThrow('draw-budget');
    expect(() => refractionCollectionBudget(0, 1000, 1000)).toThrow('12-minute');
    const completed = terminalRefractionCoverage({
      a: { status: 'running', executed: false },
      b: { status: 'not-run', executed: false },
      c: { status: 'failed', executed: true },
      d: { status: 'passed', executed: true },
    });
    expect(Object.values(completed).map((r) => r.status)).toEqual([
      'interrupted',
      'blocked',
      'failed',
      'passed',
    ]);
    expect(summarizeRefractionCoverage(['a', 'b', 'c', 'd'], completed).status).toBe(
      'incomplete-native-diagnostic'
    );
  });
  it('requires actual restored hashes and isolated source change for scripted sequence integrity', () => {
    const records = Object.fromEntries(
      REFRACTION_SEQUENCE.map((step) => [
        step.id,
        {
          status: 'collected-native-diagnostic',
          sourceSha256: step.sourceShiftRasterX ? 'shifted' : 'original',
          geometry: { width: 261 },
          sequence: step,
          captures: ['baseline', 'strict-warp-off'].map((mode) => ({
            mode,
            shaderPath: 'contact',
            uniforms: { strength: step.contact.strength },
            rawReadbackSha256: `${mode}-${step.sourceShiftRasterX}-${step.contact.strength}-${step.contact.deltaX}`,
          })),
        },
      ])
    );
    expect(summarizeRefractionSequence(records).status).toBe('complete');
    records['rest-after'].captures[0].rawReadbackSha256 = 'unrestored';
    expect(summarizeRefractionSequence(records).status).toBe('failed');
    delete (records as Record<string, unknown>)['held'];
    expect(summarizeRefractionSequence(records).status).toBe('incomplete');
    expect(summarizeRefractionSequence({}).productAccepted).toBe(false);
  });
  it('does not mutate WebGL globals, weaken safety, or declare source/component admission', () => {
    const source = readFileSync(
      'apps/www/src/content/docs/zh-cn/liquid-visible-refraction-diagnostic.ts',
      'utf8'
    );
    expect(source).not.toMatch(
      /WebGLRenderingContext\.prototype|HTMLCanvasElement\.prototype|productAccepted:\s*true/
    );
    expect(source).toContain('verifyTintStageSafety');
    expect(source).toContain('scripted-renderer-sequence');
    expect(source).toContain('sourceAdmissionProved: false');
  });
});
