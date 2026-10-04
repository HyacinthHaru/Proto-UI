// Reviewed, source-bound interface facts for the two inspection recipes.
// This module never reads scenario JSON or accepts caller-provided fact tables.
// Updating a source revision requires a separate source audit of this registry.
const studioSource = (path, gitBlob) => ({
  repo: 'iyinchao/liquid-glass-studio',
  commit: 'f7b28c36305a862f5cffed3ddd51511cf1204f56',
  path,
  gitBlob,
});
const flutterSource = (path, gitBlob) => ({
  repo: 'sdegenaar/liquid_glass_widgets',
  commit: 'c35d7e115a52e05389dd8d98c6b32d4582931c33',
  path,
  gitBlob,
});

// Source-derived declarations, independently extracted from hash-verified shader blobs.
const STUDIO_MAIN_FIELDS = [
  ['u_resolution', 'vec2f', 0, 8],
  ['u_dpr', 'f32', 8, 4],
  ['_pad0', 'f32', 12, 4],
  ['u_mouse', 'vec2f', 16, 8],
  ['u_mouseSpring', 'vec2f', 24, 8],
  ['u_shapeWidth', 'f32', 32, 4],
  ['u_shapeHeight', 'f32', 36, 4],
  ['u_shapeRadius', 'f32', 40, 4],
  ['u_shapeRoundness', 'f32', 44, 4],
  ['u_mergeRate', 'f32', 48, 4],
  ['u_glareAngle', 'f32', 52, 4],
  ['u_shadowExpand', 'f32', 56, 4],
  ['u_shadowFactor', 'f32', 60, 4],
  ['u_shadowPosition', 'vec2f', 64, 8],
  ['u_bgTextureRatio', 'f32', 72, 4],
  ['u_bgType', 'i32', 76, 4],
  ['u_bgTextureReady', 'i32', 80, 4],
  ['u_showShape1', 'i32', 84, 4],
  ['u_blurRadius', 'i32', 88, 4],
  ['u_blurEdge', 'i32', 92, 4],
  ['u_tint', 'vec4f', 96, 16],
  ['u_refThickness', 'f32', 112, 4],
  ['u_refFactor', 'f32', 116, 4],
  ['u_refDispersion', 'f32', 120, 4],
  ['u_refFresnelRange', 'f32', 124, 4],
  ['u_refFresnelHardness', 'f32', 128, 4],
  ['u_refFresnelFactor', 'f32', 132, 4],
  ['u_glareRange', 'f32', 136, 4],
  ['u_glareHardness', 'f32', 140, 4],
  ['u_glareConvergence', 'f32', 144, 4],
  ['u_glareOppositeFactor', 'f32', 148, 4],
  ['u_glareFactor', 'f32', 152, 4],
  ['u_refDistance', 'f32', 156, 4],
];

const STUDIO_BLUR_FIELDS = [
  ['u_resolution', 'vec2f', 0, 8],
  ['u_blurRadius', 'i32', 8, 4],
  ['_pad', 'i32', 12, 4],
];

const FLUTTER_GEOMETRY_FIELDS = [
  ['uSize', 'vec2<f32>', 0, 2],
  ['uOpticalProps', 'vec4<f32>', 2, 4],
  ['uShapeSettings', 'vec2<f32>', 6, 2],
  ['uShapeData', 'f32', 8, 112, 112],
  ['uNativeEdge', 'f32', 120, 1],
];

const FLUTTER_RENDER_FIELDS = [
  ['uSize', 'vec2<f32>', 0, 2],
  ['uGeometryOffset', 'vec2<f32>', 2, 2],
  ['uGeometrySize', 'vec2<f32>', 4, 2],
  ['uGlassColor', 'vec4<f32>', 6, 4],
  ['uOpticalProps', 'vec4<f32>', 10, 4],
  ['uLightConfig', 'vec3<f32>', 14, 3],
  ['uLightDirection', 'vec2<f32>', 17, 2],
  ['uWhiten', 'f32', 19, 1],
  ['uWhitenGated', 'f32', 20, 1],
  ['uPinchStrength', 'f32', 21, 1],
  ['uBackgroundFallback', 'vec4<f32>', 22, 4],
  ['uCaptureOffset', 'vec2<f32>', 26, 2],
  ['uEdgeConfig', 'vec4<f32>', 28, 4],
  ['uPlatformViewMode', 'f32', 32, 1],
  ['uBodyMode', 'f32', 33, 1],
  ['uTouchPosition', 'vec2<f32>', 34, 2],
  ['uTouchIntensity', 'f32', 36, 1],
  ['uRimConfig', 'vec3<f32>', 37, 3],
  ['uLensModel', 'f32', 40, 1],
  ['uFrost', 'vec4<f32>', 41, 4],
];

function packedBlock(id, bytes, rows) {
  return {
    id,
    abi: 'wgsl-uniform-buffer',
    bytes,
    fields: rows.map(([name, type, offset, bytes]) => ({ name, type, offset, bytes })),
  };
}
function reflectedBlock(id, floatSlotCount, rows) {
  return {
    id,
    abi: 'flutter-reflected-float-slots',
    floatSlotCount,
    fields: rows.map(([name, type, start, size, count]) => ({
      name,
      type,
      ...(count === undefined ? {} : { count }),
      floatSlotRange: { start, count: size },
      // These semantic producer names are the pinned recipe's input roles,
      // not a claim that a runtime provider exists or has executed.
      binding:
        id === 'render' && name === 'uSize'
          ? { kind: 'host-injected', id: 'ImageFilter.shader.inputSize', floatSlots: [0, 1] }
          : id === 'render' && ['uCaptureOffset', 'uFrost'].includes(name)
            ? { kind: 'constant', value: Array(size).fill(0) }
            : { kind: 'frame-value', id: name },
    })),
  };
}
const texture = (name, resource, resourceKind) => ({
  name,
  ownership: 'application-bound',
  resource,
  resourceKind,
});
const studioKernel = (id, path, blob, block, samplers, dataBindings = []) => ({
  id,
  upstream: studioSource(path, blob),
  license: ['bg', 'main'].includes(id) ? 'blocked-IQ-transitive-provenance' : 'MIT-chain-review',
  execution: 'not-admitted',
  entryPoint: 'fs_main',
  stage: 'fragment',
  targetProfile: 'webgpu-wgsl-fragment',
  samplerBinding: 'named',
  uniformBlocks: [block],
  samplers,
  dataBindings,
});
const flutterKernel = (id, path, blob, profile, samplers) => ({
  id,
  upstream: flutterSource(path, blob),
  license: 'MIT-Tim-Lehmann-and-Sebastian-Degenaar-notices-required',
  execution: 'not-admitted',
  entryPoint: 'main',
  stage: 'fragment',
  targetProfile: profile,
  samplerBinding: 'indexed',
  uniformBlocks: [id],
  samplers,
  dataBindings: [],
});
const flutterBlocks = [
  reflectedBlock('geometry', 121, FLUTTER_GEOMETRY_FIELDS),
  reflectedBlock('render', 45, FLUTTER_RENDER_FIELDS),
];
function flutterFrameInputs() {
  const values = new Map();
  for (const block of flutterBlocks)
    for (const field of block.fields)
      if (field.binding.kind === 'frame-value')
        values.set(field.binding.id, {
          id: field.binding.id,
          type: field.type,
          ...(field.count === undefined ? {} : { count: field.count }),
          owner: 'application-frame-state',
        });
  return [
    {
      id: 'matte-dpr',
      type: 'f32',
      owner: 'adapter-geometry-budget',
      range: 'finite-positive-target-bounded',
    },
    {
      id: 'geometry-pixel-budget',
      type: 'u32',
      owner: 'adapter-resource-budget',
      range: 'finite-positive-target-bounded',
    },
    {
      id: 'geometry-local-bounds',
      type: 'rect<f32>',
      space: 'group-local-logical-pixels',
      owner: 'layout',
    },
    {
      id: 'matte-transform',
      type: 'mat4<f32>',
      from: 'group-local-logical-pixels',
      to: 'screen-logical-pixels',
      owner: 'adapter-layout',
    },
    {
      id: 'enclosing-filter-pass-rect',
      type: 'rect<f32>',
      space: 'screen-physical-pixels',
      owner: 'host-compositor',
    },
    { id: 'screen-device-pixel-ratio', type: 'f32', owner: 'view', distinctFrom: 'matte-dpr' },
    ...values.values(),
  ];
}

const registry = {
  'studio-f7b28c3-four-pass-v1': {
    evidenceSources: [
      studioSource('src/App.tsx', 'dd1c0ee0b9377699fd1e212d1b1c06d59cf57042'),
      studioSource('src/utils/GPUUtils.ts', '1effd7c0c4f162ecd2233bb0c3976de33d61698e'),
    ],
    declarationViews: {
      // GPUUtils writes the shared host buffer using the main ABI. Background
      // declares the last, unused f32 as padding; it has the same byte layout.
      backgroundFinalField: { block: 'main', name: '_pad1', offset: 156, bytes: 4, unused: true },
    },
    assertions: {
      kernels: [
        studioKernel(
          'bg',
          'src/shaders-wgsl/fragment-bg.wgsl',
          'f84212a1aa4e3687fd404218fdd197cce18b2080',
          'main',
          [
            {
              ...texture('u_bgTexture', 'media', 'application-texture'),
              sourceKinds: ['owned-image', 'owned-video-frame'],
            },
          ]
        ),
        studioKernel(
          'blur-v',
          'src/shaders-wgsl/fragment-bg-vblur.wgsl',
          'eabd5091ad5f6166673c01173bad2f2629cadfea',
          'blur',
          [texture('u_prevPassTexture', 'background', 'color-texture')],
          [{ name: 'u_blurWeights', type: 'bounded-array<f32>' }]
        ),
        studioKernel(
          'blur-h',
          'src/shaders-wgsl/fragment-bg-hblur.wgsl',
          'b35758ed6498b3b42d81fd6063b292e6e5a6f603',
          'blur',
          [texture('u_prevPassTexture', 'vertical-blur', 'color-texture')],
          [{ name: 'u_blurWeights', type: 'bounded-array<f32>' }]
        ),
        studioKernel(
          'main',
          'src/shaders-wgsl/fragment-main.wgsl',
          '9063a39f000fcb0fd69848dc4c3e51618f0dc3da',
          'main',
          [
            texture('u_bg', 'background', 'color-texture'),
            texture('u_blurredBg', 'blurred', 'color-texture'),
          ]
        ),
      ],
      uniformBlocks: [
        packedBlock('main', 160, STUDIO_MAIN_FIELDS),
        packedBlock('blur', 16, STUDIO_BLUR_FIELDS),
      ],
      sources: [
        {
          id: 'media',
          kind: 'application-texture',
          format: 'rgba8unorm',
          space: 'normalized-uv',
          freshness: 'provider-frame',
        },
      ],
      resources: ['background', 'vertical-blur', 'blurred'].map((id) => ({
        id,
        kind: 'color-texture',
        format: 'rgba16float',
        filter: 'linear',
        wrap: 'clamp-to-edge',
        space: 'normalized-uv',
        usages: ['render-attachment', 'texture-binding'],
      })),
    },
  },
  'flutter-c35d7e1-live-v1': {
    evidenceSources: [
      flutterSource(
        'lib/src/engine/rendering/liquid_glass_render_object.dart',
        'a6e5a7f20e8c717e76f57ad6e0650602ce99235e'
      ),
      flutterSource(
        'lib/src/engine/render_liquid_glass_geometry.dart',
        '1dc6d3e807604bcedcde717d2c1ae18bd8e7f596'
      ),
      flutterSource(
        'lib/src/renderer/fragment_shader_extensions.dart',
        '2c8848abf42f9da668c8c32606e1e6f5b300988d'
      ),
    ],
    assertions: {
      kernels: [
        flutterKernel(
          'geometry',
          'shaders/liquid_glass_geometry_blended.frag',
          '3d9457df92f56079d48846613ba3df7ca4c18aa0',
          'flutter-fragment',
          []
        ),
        flutterKernel(
          'render',
          'shaders/liquid_glass_render.frag',
          '03b27d53d670b6642fdbf92783175d5e96c9155d',
          'flutter-impeller-image-filter',
          [
            {
              name: 'uBackgroundTexture',
              ownership: 'host-injected',
              slot: 0,
              sourceKind: 'host-compositor-backdrop',
              resource: 'backdrop',
            },
            { ...texture('uGeometryTexture', 'geometry', 'data-texture'), slot: 1 },
          ]
        ),
      ],
      uniformBlocks: flutterBlocks,
      frameInputs: flutterFrameInputs(),
      sources: [
        {
          id: 'backdrop',
          kind: 'host-compositor-backdrop',
          provider: 'flutter-impeller-ImageFilter.shader',
          format: 'host-managed',
          space: 'filter-local-physical-pixels',
          alpha: 'host-premultiplied',
          freshness: 'compositor-frame',
          reservedSampler: 0,
        },
      ],
      resources: [
        {
          id: 'geometry',
          kind: 'data-texture',
          format: 'host-managed-ui-image',
          filter: 'Flutter-FilterQuality.medium',
          wrap: 'shader-clamp-0-1',
          space: 'geometry-local-pixels',
          extent: {
            basis: 'geometry-local-bounds',
            policy: 'budgeted-matte',
            dprBinding: 'matte-dpr',
            pixelBudgetBinding: 'geometry-pixel-budget',
            marginLogicalPixels: 2,
          },
        },
      ],
    },
  },
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
deepFreeze(registry);

// There is no injection/registration API. The caller receives a recursively
// frozen view, never authority derived from its own scenario declarations.
export function getInterfaceFacts(id) {
  return typeof id === 'string' && Object.hasOwn(registry, id) ? registry[id] : undefined;
}

// Compare only reviewed interface facts; descriptive scenario prose and genuine
// scene choices remain outside this source-fidelity layer. Named collections are
// matched by identity, while positional/scalar arrays retain their ordering.
export function inspectInterfaceFacts(graph) {
  const facts = getInterfaceFacts(graph?.interfaceId);
  if (!facts) return [{ code: 'unknown-source-interface', detail: graph?.interfaceId }];
  const mismatches = [];
  function compare(actual, expected, path) {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) {
        mismatches.push(path);
        return;
      }
      const key =
        expected.length &&
        expected.every(
          (entry) => entry && typeof entry === 'object' && typeof entry.id === 'string'
        )
          ? 'id'
          : expected.length &&
              expected.every(
                (entry) => entry && typeof entry === 'object' && typeof entry.name === 'string'
              )
            ? 'name'
            : null;
      for (const [index, entry] of expected.entries())
        compare(
          key ? actual.find((value) => value?.[key] === entry[key]) : actual[index],
          entry,
          `${path}.${key ? entry[key] : index}`
        );
    } else if (expected && typeof expected === 'object') {
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) mismatches.push(path);
      else
        for (const [key, value] of Object.entries(expected))
          compare(actual[key], value, `${path}.${key}`);
    } else if (actual !== expected) mismatches.push(path);
  }
  compare(graph, facts.assertions, 'graph');
  return mismatches.map((detail) => ({ code: 'source-interface-fact-mismatch', detail }));
}
