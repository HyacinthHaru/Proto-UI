import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGraph, sourceCompatibility } from './validate-model.mjs';
const load = async (name) =>
  JSON.parse(await readFile(new URL(`${name}.json`, import.meta.url), 'utf8'));
for (const name of ['studio', 'flutter'])
  test(`${name} source pipeline is serializable and structurally modeled, not admitted`, async () => {
    const graph = await load(name),
      result = inspectGraph(graph);
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
    assert.equal(result.execution, 'not-admitted');
    assert.deepEqual(JSON.parse(JSON.stringify(graph)), graph);
  });
test('same-frame ordering is explicit and cycles/current target reads are rejected', async () => {
  const graph = await load('studio');
  graph.passes[3].dependsOn = [];
  assert(inspectGraph(graph).errors.some((x) => x.code === 'missing-read-after-write-order'));
  graph.passes[0].dependsOn = ['main-pass'];
  graph.passes[3].dependsOn = ['background-pass'];
  assert(inspectGraph(graph).errors.some((x) => x.code === 'pass-cycle'));
  graph.passes[0].reads.push('background');
  assert(inspectGraph(graph).errors.some((x) => x.code === 'current-target-feedback'));
});
test('host objects, callback closures and anonymous shader strings are not graph data', async () => {
  for (const [key, value] of [
    ['shaderSource', 'void main(){}'],
    ['callback', () => {}],
    ['gpuDevice', new Map()],
  ]) {
    const graph = await load('studio');
    graph[key] = value;
    assert.equal(inspectGraph(graph).valid, false);
  }
});
test('formats, spaces, alpha and immutable kernel provenance cannot disappear', async () => {
  const graph = await load('flutter');
  delete graph.resources[0].alpha;
  assert(inspectGraph(graph).errors.some((x) => x.code === 'incomplete-resource-contract'));
  graph.kernels[0].upstream.commit = 'main';
  assert(inspectGraph(graph).errors.some((x) => x.code === 'unpinned-kernel'));
});
test('mixed scalar ABI and bounded weight arrays retain actual target limits', async () => {
  const graph = await load('studio');
  assert.equal(graph.uniformBlocks[0].bytes, 160);
  assert.equal(graph.data[0].maxCount, 201);
  assert.equal(graph.data[0].targetBindings.webgpu, 'read-only-storage-buffer');
  graph.uniformBlocks[0].fields[1].offset = 0;
  assert(inspectGraph(graph).errors.some((x) => x.code === 'uniform-overlap'));
});
test('Flutter geometry has bounded shape storage and no invented physical format', async () => {
  const graph = await load('flutter');
  assert.equal(graph.uniformBlocks[0].fields.find((x) => x.name === 'uShapeData').count, 112);
  assert.equal(graph.resources[0].format, 'host-managed-ui-image');
  assert.equal(graph.sources[0].kind, 'host-compositor-backdrop');
  assert.equal(graph.sources[0].reservedSampler, 0);
});
test('copied or reconstructed texture never silently satisfies a live backdrop requirement', () => {
  assert.equal(
    sourceCompatibility('host-compositor-backdrop', 'reconstructed-scene').compatible,
    false
  );
  assert.equal(
    sourceCompatibility('host-compositor-backdrop', 'application-owned-captured-texture')
      .compatible,
    false
  );
  assert.equal(sourceCompatibility('application-texture', 'application-texture').compatible, true);
});
test('structural success does not clear an unresolved license or claim compilation', async () => {
  const result = inspectGraph(await load('studio'));
  assert.equal(result.valid, true);
  assert(result.reasons.some((x) => x.includes('Unresolved license')));
  assert.equal(result.execution, 'not-admitted');
});

test('uniform blocks and intermediate producers cannot be disconnected', async () => {
  const missingBlock = await load('studio');
  missingBlock.uniformBlocks = [];
  assert.equal(inspectGraph(missingBlock).valid, false);
  const producer = await load('studio');
  producer.passes.splice(1, 1);
  producer.passes[1].dependsOn = ['background-pass'];
  assert(inspectGraph(producer).errors.some((x) => x.code === 'missing-resource-producer'));
  const writesSource = await load('studio');
  writesSource.passes[0].writes = 'media';
  assert(inspectGraph(writesSource).errors.some((x) => x.code === 'external-source-write'));
});
test('bounded data and ABI require explicit size and known types', async () => {
  const graph = await load('studio');
  delete graph.data[0].maxCount;
  assert.equal(inspectGraph(graph).valid, false);
  const abi = await load('studio');
  delete abi.uniformBlocks[0].bytes;
  assert.equal(inspectGraph(abi).valid, false);
  const type = await load('studio');
  type.uniformBlocks[0].fields[0].type = 'gpu-object';
  assert.equal(inspectGraph(type).valid, false);
});
test('omitted Flutter frost preprocessing cannot be enabled through unrestricted uniforms', async () => {
  const graph = await load('flutter');
  const frost = graph.uniformBlocks[1].fields.find((f) => f.name === 'uFrost');
  frost.binding = { kind: 'frame-value', id: 'uFrost' };
  assert(inspectGraph(graph).errors.some((x) => x.code === 'disabled-feature-precondition'));
});
test('live Flutter uniforms remain host-owned and Studio background tracks shape motion', async () => {
  const flutter = await load('flutter');
  const size = flutter.uniformBlocks[1].fields.find((f) => f.name === 'uSize');
  size.binding = { kind: 'frame-value', id: 'uSize' };
  assert(inspectGraph(flutter).errors.some((x) => x.code === 'host-binding-ownership'));
  const studio = await load('studio');
  assert(studio.passes[0].update.dependencies.includes('pointer-spring-state'));
  assert(studio.kernels[0].license.startsWith('blocked'));
});

test('live compositor sampler ownership cannot be replaced with a data texture', async () => {
  const graph = await load('flutter');
  graph.passes[1].bindings.uBackgroundTexture = 'geometry';
  assert(inspectGraph(graph).errors.some((x) => x.code === 'host-sampler-ownership'));
});

test('Flutter live coordinates distinguish matte raster DPR from screen placement', async () => {
  const graph = await load('flutter');
  assert.equal(
    graph.frameInputs.find((f) => f.id === 'matte-transform').to,
    'screen-logical-pixels'
  );
  assert.equal(
    graph.frameInputs.find((f) => f.id === 'enclosing-filter-pass-rect').space,
    'screen-physical-pixels'
  );
  assert.equal(
    graph.frameInputs.find((f) => f.id === 'screen-device-pixel-ratio').distinctFrom,
    'matte-dpr'
  );
  const offset = graph.uniformBlocks[1].fields.find((f) => f.name === 'uCaptureOffset');
  assert.deepEqual(offset.binding, { kind: 'constant', value: [0, 0] });
  offset.binding = { kind: 'frame-value', id: 'uCaptureOffset' };
  assert(inspectGraph(graph).errors.some((e) => e.code === 'disabled-feature-precondition'));
});

test('malformed collection members return an invalid inspection without throwing', async () => {
  for (const key of ['kernels', 'sources', 'resources', 'data', 'passes', 'uniformBlocks']) {
    for (const value of [null, 3, {}, 'invalid']) {
      const graph = await load('studio');
      graph[key].push(value);
      const result = inspectGraph(graph);
      assert.equal(result.valid, false, `${key}: ${JSON.stringify(value)}`);
      assert.equal(result.execution, 'not-admitted');
    }
  }
});

test('missing or malformed nested metadata stays a diagnostic, never an exception', async () => {
  const mutations = [
    (g) => delete g.kernels[0].license,
    (g) => (g.kernels[0].license = 7),
    (g) => (g.kernels[0].upstream.commit = { toString: null }),
    (g) => (g.kernels[0].uniformBlocks = {}),
    (g) => delete g.kernels[0].samplers,
    (g) => (g.kernels[1].samplers = [null]),
    (g) => (g.passes[1].reads = {}),
    (g) => (g.passes[1].dependsOn = 2),
    (g) => (g.passes[1].bindings = []),
    (g) => (g.uniformBlocks[0].fields = [null]),
    (g) => (g.uniformBlocks[0].fields[0].type = { toString: null }),
    (g) => delete g.uniformBlocks[0].fields,
    (g) => (g.uniformBlocks[0].reservedAutoInputs = {}),
    (g) => (g.featurePreconditions = [null]),
    (g) => (g.featurePreconditions = [{ mode: 'excluded' }]),
  ];
  for (const mutate of mutations) {
    const graph = await load('flutter');
    mutate(graph);
    const result = inspectGraph(graph);
    assert.equal(result.valid, false, String(mutate));
    assert.equal(result.execution, 'not-admitted');
  }
});

test('every declared texture sampler requires its own pass binding', async () => {
  for (const name of ['studio', 'flutter']) {
    const original = await load(name);
    for (const pass of original.passes) {
      const kernel = original.kernels.find((k) => k.id === pass.kernel);
      for (const sampler of kernel.samplers ?? []) {
        const graph = structuredClone(original);
        delete graph.passes.find((p) => p.id === pass.id).bindings[sampler.name];
        const result = inspectGraph(graph);
        assert(result.errors.some((e) => e.code === 'missing-sampler-binding'));
        assert.equal(result.execution, 'not-admitted');
      }
    }
  }
  const studio = await load('studio');
  studio.passes[3].bindings = {};
  assert.equal(inspectGraph(studio).valid, false);
});

test('packed scalar and vector fields cannot forge or omit their typed byte length', async () => {
  for (const bytes of [1, 4, 12, 16, undefined]) {
    const graph = await load('studio');
    if (bytes === undefined) delete graph.uniformBlocks[0].fields[0].bytes;
    else graph.uniformBlocks[0].fields[0].bytes = bytes;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'uniform-byte-size'));
  }
  const noOffset = await load('studio');
  delete noOffset.uniformBlocks[0].fields[0].offset;
  assert(inspectGraph(noOffset).errors.some((e) => e.code === 'uniform-out-of-bounds'));
  const wrongVector = await load('studio');
  wrongVector.uniformBlocks[0].fields[0].type = 'vec4f';
  assert(inspectGraph(wrongVector).errors.some((e) => e.code === 'uniform-byte-size'));
});

test('packed widths distinguish vector size from padding and reject unmodeled strides', async () => {
  // WGSL SizeOf(vec3<f32>) is 12 despite its 16-byte alignment. This probe
  // checks a field's byte length, not complete struct layout or reflection.
  const vector = await load('studio');
  vector.uniformBlocks[0].fields = [{ name: 'probe', type: 'vec3<f32>', offset: 0, bytes: 12 }];
  assert.equal(inspectGraph(vector).valid, true);
  vector.uniformBlocks[0].fields[0].bytes = 16;
  assert(inspectGraph(vector).errors.some((e) => e.code === 'uniform-byte-size'));
  for (const field of [
    { name: 'matrix', type: 'mat3<f32>', offset: 0, bytes: 36 },
    { name: 'array', type: 'f32', count: 4, offset: 0, bytes: 16 },
  ]) {
    const graph = await load('studio');
    graph.uniformBlocks[0].fields = [field];
    assert(inspectGraph(graph).errors.some((e) => e.code === 'unsupported-packed-uniform-type'));
  }
});

test('read-only data binding names and kinds remain mandatory for blur kernels', async () => {
  for (const passIndex of [1, 2]) {
    const graph = await load('studio');
    delete graph.passes[passIndex].bindings.u_blurWeights;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'missing-data-binding'));
    graph.passes[passIndex].bindings.u_blurWeights = 'background';
    assert(inspectGraph(graph).errors.some((e) => e.code === 'data-binding-mismatch'));
  }
  const graph = await load('studio');
  delete graph.kernels[1].dataBindings;
  assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-data-binding-contract'));
});

test('unknown and absent uniform ABI labels cannot disable packed bounds', async () => {
  for (const abi of [undefined, '', 'wgsl-uniform-bufer']) {
    const graph = await load('studio');
    if (abi === undefined) delete graph.uniformBlocks[0].abi;
    else graph.uniformBlocks[0].abi = abi;
    delete graph.uniformBlocks[0].bytes;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'unknown-uniform-abi'));
  }
});

test('declared finite pass ceilings bound the actual graph', async () => {
  for (const limit of [undefined, 0, 1, 3.5, 9, '4']) {
    const graph = await load('studio');
    if (limit === undefined) delete graph.limits.passes;
    else graph.limits.passes = limit;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'unsupported-graph-budget'));
  }
  const graph = await load('studio');
  graph.limits.passes = 5;
  assert.equal(inspectGraph(graph).valid, true);
});

test('indexed application samplers cannot omit or collide with reserved slots', async () => {
  for (const slot of [undefined, 0, -1, 1.5]) {
    const graph = await load('flutter');
    if (slot === undefined) delete graph.kernels[1].samplers[1].slot;
    else graph.kernels[1].samplers[1].slot = slot;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-sampler-slot'));
  }
  const graph = await load('studio');
  assert.equal(inspectGraph(graph).valid, true, 'named bindings do not invent numeric slots');
});

test('a graph must produce exactly one presentation target', async () => {
  const graph = await load('studio');
  graph.passes.pop();
  graph.limits.passes = 3;
  assert(inspectGraph(graph).errors.some((e) => e.code === 'missing-presentation-writer'));
  const duplicate = await load('studio');
  duplicate.passes.push({ ...structuredClone(duplicate.passes[3]), id: 'second-presentation' });
  duplicate.limits.passes = 5;
  assert(inspectGraph(duplicate).errors.some((e) => e.code === 'multiple-writers'));
});

test('source compatibility rejects unknown or absent kinds even when equal', () => {
  for (const source of [undefined, null, '', 'typo-source'])
    assert.deepEqual(sourceCompatibility(source, source), {
      compatible: false,
      reason: 'unknown-source-kind',
    });
  assert.equal(sourceCompatibility('video-frame', 'video-frame').compatible, true);
});

test('immutable provenance includes repository and exact relative path', async () => {
  for (const mutate of [
    (k) => delete k.upstream.repo,
    (k) => delete k.upstream.path,
    (k) => (k.upstream.repo = 'owner'),
    (k) => (k.upstream.path = ''),
    (k) => (k.upstream.path = '../shader.wgsl'),
  ]) {
    const graph = await load('studio');
    mutate(graph.kernels[0]);
    assert(inspectGraph(graph).errors.some((e) => e.code === 'unpinned-kernel'));
  }
});

test('precondition modes cannot silently disable exclusions or host requirements', async () => {
  for (const mode of [undefined, 'exclued', '']) {
    const graph = await load('flutter');
    if (mode === undefined) delete graph.featurePreconditions[0].mode;
    else graph.featurePreconditions[0].mode = mode;
    graph.uniformBlocks[1].fields.find((f) => f.name === 'uFrost').binding = {
      kind: 'frame-value',
      id: 'uFrost',
    };
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-feature-precondition-mode'));
  }
  const host = await load('flutter');
  host.featurePreconditions[1].requiredHostSamplers.uBackgroundTexture = 1;
  assert(inspectGraph(host).errors.some((e) => e.code === 'missing-host-sampler'));
});

test('graph member identifiers cannot be empty even when references agree', async () => {
  for (const id of ['', '   ']) {
    const graph = await load('studio');
    graph.kernels[0].id = id;
    graph.passes[0].kernel = id;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'duplicate-or-invalid-id'));
  }
});

test('binding names are unique across texture and data inputs of a kernel', async () => {
  const graph = await load('studio');
  graph.kernels[3].samplers[1].name = 'u_bg';
  delete graph.passes[3].bindings.u_blurredBg;
  assert(inspectGraph(graph).errors.some((e) => e.code === 'duplicate-binding-name'));
  const mixed = await load('studio');
  mixed.kernels[1].dataBindings[0].name = 'u_prevPassTexture';
  assert(inspectGraph(mixed).errors.some((e) => e.code === 'duplicate-binding-name'));
});

test('frame inputs declare every extent, coordinate and uniform value dependency', async () => {
  const missing = await load('flutter');
  delete missing.frameInputs;
  assert.equal(inspectGraph(missing).valid, false);
  const original = await load('flutter');
  for (const id of ['matte-dpr', 'geometry-pixel-budget', 'matte-transform', 'uShapeData']) {
    const graph = structuredClone(original);
    graph.frameInputs = graph.frameInputs.filter((input) => input.id !== id);
    assert(
      inspectGraph(graph).errors.some((e) => e.code === 'missing-frame-input'),
      id
    );
  }
});

test('the pinned host size uniform retains its reserved reflected float slots', async () => {
  for (const slots of [undefined, [2, 3], [0], [0, 0]]) {
    const graph = await load('flutter');
    const binding = graph.uniformBlocks[1].fields.find((f) => f.name === 'uSize').binding;
    if (slots === undefined) delete binding.floatSlots;
    else binding.floatSlots = slots;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'host-uniform-slot-contract'));
  }
});

test('declared shape count and stride fit the pinned bounded float array', async () => {
  for (const [key, value] of [
    ['maxShapes', undefined],
    ['shapeStrideFloats', undefined],
    ['maxShapes', 100],
    ['shapeStrideFloats', 0],
    ['maxShapes', 1.5],
  ]) {
    const graph = await load('flutter');
    if (value === undefined) delete graph.limits[key];
    else graph.limits[key] = value;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'shape-capacity-mismatch'));
  }
});

test('unknown license labels cannot erase unresolved provenance diagnostics', async () => {
  const graph = await load('studio');
  graph.kernels[0].license = 'blockd-IQ-transitive-provenance';
  assert(inspectGraph(graph).errors.some((e) => e.code === 'unknown-license-gate'));
});

test('target requirements remain nonempty, unique declared capability names', async () => {
  for (const requirements of [undefined, [], [''], ['   '], ['one', 'one'], [42]]) {
    const graph = await load('flutter');
    if (requirements === undefined) delete graph.requirements;
    else graph.requirements = requirements;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-capability-requirements'));
  }
});

test('every reflected uniform has a recognized typed value binding', async () => {
  for (const binding of [
    undefined,
    {},
    { kind: 'frame-vlaue', id: 'uGlassColor' },
    { kind: 'constant', value: [1] },
    { kind: 'constant', value: ['red', 1, 1, 1] },
  ]) {
    const graph = await load('flutter');
    const field = graph.uniformBlocks[1].fields.find((f) => f.name === 'uGlassColor');
    if (binding === undefined) delete field.binding;
    else field.binding = binding;
    assert(
      inspectGraph(graph).errors.some((e) =>
        ['missing-reflected-value-binding', 'invalid-constant-uniform'].includes(e.code)
      )
    );
  }
});

test('pass invalidation retains a recognized policy and declared dependencies', async () => {
  for (const update of [
    undefined,
    'upstrem-dirty',
    {},
    { kind: 'any-dirty', dependencies: [] },
    { kind: 'any-dirty', dependencies: ['source:missing'] },
    { kind: 'any-dirty', dependencies: ['uniform:missing'] },
    { kind: 'any-dirty', dependencies: ['geomtry'] },
  ]) {
    const graph = await load('studio');
    if (update === undefined) delete graph.passes[1].update;
    else graph.passes[1].update = update;
    assert(
      inspectGraph(graph).errors.some((e) =>
        ['invalid-pass-update', 'invalid-update-dependency'].includes(e.code)
      )
    );
  }
});

test('resource contract values have usable types, including unresolved alpha and extent', async () => {
  for (const [field, value] of [
    ['format', 7],
    ['space', {}],
    ['alpha', true],
    ['alpha', { status: 'unresolved' }],
    ['clear', []],
    ['extent', 4],
    ['extent', {}],
    ['extent', { basis: 'viewport', scale: [1, -1] }],
  ]) {
    const graph = await load('studio');
    graph.resources[0][field] = value;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'incomplete-resource-contract'));
  }
});

test('read-only data target mappings cannot disappear or become writable', async () => {
  for (const bindings of [
    undefined,
    {},
    {
      webgpu: 'read-write-storage-buffer',
      webgl2: 'uniform-array',
      flutter: 'requires-specialization-or-unavailable',
    },
  ]) {
    const graph = await load('studio');
    if (bindings === undefined) delete graph.data[0].targetBindings;
    else graph.data[0].targetBindings = bindings;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-data-access-mode'));
  }
});

test('blur radius fits the declared read-only weight capacity', async () => {
  for (const radius of [undefined, 0, -1, 1.5, 201, 10000]) {
    const graph = await load('studio');
    if (radius === undefined) delete graph.limits.blurRadius;
    else graph.limits.blurRadius = radius;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'blur-capacity-mismatch'));
  }
});

test('a pass cannot substitute another kernel invalidation policy or drop a dependency', async () => {
  const graph = await load('studio');
  graph.passes[0].update = 'frame-bindings-dirty';
  assert(inspectGraph(graph).errors.some((e) => e.code === 'kernel-invalidation-mismatch'));
  const dep = await load('studio');
  dep.passes[0].update.dependencies = ['source:media', 'uniform:main'];
  assert(inspectGraph(dep).errors.some((e) => e.code === 'kernel-invalidation-mismatch'));
});

test('pass binding keys exactly follow their declared kernel interface', async () => {
  const graph = await load('studio');
  graph.passes[0].bindings.notInKernel = 'media';
  assert(inspectGraph(graph).errors.some((e) => e.code === 'unknown-pass-binding'));
  const omitted = await load('studio');
  omitted.kernels[0].samplers = [];
  assert(inspectGraph(omitted).errors.some((e) => e.code === 'unknown-pass-binding'));
});

test('floating constants stay finite at target f32 precision', async () => {
  for (const value of [1e300, -1e300]) {
    const graph = await load('flutter');
    graph.uniformBlocks[1].fields.find((f) => f.name === 'uGlassColor').binding = {
      kind: 'constant',
      value: [value, 0, 0, 1],
    };
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-constant-uniform'));
  }
});

test('referenced uniform layouts cannot be empty', async () => {
  const graph = await load('studio');
  graph.uniformBlocks[0].fields = [];
  assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-uniform-fields'));
});

test('host-image-filter presentation retains its premultiplied blend contract', async () => {
  for (const blend of [undefined, {}, 'additive']) {
    const graph = await load('flutter');
    if (blend === undefined) delete graph.passes[1].blend;
    else graph.passes[1].blend = blend;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'invalid-host-blend'));
  }
});

test('physical intermediate usages cover every sampling and render edge', async () => {
  for (const usages of [undefined, ['render-attachment'], ['texture-binding']]) {
    const graph = await load('studio');
    if (usages === undefined) delete graph.resources[0].usages;
    else graph.resources[0].usages = usages;
    assert(inspectGraph(graph).errors.some((e) => e.code === 'resource-usage-mismatch'));
  }
});

test('fragment passes require a recognized draw domain', async () => {
  const graph = await load('studio');
  graph.passes.forEach((pass) => delete pass.drawDomain);
  assert(inspectGraph(graph).errors.some((e) => e.code === 'missing-draw-domain'));
});
