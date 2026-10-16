/** Test-page-only, separately owned GPU diagnostic. This neither enters nor
 * bypasses provider admission and does not replace the existing tint probe. */
import {
  createWebOpticalProgram,
  type OpticalFrame,
} from '../../../../../../packages/adapters/base/src/material/program';
import {
  colorContrast,
  type OpaqueRgba,
} from '../../../../../../packages/adapters/base/src/material/style';
import { THEME } from '../../../../../../packages/prototypes/liquid-glass/src/theme';
import {
  createLiquidToggleDetailStimulus,
  evaluateLiquidToggleDetailPair,
  LIQUID_TOGGLE_DETAIL_POLICY,
  measureLiquidToggleRefractionDifference,
  type DetailImage,
  type DetailRgb8,
  type DetailRoi,
} from './liquid-toggle-detail-metrics';

const PHASES = ['static', 'rest', 'pressed', 'release'] as const;
const CONTROLS = ['neutral', 'tinted', 'zeroRefraction'] as const;
const HOST_ROI: DetailRoi = Object.freeze({ left: 24, top: 12, right: 136, bottom: 36 });
type Phase = (typeof PHASES)[number];
type ControlName = (typeof CONTROLS)[number];
type RenderedControl = {
  status: 'rendered';
  uri: string;
  width: number;
  height: number;
  decodedSha256: string;
  contentPixels: number;
  opaqueContentPixels: number;
  minimumForegroundContrast: number;
};
type RejectedControl = {
  status: 'rejected';
  stage: 'render' | 'decode' | 'measurement';
  reason: string;
  uri?: string;
};
export type LiquidToggleDetailProbeRecord = {
  kind: 'checker' | 'bands';
  inverted: boolean;
  theme: 'light' | 'dark';
  phase: Phase;
  sourceRevision: number;
  sourceSha256: string;
  sourcePng: string;
  sourceHistogram: { dark: number; bright: number };
  sourceUnchanged: boolean;
  frameUnchanged: boolean;
  fixedTime: 0;
  geometry: OpticalFrame['geometry'];
  contact: OpticalFrame['contact'];
  hostRoi: DetailRoi;
  pixelRoi: DetailRoi;
  fill: OpaqueRgba;
  foreground: OpaqueRgba;
  expectedSourceMinimumContrast: number;
  fallbackContrast: number;
  controls: Record<ControlName, RenderedControl | RejectedControl>;
  zeroRefractionDifference: ReturnType<typeof measureLiquidToggleRefractionDifference> | null;
  zeroRefractionMeasurementError: string | null;
};
export type LiquidToggleDetailProbePair = {
  kind: 'checker' | 'bands';
  theme: 'light' | 'dark';
  phase: Phase;
  sourceRevisions: [number, number];
  sourceHashes: [string, string];
  sameSourceHistogram: boolean;
  distinctSourcePixels: boolean;
  reference: 'same-source-neutral-optical-output';
  status: 'measured' | 'blocked';
  result: ReturnType<typeof evaluateLiquidToggleDetailPair> | null;
  blockers: string[];
};

function rgba(hex: string): OpaqueRgba {
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;
  return [channel(1), channel(3), channel(5), 1];
}
async function digest(bytes: Uint8Array | Uint8ClampedArray) {
  const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function decode(uri: string): Promise<DetailImage & { data: Uint8ClampedArray }> {
  const image = new Image();
  image.src = uri;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Detail probe decode deadline')), 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  const canvas = new OffscreenCanvas(image.width, image.height),
    context = canvas.getContext('2d');
  if (!context) throw new Error('Detail probe decode context unavailable');
  context.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    data: context.getImageData(0, 0, image.width, image.height).data,
  };
}
function contentStatistics(image: DetailImage, roi: DetailRoi, foreground: OpaqueRgba) {
  if (roi.left < 0 || roi.top < 0 || roi.right > image.width || roi.bottom > image.height)
    throw new Error('Detail decoded geometry does not contain the declared ROI');
  let contentPixels = 0,
    opaqueContentPixels = 0,
    minimumForegroundContrast = Infinity;
  for (let y = roi.top; y < roi.bottom; y++)
    for (let x = roi.left; x < roi.right; x++) {
      const at = (y * image.width + x) * 4;
      contentPixels++;
      if (image.data[at + 3] !== 255) continue;
      opaqueContentPixels++;
      minimumForegroundContrast = Math.min(
        minimumForegroundContrast,
        colorContrast(
          [image.data[at] / 255, image.data[at + 1] / 255, image.data[at + 2] / 255, 1],
          foreground
        )
      );
    }
  return {
    contentPixels,
    opaqueContentPixels,
    minimumForegroundContrast: opaqueContentPixels ? minimumForegroundContrast : 0,
  };
}
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runLiquidToggleDetailProbe(host: HTMLElement) {
  host.replaceChildren();
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = 160;
  sourceCanvas.height = 48;
  sourceCanvas.setAttribute('aria-label', 'Owned coarse grayscale detail challenge');
  host.append(sourceCanvas);
  const context = sourceCanvas.getContext('2d');
  if (!context) throw new Error('Detail probe source context unavailable');
  const owners = Object.fromEntries(
    CONTROLS.map((name) => {
      const figure = document.createElement('figure'),
        caption = document.createElement('figcaption'),
        canvas = document.createElement('canvas');
      caption.textContent = `Detail-only ${name}`;
      canvas.setAttribute('aria-label', `Detail-only ${name}`);
      figure.append(caption, canvas);
      host.append(figure);
      return [
        name,
        {
          canvas,
          program: createWebOpticalProgram(
            canvas,
            name === 'zeroRefraction' ? 'zero-refraction' : null
          ),
        },
      ];
    })
  ) as Record<
    ControlName,
    { canvas: HTMLCanvasElement; program: ReturnType<typeof createWebOpticalProgram> }
  >;
  host.scrollIntoView({ block: 'start' });
  const records: LiquidToggleDetailProbeRecord[] = [];
  const decodedRecords = new Map<
    LiquidToggleDetailProbeRecord,
    Partial<Record<ControlName, DetailImage>>
  >();
  let revision = 0;
  try {
    for (const kind of ['checker', 'bands'] as const)
      for (const inverted of [false, true]) {
        const stimulus = createLiquidToggleDetailStimulus(kind, inverted, {
          width: 160,
          height: 48,
        });
        const pixels = Uint8Array.from(stimulus.data);
        context.putImageData(new ImageData(Uint8ClampedArray.from(pixels), 160, 48), 0, 0);
        const source = Object.freeze({
          revision: ++revision,
          width: 160,
          height: 48,
          pixels,
          canvas: sourceCanvas,
          scope: host,
        });
        const sourceSha256 = await digest(pixels),
          sourcePng = sourceCanvas.toDataURL('image/png');
        const sourceHistogram = { dark: 0, bright: 0 };
        for (let at = 0; at < pixels.length; at += 4)
          pixels[at] === 16 ? sourceHistogram.dark++ : sourceHistogram.bright++;
        for (const theme of ['light', 'dark'] as const)
          for (const phase of PHASES) {
            const outset = phase === 'static' ? 0 : 14;
            const pixelRoi: DetailRoi = {
              left: HOST_ROI.left + outset,
              top: HOST_ROI.top + outset,
              right: HOST_ROI.right + outset,
              bottom: HOST_ROI.bottom + outset,
            };
            const frame: OpticalFrame = {
              source,
              geometry: {
                width: 160,
                height: 48,
                radius: 24,
                dpr: 1,
                bounds: [0, 0, 1, 1],
                paintOutset: outset,
              },
              pressed: phase === 'pressed',
              variant: 'regular',
              tint: 'style-fill',
              fill: rgba(THEME[theme].primary),
              foreground: rgba(THEME[theme]['primary-foreground']),
              ...(phase === 'static'
                ? {}
                : {
                    contact: {
                      x: 0.4,
                      y: 0.6,
                      deltaX: 0.3,
                      deltaY: -0.2,
                      strength: phase === 'pressed' ? 1 : phase === 'release' ? 0.5 : 0,
                    },
                  }),
            };
            const signature = JSON.stringify({ ...frame, source: sourceSha256 });
            const controls = {} as LiquidToggleDetailProbeRecord['controls'];
            const decoded: Partial<Record<ControlName, DetailImage>> = {};
            for (const name of CONTROLS) {
              let stage: RejectedControl['stage'] = 'render',
                uri: string | undefined;
              try {
                const { tint: _tint, ...neutralFrame } = frame;
                uri = owners[name].program.render(name === 'neutral' ? neutralFrame : frame);
                stage = 'decode';
                const image = await decode(uri);
                stage = 'measurement';
                const expectedWidth = 160 + 2 * outset,
                  expectedHeight = 48 + 2 * outset;
                if (image.width !== expectedWidth || image.height !== expectedHeight)
                  throw new Error('Detail output dimensions differ from fixed geometry');
                const statistics = contentStatistics(image, pixelRoi, frame.foreground);
                controls[name] = {
                  status: 'rendered',
                  uri,
                  width: image.width,
                  height: image.height,
                  decodedSha256: await digest(image.data as Uint8ClampedArray),
                  ...statistics,
                };
                decoded[name] = image;
              } catch (error) {
                // Refusal/decode errors are retained; no placeholder reference or skipped pair.
                controls[name] = {
                  status: 'rejected',
                  stage,
                  reason: errorMessage(error),
                  ...(uri ? { uri } : {}),
                };
              }
            }
            let zeroRefractionDifference: LiquidToggleDetailProbeRecord['zeroRefractionDifference'] =
              null;
            let zeroRefractionMeasurementError: string | null = null;
            if (decoded.tinted && decoded.zeroRefraction)
              try {
                zeroRefractionDifference = measureLiquidToggleRefractionDifference(
                  decoded.tinted,
                  decoded.zeroRefraction,
                  pixelRoi
                );
              } catch (error) {
                zeroRefractionMeasurementError = errorMessage(error);
              }
            const record: LiquidToggleDetailProbeRecord = {
              kind,
              inverted,
              theme,
              phase,
              sourceRevision: source.revision,
              sourceSha256,
              sourcePng,
              sourceHistogram: { ...sourceHistogram },
              sourceUnchanged: sourceSha256 === (await digest(pixels)),
              frameUnchanged: signature === JSON.stringify({ ...frame, source: sourceSha256 }),
              fixedTime: 0,
              geometry: frame.geometry,
              contact: frame.contact,
              hostRoi: { ...HOST_ROI },
              pixelRoi,
              fill: frame.fill,
              foreground: frame.foreground,
              expectedSourceMinimumContrast: Math.min(
                ...[16, 80].map((n) =>
                  colorContrast([n / 255, n / 255, n / 255, 1], frame.foreground)
                )
              ),
              fallbackContrast: colorContrast(frame.fill, frame.foreground),
              controls,
              zeroRefractionDifference,
              zeroRefractionMeasurementError,
            };
            records.push(record);
            decodedRecords.set(record, decoded);
          }
      }
    const pairs: LiquidToggleDetailProbePair[] = [];
    for (const first of records.filter((record) => !record.inverted)) {
      const second = records.find(
        (record) =>
          record.inverted &&
          record.kind === first.kind &&
          record.theme === first.theme &&
          record.phase === first.phase
      )!;
      const a = decodedRecords.get(first)!,
        b = decodedRecords.get(second)!;
      const blockers: string[] = [];
      for (const record of [first, second]) {
        if (!record.sourceUnchanged || !record.frameUnchanged)
          blockers.push(`source-${record.sourceRevision}:input-mutated`);
        for (const name of CONTROLS) {
          const control = record.controls[name];
          if (control.status === 'rejected')
            blockers.push(
              `source-${record.sourceRevision}:${name}:${control.stage}:${control.reason}`
            );
          else if (
            control.contentPixels !== control.opaqueContentPixels ||
            control.minimumForegroundContrast < 4.5
          )
            blockers.push(
              `source-${record.sourceRevision}:${name}:inner-content-opacity-or-contrast`
            );
        }
        if (record.zeroRefractionMeasurementError)
          blockers.push(
            `source-${record.sourceRevision}:zero-refraction:${record.zeroRefractionMeasurementError}`
          );
      }
      const sameSourceHistogram =
        JSON.stringify(first.sourceHistogram) === JSON.stringify(second.sourceHistogram);
      const distinctSourcePixels = first.sourceSha256 !== second.sourceSha256;
      if (!sameSourceHistogram || !distinctSourcePixels)
        blockers.push('invalid-same-histogram-source-reorder');
      let result: LiquidToggleDetailProbePair['result'] = null;
      if (a.neutral && a.tinted && b.neutral && b.tinted)
        try {
          result = evaluateLiquidToggleDetailPair({
            first: { reference: a.neutral, output: a.tinted },
            reordered: { reference: b.neutral, output: b.tinted },
            roi: first.pixelRoi,
            foregroundSrgb8: first.foreground
              .slice(0, 3)
              .map((n) => n * 255) as unknown as DetailRgb8,
          });
        } catch (error) {
          blockers.push(`metric-evaluation:${errorMessage(error)}`);
        }
      pairs.push({
        kind: first.kind,
        theme: first.theme,
        phase: first.phase,
        sourceRevisions: [first.sourceRevision, second.sourceRevision],
        sourceHashes: [first.sourceSha256, second.sourceSha256],
        sameSourceHistogram,
        distinctSourcePixels,
        reference: 'same-source-neutral-optical-output',
        status: blockers.length ? 'blocked' : 'measured',
        result,
        blockers,
      });
    }
    const gl = owners.tinted.canvas.getContext('webgl');
    return {
      scope:
        'owned direct-GPU detail challenge; relative neutral-reference retention, not provider/runtime/native acceptance',
      policy: LIQUID_TOGGLE_DETAIL_POLICY,
      frozenInputs:
        'Four 160x48 owned 16/80 grayscale patterns; fixed geometry, contact, palette and time; only source complement, tint or zero-refraction diagnostic changes within each matched comparison.',
      referenceRegistration:
        'Same-source neutral and tinted controls share raster dimensions, bounds=[0,0,1,1], DPR=1 and phase/contact. Host ROI [24,12,136,36] is translated by the exact paint outset, with no scaling or image registration fitted to output.',
      renderAttempts: records.length * CONTROLS.length,
      records,
      pairs,
      passed:
        pairs.length === 16 &&
        pairs.every((pair) => pair.status === 'measured' && pair.result?.passed === true),
      gpu: gl
        ? {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          }
        : null,
      programMetrics: Object.fromEntries(
        CONTROLS.map((name) => [name, owners[name].program.inspect()])
      ),
    };
  } finally {
    for (const owner of Object.values(owners)) owner.program.dispose();
  }
}
