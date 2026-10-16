import { observeLiquidToggleSnapshot } from './liquid-toggle-snapshot';
import {
  prominentTintCells,
  verifyProminentTintBinding,
  prominentTintRasterGeometry,
  assertProminentTintRaster,
} from './liquid-prominent-tint-metrics';
import type { createPreviewMaterialScene } from '../../../components/PrototypePreviewer/preview-material-scene';
export async function decodeProminentTintPng(
  uri: string,
  registration?: ReturnType<typeof prominentTintRasterGeometry>
) {
  const image = new Image();
  image.src = uri;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  const result = {
    width: image.width,
    height: image.height,
    data: Array.from(context.getImageData(0, 0, image.width, image.height).data),
  };
  if (registration) assertProminentTintRaster(result, registration);
  return result;
}
export async function captureProminentTintFrame(
  element: HTMLElement,
  scene: ReturnType<typeof createPreviewMaterialScene>
) {
  const frozenSource = scene.lease.current();
  const snapshot = await observeLiquidToggleSnapshot(element);
  const rect = element.getBoundingClientRect(),
    sourceRect = scene.lease.current()?.canvas.getBoundingClientRect();
  const frame = scene.lease.current();
  const raster = prominentTintRasterGeometry({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  });
  const canvas = document.createElement('canvas');
  canvas.width = raster.clip.width;
  canvas.height = raster.clip.height;
  const context = canvas.getContext('2d')!;
  const boxes = Array.from(element.querySelectorAll<HTMLElement>('[data-tint-foreground],svg'))
    .map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x - rect.x, y: box.y - rect.y, width: box.width, height: box.height };
    })
    .filter((box) => box.width > 0 && box.height > 0);
  const cells = prominentTintCells(rect.width, rect.height, boxes, raster.hostOffset);
  // Predetermined 1 CSS px registration, no post-hoc image fitting. Each
  // control retains its own actual source crop; Reset and Submit may differ.
  if (frame && sourceRect)
    context.drawImage(
      frame.canvas,
      ((raster.clip.x - sourceRect.x) * frame.width) / sourceRect.width,
      ((raster.clip.y - sourceRect.y) * frame.height) / sourceRect.height,
      (raster.clip.width * frame.width) / sourceRect.width,
      (raster.clip.height * frame.height) / sourceRect.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  const sourceCrop = frame
    ? {
        width: canvas.width,
        height: canvas.height,
        data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data),
        png: canvas.toDataURL('image/png'),
      }
    : null;
  const source = frame
    ? {
        revision: frame.revision,
        width: frame.width,
        height: frame.height,
        png: frame.canvas.toDataURL('image/png'),
        rect: {
          x: sourceRect!.x,
          y: sourceRect!.y,
          width: sourceRect!.width,
          height: sourceRect!.height,
        },
        crop: {
          x: raster.clip.x - sourceRect!.x,
          y: raster.clip.y - sourceRect!.y,
          width: raster.clip.width,
          height: raster.clip.height,
        },
        pixelSha256: Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(frame.pixels))),
          (n) => n.toString(16).padStart(2, '0')
        ).join(''),
      }
    : null;
  let material: null | (Awaited<ReturnType<typeof decodeProminentTintPng>> & { png: string }) =
    null;
  if (snapshot.uri) {
    const image = new Image();
    image.src = snapshot.uri;
    await image.decode();
    const outset = snapshot.carrier.marker === 'contact-v1' ? snapshot.paint.paintOutset : 0;
    const sx = image.width / (rect.width + 2 * outset),
      sy = image.height / (rect.height + 2 * outset);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      (outset - raster.hostOffset.x) * sx,
      (outset - raster.hostOffset.y) * sy,
      raster.clip.width * sx,
      raster.clip.height * sy,
      0,
      0,
      canvas.width,
      canvas.height
    );
    material = {
      width: canvas.width,
      height: canvas.height,
      data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data),
      png: canvas.toDataURL('image/png'),
    };
  }
  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const maskContext = mask.getContext('2d')!;
  maskContext.fillStyle = 'white';
  for (const cell of cells) maskContext.fillRect(cell.x, cell.y, cell.width, cell.height);
  const maskPng = mask.toDataURL('image/png');
  const roi = document.createElement('canvas');
  roi.width = canvas.width;
  roi.height = canvas.height;
  const roiContext = roi.getContext('2d')!;
  if (material)
    for (const cell of cells)
      roiContext.drawImage(
        canvas,
        cell.x,
        cell.y,
        cell.width,
        cell.height,
        cell.x,
        cell.y,
        cell.width,
        cell.height
      );
  const roiPng = material ? roi.toDataURL('image/png') : null;
  const after = await observeLiquidToggleSnapshot(element);
  const binding = verifyProminentTintBinding({
    optical: snapshot.quality === 'self-optical',
    sourceRevision: frame?.revision ?? null,
    committedSourceRevision: snapshot.receipt.sourceRevision,
    sourceStillCurrent: frozenSource === frame && frame === scene.lease.current(),
    paintCommitted: snapshot.paint.committed,
    snapshotStable:
      JSON.stringify(snapshot.receipt) === JSON.stringify(after.receipt) &&
      snapshot.image === after.image &&
      snapshot.phase === after.phase &&
      JSON.stringify(snapshot.foreground) === JSON.stringify(after.foreground) &&
      JSON.stringify(snapshot.palette) === JSON.stringify(after.palette),
    geometryStable:
      JSON.stringify(snapshot.paint.hostGeometry) === JSON.stringify(after.paint.hostGeometry) &&
      JSON.stringify(snapshot.paint.carrierGeometry) ===
        JSON.stringify(after.paint.carrierGeometry),
  });
  const css = getComputedStyle(element);
  return {
    snapshot,
    raster,
    source,
    sourceCrop,
    material,
    binding,
    maskPng,
    roiPng,
    cells,
    exclusions: boxes,
    geometry: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    foregroundColors: Array.from(
      element.querySelectorAll<HTMLElement>('[data-tint-foreground],svg')
    ).map((node) => getComputedStyle(node).color),
    foregroundMatchesHost: Array.from(
      element.querySelectorAll<HTMLElement>('[data-tint-foreground],svg')
    ).every((node) => getComputedStyle(node).color === css.color),
    foregroundBackingContrast:
      snapshot.pixels?.content.minForegroundContrast ?? snapshot.fallbackContrast,
    contrastRoi: snapshot.contentBox,
    structureRoi:
      'whole 4-CSS-pixel capsule-interior cells minus actual foreground bounds and one CSS pixel',
    raw: {
      role: element.getAttribute('role'),
      name: element.textContent,
      ariaPressed: element.getAttribute('aria-pressed'),
      ariaDisabled: element.getAttribute('aria-disabled'),
      activeElement: document.activeElement === element,
      outline: { style: css.outlineStyle, width: css.outlineWidth, color: css.outlineColor },
      ringWidth: css.getPropertyValue('--pui-ring-width').trim(),
    },
    sourceStillCurrent: frame === scene.lease.current(),
    capturedAt: performance.now(),
  };
}
