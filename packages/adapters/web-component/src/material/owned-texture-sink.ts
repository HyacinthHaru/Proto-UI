import type {
  FinalStyleFrame,
  FinalStyleSink,
} from '@proto.ui/module-feedback/internal/final-style-sink';
import type { OwnedTokenApplier } from '../feedback-style';

export type OwnedTexture = {
  generation: number;
  width: number;
  height: number;
  pixels: Uint8Array;
  /** Normalized top-left sampling bounds inside this owned texture. */
  bounds(host: HTMLElement): [number, number, number, number];
};
export type OwnedTextureSource = {
  current(): OwnedTexture | null;
  subscribe(invalidate: () => void): () => void;
};
export type MaterialProgram = {
  vertex: string;
  fragment: string;
  uniforms: readonly { name: string }[];
  writeFrame(
    gl: WebGLRenderingContext,
    locations: Record<string, WebGLUniformLocation | null>,
    frame: unknown
  ): void;
};
export type MaterialPreferences = {
  current(): {
    reducedMotion: string;
    reducedTransparency: string;
    contrast: string;
    forcedColors: string;
  };
  subscribe(invalidate: () => void): () => void;
};
const rgba = (value: unknown): value is readonly number[] =>
  Array.isArray(value) &&
  value.length === 4 &&
  value[3] === 1 &&
  [0, 1, 2, 3].every(
    (i) => Object.hasOwn(value, i) && Number.isFinite(value[i]) && value[i] >= 0 && value[i] <= 1
  );
const color = (v: readonly number[]) =>
  `rgba(${v[0] * 255}, ${v[1] * 255}, ${v[2] * 255}, ${v[3]})`;
const paint = (token: string) => /^(bg-|backdrop-|shadow)/.test(token.split(':').at(-1)!);
const relevantSelector = (token: string) =>
  token.includes(':') && /^(bg-|backdrop-|shadow|rounded|text-)/.test(token.split(':').at(-1)!);

/** Private, bounded, reusable owned-RGBA consumer. Never captures DOM or loads a URL. */
export function createOwnedTextureVisualSink(
  host: HTMLElement,
  style: OwnedTokenApplier,
  program: MaterialProgram | null,
  source: OwnedTextureSource,
  preferences: MaterialPreferences
): FinalStyleSink {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.puiMaterial = 'owned-texture';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '-1',
    display: 'none',
  });
  const saved = {
    background: host.style.background,
    position: host.style.position,
    isolation: host.style.isolation,
    color: host.style.color,
  };
  let gl: WebGLRenderingContext | null = null;
  let pipeline: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let textures: WebGLTexture[] = [];
  let locations: Record<string, WebGLUniformLocation | null> = {};
  let last: FinalStyleFrame | null = null;
  let retired = false;
  let lost = false;
  let painting = false;
  let again = false;
  let highestSource = -1;
  let paints = 0;
  let resolvedForeground: number[] | null = null;
  let observer: ResizeObserver | null = null;

  function clearDiagnostics() {
    for (const key of [
      'materialQuality',
      'materialReason',
      'materialFrame',
      'materialPhase',
      'materialRadius',
    ])
      delete host.dataset[key];
  }
  function unavailable(reason: string) {
    canvas.style.display = 'none';
    freeGPU();
    Object.assign(host.style, saved);
    if (last) style.apply([...last.style.tokens]);
    clearDiagnostics();
    host.dataset.materialQuality = 'unavailable';
    host.dataset.materialReason = reason;
  }
  const luminance = (rgb: readonly number[]) =>
    rgb
      .slice(0, 3)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a: readonly number[], b: readonly number[]) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  function fallback(reason: string) {
    canvas.style.display = 'none';
    const fill = last?.material?.config?.fallback?.fill;
    if (!rgba(fill) || !resolvedForeground || contrast(fill, resolvedForeground) < 4.5) {
      unavailable('complete-readable-fallback-unavailable');
      return;
    }
    host.style.background = color(fill);
    host.style.color = color(resolvedForeground);
    host.dataset.materialQuality = 'opaque-fallback';
    host.dataset.materialReason = reason;
    host.dataset.materialPhase =
      last?.material?.pressed && !last?.material?.disabled ? 'pressed' : 'rest';
    delete host.dataset.materialRadius;
  }
  function freeGPU() {
    if (!gl) return;
    for (const texture of textures) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (pipeline) gl.deleteProgram(pipeline);
    textures = [];
    buffer = null;
    pipeline = null;
    locations = {};
  }
  function prepareGPU() {
    if (!program) throw new Error('material-support-unavailable');
    if (lost) throw new Error('context-lost');
    if (pipeline) return;
    gl ??= canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) throw new Error('webgl-unavailable');
    const g = gl;
    const shaders: WebGLShader[] = [];
    try {
      for (const [type, text] of [
        [g.VERTEX_SHADER, program.vertex],
        [g.FRAGMENT_SHADER, program.fragment],
      ] as const) {
        const shader = g.createShader(type);
        if (!shader) throw new Error('shader-allocation');
        shaders.push(shader);
        g.shaderSource(shader, text);
        g.compileShader(shader);
        if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) throw new Error('shader-compilation');
      }
      pipeline = g.createProgram();
      if (!pipeline) throw new Error('program-allocation');
      for (const shader of shaders) g.attachShader(pipeline, shader);
      g.linkProgram(pipeline);
      if (!g.getProgramParameter(pipeline, g.LINK_STATUS)) throw new Error('program-link');
      g.useProgram(pipeline);
      locations = Object.fromEntries(
        program.uniforms.map(({ name }) => [name, g.getUniformLocation(pipeline!, name)])
      );
      buffer = g.createBuffer();
      if (!buffer) throw new Error('buffer-allocation');
      g.bindBuffer(g.ARRAY_BUFFER, buffer);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
      const attribute = g.getAttribLocation(pipeline, 'a_position');
      if (attribute < 0) throw new Error('position-attribute');
      g.enableVertexAttribArray(attribute);
      g.vertexAttribPointer(attribute, 2, g.FLOAT, false, 0, 0);
      for (let slot = 0; slot < 3; slot++) {
        const texture = g.createTexture();
        if (!texture) throw new Error('texture-allocation');
        textures.push(texture);
        g.activeTexture(g.TEXTURE0 + slot);
        g.bindTexture(g.TEXTURE_2D, texture);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.texImage2D(
          g.TEXTURE_2D,
          0,
          g.RGBA,
          1,
          1,
          0,
          g.RGBA,
          g.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 0])
        );
      }
    } catch (error) {
      freeGPU();
      throw error;
    } finally {
      for (const shader of shaders) g.deleteShader(shader);
    }
  }
  function repaint() {
    if (retired || !last) return;
    if (painting) {
      again = true;
      return;
    }
    painting = true;
    try {
      const material = last.material;
      if (!material) {
        canvas.style.display = 'none';
        style.apply([...last.style.tokens]);
        freeGPU();
        Object.assign(host.style, saved);
        clearDiagnostics();
        resolvedForeground = null;
        return;
      }
      const c = material.config;
      if (
        !c ||
        c.version !== 1 ||
        c.material?.kind !== 'refractive' ||
        c.material.variant !== 'regular' ||
        c.sampling?.kind !== 'owned-scene' ||
        c.sampling.slot !== 'scene' ||
        c.shape?.geometry !== 'style' ||
        c.shape.kind !== 'rounded-rect' ||
        !rgba(c.fallback?.fill) ||
        c.fallback?.foreground !== 'style'
      )
        throw new Error('invalid-material-declaration');
      // Remove competing Proto-owned fill before publishing fallback or enhancement.
      Object.assign(host.style, saved);
      style.apply(last.style.tokens.filter((token) => !paint(token)));
      const css = getComputedStyle(host);
      const parsed = css.color.match(
        /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/
      );
      resolvedForeground =
        parsed && (!parsed[4] || Number(parsed[4]) === 1)
          ? [Number(parsed[1]) / 255, Number(parsed[2]) / 255, Number(parsed[3]) / 255, 1]
          : null;
      if (
        !rgba(resolvedForeground) ||
        (css.opacity && Number(css.opacity) !== 1) ||
        contrast(c.fallback.fill, resolvedForeground) < 4.5
      ) {
        unavailable('complete-readable-fallback-unavailable');
        return;
      }
      fallback('preparing');
      if (css.position === 'static') host.style.position = 'relative';
      host.style.isolation = 'isolate';
      if (canvas.parentElement !== host) host.prepend(canvas);
      if (last.style.tokens.some(paint)) {
        fallback('conflicting-authored-paint');
        return;
      }
      if (last.style.tokens.some(relevantSelector)) {
        fallback('unresolved-style-provenance');
        return;
      }
      if (!material.bindingsReady) {
        fallback('material-state-unavailable');
        return;
      }
      if (!program) {
        fallback('material-support-unavailable');
        return;
      }
      const prefs = preferences.current();
      if (
        prefs.reducedMotion !== 'no-preference' ||
        prefs.reducedTransparency !== 'no-preference' ||
        prefs.contrast !== 'no-preference' ||
        prefs.forcedColors !== 'none'
      ) {
        freeGPU();
        fallback('unsafe-or-unknown-preference');
        return;
      }
      const texture = source.current();
      if (
        !texture ||
        !Number.isSafeInteger(texture.generation) ||
        texture.generation < highestSource
      ) {
        freeGPU();
        fallback('material-source-unavailable');
        return;
      }
      highestSource = texture.generation;
      if (
        !Number.isInteger(texture.width) ||
        !Number.isInteger(texture.height) ||
        texture.width < 1 ||
        texture.height < 1 ||
        texture.width > 2048 ||
        texture.height > 2048 ||
        texture.width * texture.height > 1048576 ||
        !(texture.pixels instanceof Uint8Array) ||
        texture.pixels.length !== texture.width * texture.height * 4
      ) {
        fallback('invalid-owned-source');
        return;
      }
      for (let i = 3; i < texture.pixels.length; i += 4)
        if (texture.pixels[i] !== 255) {
          fallback('source-not-opaque');
          return;
        }
      const rect = host.getBoundingClientRect();
      const radii = [
        css.borderTopLeftRadius,
        css.borderTopRightRadius,
        css.borderBottomLeftRadius,
        css.borderBottomRightRadius,
      ];
      if (
        css.transform !== 'none' ||
        !radii.every((value) => /^\d+(\.\d+)?px$/.test(value)) ||
        !radii.every((value) => value === radii[0])
      ) {
        fallback('geometry-unavailable');
        return;
      }
      const dpr = devicePixelRatio;
      const width = Math.ceil(rect.width * dpr),
        height = Math.ceil(rect.height * dpr);
      const radius = Math.min(parseFloat(radii[0]), rect.width / 2, rect.height / 2);
      if (
        ![width, height, radius, dpr].every(Number.isFinite) ||
        width < 1 ||
        height < 1 ||
        width > 2048 ||
        height > 2048 ||
        width * height > 1048576 ||
        dpr < 0.5 ||
        dpr > 3
      ) {
        fallback('geometry-budget');
        return;
      }
      const frame = {
        viewport: [width, height],
        textureSize: [texture.width, texture.height],
        bounds: texture.bounds(host),
        subpixel: [0, 0],
        boxSize: [rect.width * dpr, rect.height * dpr],
        dpr,
        radius,
        pressed: material.pressed,
        disabled: material.disabled,
      };
      prepareGPU();
      const g = gl!;
      canvas.width = width;
      canvas.height = height;
      canvas.style.borderRadius = `${radius}px`;
      g.viewport(0, 0, width, height);
      g.useProgram(pipeline);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, textures[0]);
      g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
      g.texImage2D(
        g.TEXTURE_2D,
        0,
        g.RGBA,
        texture.width,
        texture.height,
        0,
        g.RGBA,
        g.UNSIGNED_BYTE,
        texture.pixels
      );
      program.writeFrame(g, locations, frame);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.disable(g.BLEND);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      g.finish();
      if (g.getError() !== g.NO_ERROR || g.isContextLost()) throw new Error('gpu-frame-failed');
      const rendered = new Uint8Array(width * height * 4);
      g.readPixels(0, 0, width, height, g.RGBA, g.UNSIGNED_BYTE, rendered);
      if (g.getError() !== g.NO_ERROR) throw new Error('gpu-readback-failed');
      for (let i = 0; i < rendered.length; i += 4)
        if (
          rendered[i + 3] >= 250 &&
          contrast(
            [rendered[i] / 255, rendered[i + 1] / 255, rendered[i + 2] / 255, 1],
            resolvedForeground!
          ) < 4.5
        ) {
          fallback('rendered-contrast-unsafe');
          return;
        }
      if (source.current() !== texture) {
        fallback('source-replaced-during-frame');
        return;
      }
      host.style.background = 'transparent';
      canvas.style.display = 'block';
      host.dataset.materialQuality = 'experimental-owned-texture';
      host.dataset.materialReason = 'rendered';
      host.dataset.materialFrame = String(++paints);
      host.dataset.materialPhase = material.pressed && !material.disabled ? 'pressed' : 'rest';
      host.dataset.materialRadius = String(radius);
    } catch (error) {
      freeGPU();
      fallback(error instanceof Error ? error.message : 'material-frame-failed');
    } finally {
      painting = false;
      if (again) {
        again = false;
        repaint();
      }
    }
  }
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    freeGPU();
    fallback('context-lost');
  };
  const onRestored = () => {
    lost = false;
    repaint();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  const offSource = source.subscribe(repaint),
    offPreferences = preferences.subscribe(repaint);
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(repaint);
    observer.observe(host);
  }
  return {
    commit(frame) {
      if (retired) throw new Error('Retired material visual sink');
      if (last && (frame.view < last.view || frame.revision <= last.revision))
        throw new Error('Stale final style frame');
      last = frame;
      repaint();
    },
    release() {
      if (retired) return;
      retired = true;
      offSource();
      offPreferences();
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      freeGPU();
      canvas.remove();
      style.clear();
      Object.assign(host.style, saved);
      delete host.dataset.materialQuality;
      delete host.dataset.materialReason;
      delete host.dataset.materialFrame;
      delete host.dataset.materialPhase;
      delete host.dataset.materialRadius;
      last = null;
    },
  };
}

/** Generic WC consumes a declared slot conservatively when no GPU provider is installed. */
export function createOpaqueMaterialVisualSink(
  host: HTMLElement,
  style: OwnedTokenApplier
): FinalStyleSink {
  return createOwnedTextureVisualSink(
    host,
    style,
    null,
    { current: () => null, subscribe: () => () => {} },
    {
      current: () => ({
        reducedMotion: 'unknown',
        reducedTransparency: 'unknown',
        contrast: 'unknown',
        forcedColors: 'unknown',
      }),
      subscribe: () => () => {},
    }
  );
}
