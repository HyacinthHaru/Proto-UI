const SOURCE_KINDS = [
  'application-texture',
  'host-compositor-backdrop',
  'application-owned-captured-texture',
  'reconstructed-scene',
  'video-frame',
];
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
// Inspection-only data model. It neither loads shader code nor grants execution capability.
export function inspectGraph(graph) {
  const errors = [];
  const error = (code, detail) => errors.push({ code, detail });
  const invalid = () => ({ valid: false, errors, execution: 'not-admitted' });
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const strings = (value) => Array.isArray(value) && value.every((x) => typeof x === 'string');
  const records = (value) => Array.isArray(value) && value.every(record);
  const seen = new WeakSet();
  function plain(value, path = 'graph') {
    if (typeof value === 'number' && !Number.isFinite(value)) error('nonfinite', path);
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
    if (typeof value !== 'object') {
      error('nonserializable', path);
      return;
    }
    if (seen.has(value)) {
      error('object-cycle', path);
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!Object.hasOwn(value, i)) error('sparse-array', path);
        else plain(value[i], `${path}[${i}]`);
      }
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        error('host-object', path);
      for (const [key, child] of Object.entries(value)) {
        if (['shaderSource', 'nativeHandle', 'gpuDevice', 'canvas', 'callback'].includes(key))
          error('host-escape', `${path}.${key}`);
        plain(child, `${path}.${key}`);
      }
    }
    seen.delete(value);
  }
  plain(graph);
  if (!record(graph)) error('invalid-graph-record', 'graph');
  if (graph?.schemaVersion !== 1) error('schema-version', 'expected inspection schema 1');
  if (
    ![
      graph?.kernels,
      graph?.sources,
      graph?.resources,
      graph?.data,
      graph?.passes,
      graph?.uniformBlocks,
    ].every(Array.isArray)
  )
    return {
      valid: false,
      errors: [...errors, { code: 'missing-arrays' }],
      execution: 'not-admitted',
    };
  // Validate the shapes consumed below before walking their members. These are
  // inspection diagnostics for plain data, not a sandbox for arbitrary objects.
  for (const key of ['kernels', 'sources', 'resources', 'data', 'passes', 'uniformBlocks'])
    if (!records(graph[key])) error('invalid-collection-member', key);
  if (errors.length) return invalid();
  for (const kernel of graph.kernels) {
    if (!strings(kernel.uniformBlocks)) error('missing-kernel-uniform-block', kernel.id);
    if (!['named', 'indexed'].includes(kernel.samplerBinding))
      error('invalid-sampler-binding-mode', kernel.id);
    if (
      !records(kernel.dataBindings) ||
      kernel.dataBindings.some(
        (binding) => !nonempty(binding.name) || binding.type !== 'bounded-array<f32>'
      )
    )
      error('invalid-data-binding-contract', kernel.id);
    const samplerSlots = new Set();
    if (!records(kernel.samplers)) error('invalid-sampler-contract', kernel.id);
    else
      for (const sampler of kernel.samplers) {
        if (kernel.samplerBinding === 'indexed') {
          if (!Number.isInteger(sampler.slot) || sampler.slot < 0 || samplerSlots.has(sampler.slot))
            error('invalid-sampler-slot', kernel.id);
          samplerSlots.add(sampler.slot);
        } else if (sampler.slot !== undefined) error('unexpected-sampler-slot', kernel.id);
        if (
          typeof sampler.name !== 'string' ||
          !sampler.name ||
          !['host-injected', 'application-bound'].includes(sampler.ownership)
        )
          error('invalid-sampler-contract', kernel.id);
      }
  }
  for (const pass of graph.passes) {
    if (!strings(pass.reads) || !strings(pass.dependsOn)) error('incomplete-pass', pass.id);
    if (!strings(pass.uniformBlocks)) error('missing-pass-uniform-block', pass.id);
    if (!record(pass.bindings) || !Object.values(pass.bindings).every((x) => typeof x === 'string'))
      error('invalid-pass-bindings', pass.id);
  }
  for (const block of graph.uniformBlocks) {
    if (!records(block.fields)) error('invalid-uniform-fields', block.id);
    else if (
      block.fields.some((field) => typeof field.name !== 'string' || typeof field.type !== 'string')
    )
      error('invalid-uniform', block.id);
    if (block.reservedAutoInputs !== undefined && !strings(block.reservedAutoInputs))
      error('invalid-reserved-inputs', block.id);
  }
  if (graph.featurePreconditions !== undefined) {
    if (!records(graph.featurePreconditions)) error('invalid-feature-preconditions', 'graph');
    else
      for (const condition of graph.featurePreconditions) {
        if (!['excluded', 'host-required'].includes(condition.mode))
          error('invalid-feature-precondition-mode', condition.feature);
        if (
          condition.mode === 'host-required' &&
          (!strings(condition.requiredHostUniforms) ||
            !record(condition.requiredHostSamplers) ||
            !Object.values(condition.requiredHostSamplers).every(
              (slot) => Number.isInteger(slot) && slot >= 0
            ))
        )
          error('invalid-feature-precondition', condition.feature);
        if (
          condition.mode === 'excluded' &&
          (!record(condition.requires) ||
            typeof condition.requires.uniformBlock !== 'string' ||
            typeof condition.requires.field !== 'string' ||
            !Object.hasOwn(condition.requires, 'value'))
        )
          error('invalid-feature-precondition', condition.feature);
      }
  }
  if (errors.length) return invalid();
  const named = (items, label) => {
    const map = new Map();
    for (const item of items) {
      if (!item || !nonempty(item.id) || map.has(item.id)) {
        error('duplicate-or-invalid-id', label);
        continue;
      }
      map.set(item.id, item);
    }
    return map;
  };
  const kernels = named(graph.kernels, 'kernels'),
    resources = named([...graph.sources, ...graph.resources, ...graph.data], 'resources'),
    passes = named(graph.passes, 'passes'),
    blocks = named(graph.uniformBlocks, 'uniform-blocks');
  const external = new Set([...graph.sources, ...graph.data].map((x) => x.id));
  for (const k of kernels.values()) {
    if (
      !k.upstream ||
      typeof k.upstream.repo !== 'string' ||
      !/^[^/\s]+\/[^/\s]+$/.test(k.upstream.repo) ||
      !nonempty(k.upstream.path) ||
      k.upstream.path.startsWith('/') ||
      k.upstream.path.split('/').some((part) => !part || part === '.' || part === '..') ||
      typeof k.upstream.commit !== 'string' ||
      typeof k.upstream.gitBlob !== 'string' ||
      !/^[0-9a-f]{40}$/.test(k.upstream.commit) ||
      !/^[0-9a-f]{40}$/.test(k.upstream.gitBlob)
    )
      error('unpinned-kernel', k.id);
    if (k.execution !== 'not-admitted') error('unsupported-execution-claim', k.id);
    if (
      k.stage !== 'fragment' ||
      typeof k.entryPoint !== 'string' ||
      !k.entryPoint ||
      typeof k.license !== 'string' ||
      !k.license
    )
      error('incomplete-kernel-contract', k.id);
    if (!Array.isArray(k.uniformBlocks) || k.uniformBlocks.some((id) => !blocks.has(id)))
      error('missing-kernel-uniform-block', k.id);
  }
  for (const s of graph.sources) {
    if (!SOURCE_KINDS.includes(s.kind)) error('unknown-source-kind', s.id);
    if (!s.space || !s.alpha || !s.freshness || !s.format)
      error('incomplete-source-contract', s.id);
  }
  for (const r of graph.resources)
    if (!r.format || !r.extent || !r.space || !r.alpha || !r.clear)
      error('incomplete-resource-contract', r.id);
  for (const d of graph.data)
    if (
      d.type !== 'bounded-array<f32>' ||
      !Number.isInteger(d.maxCount) ||
      d.maxCount < 1 ||
      d.maxCount > 4096
    )
      error('unbounded-data-buffer', d.id);
  const writers = new Map();
  for (const p of passes.values()) {
    if (!['fragment', 'host-image-filter', 'copy', 'composite'].includes(p.kind))
      error('unknown-pass-kind', p.id);
    if (['fragment', 'host-image-filter'].includes(p.kind) && !kernels.has(p.kernel))
      error('missing-kernel', p.id);
    if (p.writes !== 'presentation' && !resources.has(p.writes)) error('unknown-output', p.id);
    if (external.has(p.writes)) error('external-source-write', p.id);
    if (
      !Array.isArray(p.uniformBlocks) ||
      p.uniformBlocks.some((id) => !blocks.has(id)) ||
      (kernels.get(p.kernel)?.uniformBlocks ?? []).some((id) => !p.uniformBlocks?.includes(id))
    )
      error('missing-pass-uniform-block', p.id);
    if (writers.has(p.writes)) error('multiple-writers', p.writes);
    else writers.set(p.writes, p.id);
    if (!Array.isArray(p.reads) || !Array.isArray(p.dependsOn)) {
      error('incomplete-pass', p.id);
      continue;
    }
    if (p.reads.includes(p.writes)) error('current-target-feedback', p.id);
    for (const r of p.reads) if (!resources.has(r)) error('unknown-input', `${p.id}:${r}`);
    for (const d of p.dependsOn) if (!passes.has(d)) error('unknown-dependency', `${p.id}:${d}`);
    for (const r of Object.values(p.bindings ?? {}))
      if (!p.reads.includes(r)) error('undeclared-sampling', `${p.id}:${r}`);
    for (const binding of kernels.get(p.kernel)?.dataBindings ?? []) {
      const bound = graph.data.find((d) => d.id === p.bindings[binding.name]);
      if (!Object.hasOwn(p.bindings, binding.name))
        error('missing-data-binding', `${p.id}:${binding.name}`);
      else if (!bound || bound.type !== binding.type)
        error('data-binding-mismatch', `${p.id}:${binding.name}`);
    }
    for (const sampler of kernels.get(p.kernel)?.samplers ?? []) {
      if (!Object.hasOwn(p.bindings, sampler.name))
        error('missing-sampler-binding', `${p.id}:${sampler.name}`);
      const bound = resources.get(p.bindings?.[sampler.name]);
      if (
        sampler.ownership === 'host-injected' &&
        (bound?.kind !== sampler.sourceKind || bound?.reservedSampler !== sampler.slot)
      )
        error('host-sampler-ownership', `${p.id}:${sampler.name}`);
      if (sampler.resourceKind && bound?.kind !== sampler.resourceKind)
        error('sampler-resource-mismatch', `${p.id}:${sampler.name}`);
    }
  }
  if (!writers.has('presentation')) error('missing-presentation-writer', 'graph');
  const completed = new Set(),
    active = new Set();
  function visit(id) {
    if (active.has(id)) {
      error('pass-cycle', id);
      return;
    }
    if (completed.has(id) || !passes.has(id)) return;
    active.add(id);
    for (const d of passes.get(id).dependsOn ?? []) visit(d);
    active.delete(id);
    completed.add(id);
  }
  for (const id of passes.keys()) visit(id);
  function depends(id, wanted, seen = new Set()) {
    if (seen.has(id) || !passes.has(id)) return false;
    seen.add(id);
    return (passes.get(id).dependsOn ?? []).some((d) => d === wanted || depends(d, wanted, seen));
  }
  for (const p of passes.values())
    for (const input of p.reads ?? []) {
      const writer = writers.get(input);
      if (!external.has(input) && !writer) error('missing-resource-producer', `${p.id}:${input}`);
      if (writer && writer !== p.id && !depends(p.id, writer))
        error('missing-read-after-write-order', `${p.id}:${input}`);
    }
  for (const block of graph.uniformBlocks) {
    const names = new Set(),
      intervals = [];
    if (!['wgsl-uniform-buffer', 'flutter-reflected-float-slots'].includes(block.abi))
      error('unknown-uniform-abi', block.id);
    if (block.abi === 'wgsl-uniform-buffer' && (!Number.isInteger(block.bytes) || block.bytes < 1))
      error('missing-block-size', block.id);
    for (const field of block.fields ?? []) {
      if (
        !field.name ||
        names.has(field.name) ||
        !/^(f32|i32|u32|vec[234]f|vec[234]<f32>|mat[234]<f32>)$/.test(field.type)
      )
        error('invalid-uniform', block.id);
      names.add(field.name);
      if (
        field.count !== undefined &&
        (!Number.isInteger(field.count) || field.count < 1 || field.count > 4096)
      )
        error('unbounded-uniform-array', field.name);
      if (
        block.abi === 'wgsl-uniform-buffer' ||
        field.offset !== undefined ||
        field.bytes !== undefined
      ) {
        // The pinned packed ABI currently uses only 32-bit scalars/vectors.
        // Do not guess matrix/array stride or reflection from a declared count.
        // WGSL SizeOf: https://www.w3.org/TR/WGSL/#alignment-and-size
        const vector = /^(?:vec([234])f|vec([234])<f32>)$/.exec(field.type);
        const expectedBytes = /^(f32|i32|u32)$/.test(field.type)
          ? 4
          : vector
            ? 4 * Number(vector[1] ?? vector[2])
            : null;
        if (expectedBytes === null || field.count !== undefined)
          error('unsupported-packed-uniform-type', field.name);
        else if (field.bytes !== expectedBytes) error('uniform-byte-size', field.name);
        if (
          !Number.isInteger(field.offset) ||
          !Number.isInteger(field.bytes) ||
          field.offset < 0 ||
          field.bytes < 1 ||
          field.offset + field.bytes > block.bytes
        )
          error('uniform-out-of-bounds', field.name);
        for (const [a, b] of intervals)
          if (field.offset < b && field.offset + field.bytes > a)
            error('uniform-overlap', field.name);
        intervals.push([field.offset, field.offset + field.bytes]);
      }
    }
    for (const name of block.reservedAutoInputs ?? []) {
      const uniform = (block.fields ?? []).find((f) => f.name === name);
      if (uniform && uniform.binding?.kind !== 'host-injected')
        error('host-binding-ownership', name);
    }
  }
  for (const condition of graph.featurePreconditions ?? []) {
    if (condition.mode === 'host-required') {
      for (const name of condition.requiredHostUniforms) {
        if (
          !graph.uniformBlocks.some((block) =>
            block.fields.some(
              (field) => field.name === name && field.binding?.kind === 'host-injected'
            )
          )
        )
          error('missing-host-uniform', name);
      }
      for (const [name, slot] of Object.entries(condition.requiredHostSamplers)) {
        if (
          !graph.kernels.some((kernel) =>
            kernel.samplers.some(
              (sampler) =>
                sampler.name === name &&
                sampler.ownership === 'host-injected' &&
                sampler.slot === slot
            )
          )
        )
          error('missing-host-sampler', name);
      }
      continue;
    }
    if (condition.mode !== 'excluded') continue;
    const requirement = condition.requires;
    const field = blocks
      .get(requirement?.uniformBlock)
      ?.fields?.find((f) => f.name === requirement.field);
    if (
      field?.binding?.kind !== 'constant' ||
      JSON.stringify(field.binding.value) !== JSON.stringify(requirement.value)
    )
      error('disabled-feature-precondition', condition.feature);
  }
  if (
    !Number.isInteger(graph.limits?.passes) ||
    graph.limits.passes < 1 ||
    graph.limits.passes > 8 ||
    graph.passes.length > graph.limits.passes ||
    graph.passes.length > 8 ||
    graph.limits?.historyFrames !== 0 ||
    graph.limits?.storageWrites !== false
  )
    error(
      'unsupported-graph-budget',
      'first inspection model has no temporal or writeable-storage effects'
    );
  return {
    valid: errors.length === 0,
    errors,
    execution: 'not-admitted',
    reasons: [
      'No shader compiled or host source acquired',
      'Target format/ABI/lease/pixel evidence remains required',
      ...graph.kernels
        .filter((k) => typeof k.license === 'string' && k.license.startsWith('blocked'))
        .map((k) => `Unresolved license closure: ${k.id}`),
    ],
  };
}
export function sourceCompatibility(required, provided) {
  if (!SOURCE_KINDS.includes(required) || !SOURCE_KINDS.includes(provided))
    return { compatible: false, reason: 'unknown-source-kind' };
  return required === provided
    ? { compatible: true }
    : {
        compatible: false,
        reason: 'source-kind-mismatch; no implicit reconstruction or capture substitution',
      };
}
