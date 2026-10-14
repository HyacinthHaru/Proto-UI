/** Test-only observation. Self-contained for Playwright serialization. Freeze
 * CSS, provider receipt and owned paint synchronously; decode only that image,
 * then accept it only if the entire snapshot is still current. No input,
 * production state, provider admission or functional assertion is changed. */
export async function observeLiquidToggleSnapshot(element: Element) {
  const read = () => {
    const el = element as HTMLElement;
    const css = getComputedStyle(el),
      rect = el.getBoundingClientRect();
    const ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
    const rgba = (value: string) => {
      if (!CSS.supports('color', value)) throw new Error(`Unresolved observed color ${value}`);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const background = rgba(css.backgroundColor),
      foreground = rgba(css.color);
    const luminance = (rgb: number[]) =>
      rgb
        .slice(0, 3)
        .map((n) => n / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    const lum = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
    const carrierCss = getComputedStyle(el, '::before');
    const carrierMarker = el.getAttribute('data-pui-material-carrier');
    const materialImage =
      carrierMarker === 'contact-v1' ? carrierCss.backgroundImage : css.backgroundImage;
    const uri =
      materialImage.match(/url\(["']?(data:image\/png;base64,[^"')]+)["']?\)/)?.[1] ?? null;
    const facts = {
      active: el.getAttribute('aria-pressed'),
      disabled: el.getAttribute('aria-disabled'),
      width: rect.width,
      height: rect.height,
      radius: css.borderTopLeftRadius,
      border: [
        css.borderTopWidth,
        css.borderRightWidth,
        css.borderBottomWidth,
        css.borderLeftWidth,
      ],
      borderColor: rgba(css.borderTopColor),
      ringColor: rgba(css.getPropertyValue('--pui-ring').trim()),
      underline: css.textDecorationLine,
      shadow: css.boxShadow,
      opacity: css.opacity,
      pointerEvents: css.pointerEvents,
      background,
      foreground,
      fallbackContrast: (lum[0] + 0.05) / (lum[1] + 0.05),
      quality: el.dataset.materialQuality,
      reason: el.dataset.materialReason,
      source: el.dataset.materialSource,
      phase: el.dataset.materialPhase,
      motion: el.dataset.materialMotion,
      backdropFilter: css.backdropFilter,
      childCanvases: el.querySelectorAll('canvas').length,
      image: materialImage,
      hostImage: css.backgroundImage,
      carrier: {
        marker: carrierMarker,
        content: carrierCss.content,
        image: carrierCss.backgroundImage,
        pointerEvents: carrierCss.pointerEvents,
        zIndex: carrierCss.zIndex,
        visibility: carrierCss.visibility,
        opacity: carrierCss.opacity,
      },
      uri,
    };
    // These are existing provider commit diagnostics, not an invented render
    // revision. Copy all primitives in the same synchronous observation turn.
    const receipt = {
      frame: el.getAttribute('data-material-frame'),
      sourceRevision: el.getAttribute('data-material-source-revision'),
      contactSession: el.getAttribute('data-material-contact-session'),
      contact: el.getAttribute('data-material-contact'),
      backend: el.getAttribute('data-material-backend'),
      profile: el.getAttribute('data-material-profile'),
      ownedImage: el.style.getPropertyValue('--pui-material-image').trim(),
      styleTokens: el.getAttribute('data-pui-style'),
    };
    // Same committed-carrier criteria as observeOwnedMaterialPaint; unlike a
    // second Locator.evaluate, this receipt cannot come from a later frame.
    const outset = Math.ceil(Math.max(rect.width, rect.height) * 0.08 + 1);
    const expected = {
      left: -outset - parseFloat(css.borderLeftWidth),
      top: -outset - parseFloat(css.borderTopWidth),
      width: rect.width + 2 * outset,
      height: rect.height + 2 * outset,
    };
    const actual = {
      left: parseFloat(carrierCss.left),
      top: parseFloat(carrierCss.top),
      width: parseFloat(carrierCss.width),
      height: parseFloat(carrierCss.height),
    };
    const geometryMatches = Object.keys(expected).every((key) => {
      const name = key as keyof typeof expected;
      return Number.isFinite(actual[name]) && Math.abs(actual[name] - expected[name]) <= 1 / 64;
    });
    const committed =
      carrierMarker === 'contact-v1'
        ? facts.carrier.image === receipt.ownedImage &&
          materialImage.includes('data:image/png;base64,') &&
          geometryMatches &&
          facts.carrier.content === '\"\"' &&
          carrierCss.position === 'absolute' &&
          facts.carrier.pointerEvents === 'none' &&
          facts.carrier.zIndex === '-1' &&
          facts.carrier.visibility === 'visible' &&
          facts.carrier.opacity === '1' &&
          carrierCss.backgroundSize === '100% 100%' &&
          carrierCss.backgroundRepeat === 'no-repeat' &&
          facts.hostImage === 'none'
        : carrierMarker === null && materialImage.includes('data:image/png;base64,');
    const paint = {
      image: materialImage,
      committed,
      carrier: carrierMarker,
      geometryMatches,
      paintOutset: outset,
      hostGeometry: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      carrierGeometry: actual,
      expectedCarrierGeometry: expected,
      quality: facts.quality,
      source: facts.source,
      blur: facts.backdropFilter,
      canvas: facts.childCanvases,
      carrierPosition: carrierCss.position,
      carrierBackgroundSize: carrierCss.backgroundSize,
      carrierBackgroundRepeat: carrierCss.backgroundRepeat,
    };
    return { ...facts, receipt, paint };
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    const before = read();
    if (!before.uri)
      return {
        ...before,
        pixels: null,
        snapshot: { attempts: attempt, verifiedAfterDecode: false },
      };
    const signature = JSON.stringify(before);
    const image = new Image();
    image.src = before.uri;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failure: unknown;
    let failed = false;
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Toggle material image decode deadline')),
            1000
          );
        }),
      ]);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      clearTimeout(timer);
    }
    // CSSStyleDeclaration is live. Never reuse it after awaiting decoding;
    // compare complete immutable observations, including real commit counters.
    if (JSON.stringify(read()) !== signature) continue;
    if (failed) throw failure;
    const canvas = new OffscreenCanvas(image.width, image.height),
      paint = canvas.getContext('2d')!;
    paint.drawImage(image, 0, 0);
    const data = paint.getImageData(0, 0, image.width, image.height).data;
    const colors = new Set<string>();
    let min = 255,
      max = 0;
    for (let i = 0; i < data.length; i += 4) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      min = Math.min(min, data[i], data[i + 1], data[i + 2]);
      max = Math.max(max, data[i], data[i + 1], data[i + 2]);
    }
    return {
      ...before,
      pixels: { width: image.width, height: image.height, uniqueColors: colors.size, min, max },
      snapshot: { attempts: attempt, verifiedAfterDecode: true },
    };
  }
  throw new Error('Toggle material snapshot did not stabilize after 4 decode attempts');
}
