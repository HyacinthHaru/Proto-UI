# Private semantic material and owned-scene host experiment

The current candidate uses a real Base-derived Prototype whose declaration names only refractive material, a style-owned rounded shape, an owned-scene sampling relation, a opaque fallback with its foreground explicitly resolved from final style, and Button press semantics. It does not expose a shader language, renderer preset, texture format, uniform, binding slot, pass, pipeline or synchronization primitive. The compiler privately selects the audited fixed liquidGL backend for its implemented WebGL target. Other targets remain explicitly unsupported; the high-level declaration is not restricted to GLSL's vocabulary.

Feedback owns observation of the existing Base state handles and publishes material state with the same final post-patch style input. Material-relevant fill/geometry/text Rules remain in the runtime evaluator; unrelated selector lowering remains available. The WC Adapter consumes the slot through a reusable visual host. Without an explicitly installed experimental GPU consumer, it produces authored opaque CSS fallback with `material-support-unavailable`. That degradation loses refraction, owned-scene sampling and optical press response; it does not claim visual equivalence.

The reusable host accepts an owned RGBA source lease, uses one final style-derived geometry, resolves preference/source failure to opaque fallback, and retires GPU/source subscriptions on view release. A private registration installs the generated program for the test consumer; it is not a public family or backend admission. The current source generation still reports `not-admitted`: target source generation, actual GPU execution and stable platform admission are distinct results.

Build the isolated fixture with `node --import tsx experiments/material-specializer/build-browser.mjs /tmp/pui-material-browser`. Run its browser evidence with `CHROME_PATH=<installed Chrome> node experiments/material-specializer/browser.test.mjs /tmp/pui-material-browser /tmp/pui-material-evidence`. The browser harness permits only its own localhost page and resources, contains no account credentials, and does not deploy. It captures pointer press/release, keyboard activation, disabled state, injected safety preference loss, source loss, context loss/restoration and replacement-owner mount. Injected preference cases are not OS-setting changes. The source manifest, exact kernel license and NOTICE accompany the evidence.

Local logical evidence passes; real GPU execution for this candidate is pending its exact-head CI. The local browser process restriction is preserved rather than bypassed. Do not use #807 frames as this Prototype's output. Passing the bounded experiment will not prove arbitrary graph compilation, native parity, group/morph/fusion, all Base families or full Prototype AOT.

## Historical source-only checkpoint (2638b696)

This is a source-only experiment, not a published Proto-UI component or completed material backend. It contains a real `definePrototype` that consumes `asButton()` and declares a finite experimental effect through the existing `Prototype.modules` mechanism. The build-time specializer explicitly consumes that declaration or reports unsupported; it emits fixed shader modules, a direct target ABI writer and a finite resource plan. It does not execute a shader or acquire a source.

Run `node --import tsx --test experiments/material-specializer/source.test.mjs` from the repository root. The tests use the actual Prototype and Runtime/Base Button event/state code plus an ordinary JavaScript spy for the generated writer. They do not launch a browser or send GPU commands.

## Source and license

The two shader literals are unchanged extracts from naughtyduk/liquidGL 3.0.0, commit `88f681ab7035fd55b04f63edff1841e32c4199e9`, `scripts/liquidGL.js` Git blob `b76e6872bf1c93ecacff646d09a77f5ce5f24ddb`. Exact literal hashes, byte lengths, source ranges and all 27 uniforms are in `modules.json`. `kernels/LICENSE` preserves the complete MIT copyright/permission/disclaimer and the original exclusion of demonstration assets. Every generated output carries that full license and a source/modification NOTICE.

No rasterizer, global renderer, Worker, pointer listener, screenshot capture or upstream asset is included. The emitted profile uses an application-owned opaque RGBA texture, never an implicitly captured or reconstructed DOM scene. Valid neutral textures remain bound for the disabled stack/shadow branches. Specular, frost, pointer deformation, stacking and shadow are disabled in this first profile. Original reversed-edge smoothstep in the specular branch is not silently rewritten or assumed equivalent across languages.

## What was actually checked

- Real static declaration and immutable finite metadata
- Explicit unsupported results for absent/unknown modules and every unimplemented target
- Source-class rejection, finite shape/state binding checks and complete opaque fallback fill data
- Exact copied module hashes, complete uniform manifest and integer/float/vector writer mapping
- Actual generated JavaScript executed against a spy: pressed versus rest, disabled overriding pressed, and invalid-frame rejection before any write
- Actual Runtime/Base state ownership for press, pointer cancellation, controlled disabled reset and rejection of access after disposal

The first test attempt lacked this worktree's package-local link to the existing `@floating-ui/dom` dependency and collected no cases. Linking the existing workspace modules resolved that setup problem. An initial post-dispose state read correctly failed; the test now asserts the established disposed-handle rejection rather than treating disposal as a readable false state. These were not GPU or visual outcomes.

## Necessary framework work, not a permanent external wrapper

The compiler's `generic-wc` diagnostic does not change the existing generic WC adapter, which does not consume this experimental declaration. Do not instantiate this private Prototype as an enhanced material outside an admitted consumer. The resource plan carries fallback data but no host applies it yet.

Current Feedback/EffectsPort realizes style only. A reusable draft extension must consume typed effect declarations, resolve material/style ownership after Rule contributions and patches, and publish one complete visual transaction through a capability-admitted host sink. The eventual legacy path must explicitly realize authored opaque fallback and report loss of effect capability. It must not pretend that ignoring an unknown declaration is a successful fallback.

The source/lease, shared radius, view/binding generation, geometry revision, frame order, asynchronous prepare, source loss, context loss, replacement, reentrant commit/release failure and dispose semantics need actual host tests. #804 provides private logical ownership research, not an already wired WC/React/Vue paint guarantee. A future experimental consumer cannot permanently bypass this missing common framework path through external state subscriptions.

The complex glass effect is being used to find and fill reusable visual-expression gaps. Source/material/shape/morph/fusion/animation, public family coverage, the library/docs/demo/homepage and Adapter/Compiler/native targets remain the end goal in #792/#793. The single-surface profile only bounds the first source experiment; it does not reduce that outcome.

No target GPU reflection/compilation, alpha/color pixel fidelity, browser consumer, native backend or real visual commit is accepted by these tests. `execution: not-admitted` remains in every result. A target-specific effect writer is narrower than full Prototype props/events/lifecycle AOT.

Independent source-only review confirmed the literal/ABI/license and real declaration/state tests. Integration still has two explicit mismatches to resolve: this experiment's static radius is only a shader parameter, whereas C-FEEDBACK-MATERIAL-0001-GEOMETRY requires a single final style-owned geometry; and the emitted opaque fallback fill is not a complete visual fallback including foreground, safe preferences and source lease. Neither is treated as completed by the source tests.

## Regular profile visual calibration (2026-10-04)

The next candidate changes the internally compiled regular profile while retaining the audited kernel bytes and high-level Prototype declaration. Bounded source-space scattering and fixed illumination make the surface distinguishable, while Base pressed changes magnification, refraction and optical depth. There is no continuous animation, new observer, author-side shader field or new source/backend capability. The former source-157 parameter set is retained only as an explicit same-scene diagnostic control.

The owned-scene fixture now includes procedural text, a uniform mid-tone, a light surface and a dark contrast-negative surface in addition to the original checker. GPU readback compares material pixels at identical geometry: reduced central high-frequency text variation, visible uniform-source separation and a nontrivial press footprint. These gates supplement actual image inspection; they cannot establish Apple fidelity or subjective visual acceptance. The existing contrast check must still choose opaque fallback for an unsafe dark source.

Exact-head browser A/B images and measurements are uploaded before the emitted-package phase so visual review need not wait for the longer aggregate/package jobs. This candidate's rendered outcome remains pending until that run is inspected. Previous source-bound images and rejected appearances remain historical evidence. Public whole-entry budget thresholds and implementation are unchanged.
