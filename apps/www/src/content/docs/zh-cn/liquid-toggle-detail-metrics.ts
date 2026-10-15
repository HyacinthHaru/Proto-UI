/** Pure first-party diagnostic arithmetic, not native/GPU acceptance.
 * Policy was recorded before implementation in
 * internal/records/2026-10-15-liquid-toggle-detail-acceptance.md.
 * References MUST already share output geometry (including refraction/blur).
 * Pass a text-free, opaque inner-material ROI, never a screenshot with labels.
 */
export type DetailImage = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};
export type DetailRoi = { left: number; top: number; right: number; bottom: number };
export type DetailRgb8 = readonly [number, number, number];
export type DetailFrame = { reference: DetailImage; output: DetailImage };

export const LIQUID_TOGGLE_DETAIL_POLICY = Object.freeze({
  version: 'inner-content-detail-1',
  cellSize: 4,
  minimumCells: 16,
  minimumLumaSpan: 8,
  minimumSpatialCorrelation: 0.7,
  minimumGradientCosine: 0.6,
  minimumDeltaRms: 4,
  minimumDeltaCorrelation: 0.7,
  changedCellLuma: 4,
  minimumChangedFraction: 0.25,
  minimumContrast: 4.5,
});

const weights = [0.2126, 0.7152, 0.0722] as const;
const mean = (values: readonly number[]) => values.reduce((sum, n) => sum + n, 0) / values.length;
const rms = (values: readonly number[]) => Math.sqrt(mean(values.map((n) => n * n)));
function linear(code: number) {
  const value = code / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function luma(data: ArrayLike<number>, at: number, linearLight = false) {
  return weights.reduce(
    (sum, weight, channel) =>
      sum + weight * (linearLight ? linear(data[at + channel]) : data[at + channel]),
    0
  );
}
function cosine(a: readonly number[], b: readonly number[]) {
  const norm = Math.sqrt(
    a.reduce((sum, n) => sum + n * n, 0) * b.reduce((sum, n) => sum + n * n, 0)
  );
  return norm < 1e-12
    ? 0
    : Math.max(-1, Math.min(1, a.reduce((sum, n, i) => sum + n * b[i], 0) / norm));
}
function correlation(a: readonly number[], b: readonly number[]) {
  const centerA = mean(a),
    centerB = mean(b);
  return cosine(
    a.map((n) => n - centerA),
    b.map((n) => n - centerB)
  );
}
function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b),
    index = (sorted.length - 1) * fraction;
  const low = Math.floor(index),
    high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}
function gradients(values: readonly number[], columns: number) {
  const result: number[] = [];
  for (let at = 0; at < values.length; at++) {
    if ((at + 1) % columns) result.push(values[at + 1] - values[at]);
    if (at + columns < values.length) result.push(values[at + columns] - values[at]);
  }
  return result;
}
function checkImage(image: DetailImage, roi: DetailRoi, cellSize: number) {
  const { width, height, data } = image;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    data.length !== width * height * 4
  )
    throw new Error('Detail image must be a complete RGBA raster');
  if (
    !Object.values(roi).every(Number.isInteger) ||
    roi.left < 0 ||
    roi.top < 0 ||
    roi.right > width ||
    roi.bottom > height ||
    roi.right <= roi.left ||
    roi.bottom <= roi.top
  )
    throw new Error('Detail ROI must be a nonempty in-bounds integer rectangle');
  if (
    !Number.isInteger(cellSize) ||
    cellSize < 1 ||
    (roi.right - roi.left) % cellSize ||
    (roi.bottom - roi.top) % cellSize
  )
    throw new Error('Detail ROI must contain whole cells at the declared raster scale');
  if (
    ((roi.right - roi.left) * (roi.bottom - roi.top)) / cellSize ** 2 <
    LIQUID_TOGGLE_DETAIL_POLICY.minimumCells
  )
    throw new Error('Detail ROI has too few cells');
}
function sample(image: DetailImage, roi: DetailRoi, cellSize: number, foreground?: DetailRgb8) {
  checkImage(image, roi, cellSize);
  const values: number[] = [];
  let opaque = true,
    minimumContrast = Infinity;
  const foregroundLuminance = foreground ? luma(foreground, 0, true) : 0;
  for (let y = roi.top; y < roi.bottom; y += cellSize)
    for (let x = roi.left; x < roi.right; x += cellSize) {
      let sum = 0;
      for (let dy = 0; dy < cellSize; dy++)
        for (let dx = 0; dx < cellSize; dx++) {
          const at = ((y + dy) * image.width + x + dx) * 4;
          for (let channel = 0; channel < 4; channel++)
            if (
              !Number.isFinite(image.data[at + channel]) ||
              image.data[at + channel] < 0 ||
              image.data[at + channel] > 255
            )
              throw new Error('Detail ROI contains invalid channel data');
          opaque &&= image.data[at + 3] === 255;
          sum += luma(image.data, at);
          if (foreground) {
            const background = luma(image.data, at, true);
            minimumContrast = Math.min(
              minimumContrast,
              (Math.max(background, foregroundLuminance) + 0.05) /
                (Math.min(background, foregroundLuminance) + 0.05)
            );
          }
        }
      values.push(sum / cellSize ** 2);
    }
  return { values, opaque, minimumContrast, columns: (roi.right - roi.left) / cellSize };
}
function checkSameGeometry(images: DetailImage[]) {
  if (images.some((image) => image.width !== images[0].width || image.height !== images[0].height))
    throw new Error('Detail references must be registered to identical output raster geometry');
}
function frameMetrics(reference: ReturnType<typeof sample>, output: ReturnType<typeof sample>) {
  const outputMean = mean(output.values);
  return {
    sourceLumaSpan: percentile(reference.values, 0.9) - percentile(reference.values, 0.1),
    outputLumaSpan: percentile(output.values, 0.9) - percentile(output.values, 0.1),
    outputLumaStdDev: rms(output.values.map((n) => n - outputMean)),
    spatialCorrelation: correlation(reference.values, output.values),
    gradientCosine: cosine(
      gradients(reference.values, reference.columns),
      gradients(output.values, output.columns)
    ),
    fullyOpaque: reference.opaque && output.opaque,
    minimumForegroundContrast: output.minimumContrast,
  };
}

/** Inputs are two captures of an equal-histogram spatially reordered source.
 * The caller retains source bytes/hashes, reference provenance and geometry.
 * Thresholds cannot be supplied by the renderer under test. cellSize only scales
 * the documented four-CSS-pixel cells for a predeclared capture pixel ratio.
 */
export function evaluateLiquidToggleDetailPair(input: {
  first: DetailFrame;
  reordered: DetailFrame;
  roi: DetailRoi;
  foregroundSrgb8: DetailRgb8;
  cellSize?: number;
}) {
  const { first, reordered, roi, foregroundSrgb8 } = input;
  if (
    foregroundSrgb8.length !== 3 ||
    foregroundSrgb8.some((n) => !Number.isFinite(n) || n < 0 || n > 255)
  )
    throw new Error('Detail foreground must have three finite 8-bit sRGB channels');
  const policy = LIQUID_TOGGLE_DETAIL_POLICY,
    cellSize = input.cellSize ?? policy.cellSize;
  checkSameGeometry([first.reference, first.output, reordered.reference, reordered.output]);
  const references = [first.reference, reordered.reference].map((image) =>
    sample(image, roi, cellSize)
  );
  const outputs = [first.output, reordered.output].map((image) =>
    sample(image, roi, cellSize, foregroundSrgb8)
  );
  const frames = outputs.map((output, index) => frameMetrics(references[index], output));
  const sourceDelta = references[1].values.map((n, i) => n - references[0].values[i]);
  const outputDelta = outputs[1].values.map((n, i) => n - outputs[0].values[i]);
  const pair = {
    outputDeltaRms: rms(outputDelta),
    deltaCorrelation: correlation(sourceDelta, outputDelta),
    changedCellFraction:
      outputDelta.filter((n) => Math.abs(n) >= policy.changedCellLuma).length / outputDelta.length,
  };
  const failures: string[] = [];
  frames.forEach((frame, index) => {
    if (!frame.fullyOpaque) failures.push(`frame-${index}:nonopaque-roi`);
    if (frame.outputLumaSpan < policy.minimumLumaSpan)
      failures.push(`frame-${index}:insufficient-detail-amplitude`);
    if (frame.spatialCorrelation < policy.minimumSpatialCorrelation)
      failures.push(`frame-${index}:unrelated-spatial-structure`);
    if (frame.gradientCosine < policy.minimumGradientCosine)
      failures.push(`frame-${index}:unrelated-spatial-gradients`);
    if (frame.minimumForegroundContrast < policy.minimumContrast)
      failures.push(`frame-${index}:foreground-contrast`);
  });
  if (pair.outputDeltaRms < policy.minimumDeltaRms)
    failures.push('pair:insufficient-source-response');
  if (pair.deltaCorrelation < policy.minimumDeltaCorrelation)
    failures.push('pair:unrelated-source-response');
  if (pair.changedCellFraction < policy.minimumChangedFraction)
    failures.push('pair:insufficient-changed-area');
  return {
    policy: policy.version,
    roi: { ...roi },
    cellSize,
    cellCount: outputDelta.length,
    frames,
    pair,
    failures,
    passed: failures.length === 0,
    evidenceScope: 'pure-inner-content-engineering-diagnostic' as const,
  };
}

/** Supplementary observation only. Existing optical gates remain required. */
export function measureLiquidToggleRefractionDifference(
  output: DetailImage,
  zeroRefraction: DetailImage,
  roi: DetailRoi,
  cellSize = LIQUID_TOGGLE_DETAIL_POLICY.cellSize
) {
  checkSameGeometry([output, zeroRefraction]);
  const rendered = sample(output, roi, cellSize),
    zero = sample(zeroRefraction, roi, cellSize);
  const delta = rendered.values.map((n, i) => n - zero.values[i]);
  return {
    fullyOpaque: rendered.opaque && zero.opaque,
    lumaRms: rms(delta),
    meanAbsoluteLumaDifference: mean(delta.map(Math.abs)),
    changedCellFractionAtOneCode: delta.filter((n) => Math.abs(n) >= 1).length / delta.length,
  };
}

/** Owned, deterministic coarse challenges. The browser maps these source bytes
 * into its known source box and separately retains the registered reference. */
export function createLiquidToggleDetailStimulus(
  kind: 'checker' | 'bands',
  inverted = false,
  dimensions = { width: 128, height: 64 }
): DetailImage {
  const { width, height } = dimensions,
    tile = 16;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 32 ||
    width > 1024 ||
    height < 16 ||
    height > 1024 ||
    width % (2 * tile) ||
    height % tile
  )
    throw new Error('Detail stimulus needs balanced 16-pixel tiles within a 1024px budget');
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const high =
        (Math.floor(x / tile) + (kind === 'checker' ? Math.floor(y / tile) : 0)) % 2 !==
        Number(inverted);
      const level = high ? 80 : 16;
      data.set([level, level, level, 255], (y * width + x) * 4);
    }
  return { width, height, data };
}
