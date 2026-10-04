# Semantic material declaration and private WC host candidate

Date: 2026-10-04. Draft increment of #809, #793 and #792; no stable admission.

The owner clarified that Prototype language must stay above renderer internals so compilers can target Vulkan, WebGPU, GLSL and explicitly degraded CSS. This candidate therefore removes the renderer preset, texture source class and binding map from the Prototype. Its finite declaration names material, shape, sampling relationship, complete fallback and Button interaction semantics. The existing finite WebGL kernel is a backend implementation choice, not the upper bound of the author language. This does not promise arbitrary graphical equivalence across targets.

## Actual path

`Prototype.modules → Feedback-owned Base state observation → post-patch style/material frame → WC consumer → private fixed-source program/resource realization`.

Relevant fill/geometry/text Rule contributions remain evaluator-owned rather than becoming invisible selectors. Final shared geometry is read after the actual style projection; the emitted writer takes its radius from that frame instead of a material-only declaration. The opaque fill is authored; `fallback.foreground: style` explicitly resolves the final style-owned text role before candidate selection. An unresolvable, nonopaque or insufficient-contrast fallback rejects the whole material projection and restores the original complete ordinary style with an unavailable diagnostic; it does not leave a partial fallback fill. Generic WC without a GPU consumer explicitly produces opaque CSS fallback and a loss reason. It loses refraction, scene sampling and optical press effects.

The GPU host is reusable and separate from the test page. It uses bounded owned RGBA pixels, no DOM capture or remote URL. All unchanged upstream shader bytes and complete MIT/asset-exclusion notices remain in generated output. Feedback owns subscriptions to Base's internal semantic state handles; the host does not subscribe to an externally exposed Button state or invent input. The browser fixture uses the real WC Adapter and ordinary physical pointer/keyboard input.

## Validation status before real-browser CI

- Workspace TypeScript passes.
- Nine source/ABI tests pass, now also asserting low-level renderer terms are absent from Prototype data and Base state reaches Feedback material frames.
- 83 focused files / 306 tests pass across Feedback, Rule lowering and WC, including five new actual WC integration tests for Base state, explicit CSS fallback and selective Rule retention.
- The browser bundle and source-derived token stylesheet build successfully. An initial choice of unsupported `rounded-3xl` / `text-black` was replaced with supported `rounded-full` / `text-foreground`; no page CSS reimplemented these Prototype semantics.
- Real browser/GPU evidence is pending exact-head CI. The local Chromium socket restriction remains a verification limit, not a passed browser result.

The browser evidence job blocks non-test requests and has no account credentials or production deployment. Its generated scene is owned test data. Expected evidence includes actual output change on Base pointer press, activation counts for pointer and keyboard, disabled suppression, injected preference fallback, source/context loss and recovery, and a fresh owner after removal. Its SHA-tagged captures are evidence only after the job executes and the artifacts are inspected.

## Remaining boundaries

The private reference renderer does not establish C-FEEDBACK-MATERIAL or C-VISUAL-TRANSACTION stable admission. Source lease stress, asynchronous transaction preparation, complete style provenance beyond the finite profile, all fallback/contrast cases, full graph compilation, Vulkan/WebGPU/native realization, group/morph/fusion, and all-family public projections require further evidence and implementation. The existing private heightfield resolver is not relabeled as equivalent to the distinct liquidGL reference optics.
