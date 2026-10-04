# Typed effect graph modeling probe

Run `node --test experiments/effect-graph/model.test.mjs`.

This inspection-only experiment asks whether two pinned real pipelines fit explicit pass/resource/source/binding data without raw host objects or anonymous shader source. It copies no upstream kernel or demo asset, installs nothing and renders nothing. Every result remains `not-admitted`, even when graph structure is valid.

See [the draft ADR](../../internal/records/2026-10-03-typed-effect-graph-adr.md) for source links, exact commits, license gates, unmodeled extensions and compiler/host limits. The single-surface private resolver in #804 is reusable lifetime research, not a permanent limit on graph expressiveness.

The 2026-10-04 hardening adds malformed collection/nested-metadata diagnostics, explicit required texture sampler bindings, and type-derived byte lengths for the pinned 32-bit scalar/vector packed fields. All twenty model tests pass, including negative controls reproduced against the preceding inspector. Missing sampler metadata is invalid; a kernel with no texture input declares an empty list. Studio's bounded read-only weight buffer remains data, not a texture sampler.

Packed matrix/array layouts are rejected until their stride/layout contracts are modeled; Flutter's existing reflected float-slot arrays remain inspection data without a fabricated packed-byte ABI. Scalar/vector byte checks follow [WGSL alignment and size](https://www.w3.org/TR/WGSL/#alignment-and-size), but do not establish full target alignment, reflection or compilation. This inspector is still not a production validator or a security boundary for hostile JavaScript objects, accessors or resource-exhausting input. Physical source/format, license, host lifetime and rendering admission remain unchanged.
