# 2026-10-04 Prototype documentation audit

This is a non-normative, dated implementation and documentation inventory. It does not admit a public API, activate a spec entity, or establish Adapter/Compiler conformance.

## Scope and evidence

- Main baseline: `d4bdb66b54d68625fb3da1109a76e0829c1e77d7`.
- Homepage branch checkpoint: PR #777, `06c1eb9f0cc96c98e72b337540845f99e5554277`.
- Bootstrap branch checkpoint: PR #808, `0e11926c3890b36a79b05ef366341968fa9f056f`.
- Material branch checkpoint: PR #809, `9ce6011b50c4ab6792bd1261142d03a87f5b9471`.
- Base Input documentation checkpoint: PR #812, `2ea0499f555a32e927493e0d04e44d3b56e0c945`.

Inspected `definePrototype` source, package `src/index.ts` exports, `spec/prototypes/P-*.yaml`, the website prototype registry, both locales of `ui-libraries/**`, and `scripts/docs/public-doc-policy.mjs`. The public-doc baseline check passed, but its four-library policy is not a complete inventory of experimental branches or non-package definitions.

Main contains 151 P entities, all draft at this checkpoint: Base 53, Shadcn 46, Brutalist 49, Bootstrap 1, Liquid Glass 1, Lucide 1. All 152 prototype source files under `packages/prototypes` occur in P entity source references; Transition's separate direct/asHook files explain why source-file and entity counts differ. Generated Lucide glyphs share one protocol and are documented by the searchable gallery. Utility exports are not additional components. The bilingual website coverage index records each implementation family and its source parts.

## Documentation dispositions

| Subject | Existing coverage | Action / remaining boundary |
| --- | --- | --- |
| Main Base families except Input | Bilingual family pages, including Image and draft Table | Link all families and constituent source parts in the coverage index; preserve each page's host/lifecycle limits. |
| Main Base Input | Implementation and P identity; missing Base detail route | PR #812 supplies the actual API and four-runtime preview. Do not duplicate that work or treat Shadcn docs as Base documentation. |
| Main Shadcn and Brutalist | Bilingual family detail pages | Inventory every family/part, including Shadcn Input and Radio Group. |
| Bootstrap additions in #808 | Six new bilingual pages for eight new parts | Checkbox Root/Indicator, Switch Root/Thumb, Toggle, Input, Textarea, Separator; total with Button is nine parts/seven component kinds, not all Base. |
| Liquid Glass stage-0 Button | Bilingual overview and Button preview | Keep translucency/blur fallback claims separate from the new material experiment. |
| `experimental-owned-material-button` in #809 | Experiment README; no www record | Add bilingual Liquid Glass material-experiment page, actual declaration/Feedback/Adapter/compiler path, exact-head GPU evidence, source/license, and budget debt. This is a Base-derived experimental composition, not a new page-specific private Button API or admitted family. |
| New generic Text/Surface in #777 | Implementation being prepared after this checkpoint | Add API pages and real public-export examples only after the actual source, entities, exports and host/compiler diagnostics exist. |

## Page-specific definitions that require migration

These are observed source identities, **not an approved final architecture**. Do not turn them into a documented public API merely to close a coverage checkbox. The homepage is a consumer: reusable atoms retain protocol/visual ownership and applicable Adapter/Compiler realization; ordinary host composition retains layout and native navigation.

| Existing definition at the homepage checkpoint | Source | Migration disposition |
| --- | --- | --- |
| `site-typography` | `apps/www/src/prototypes/site-typography.proto.ts` | Replace with generic Text, document reusable text inputs and semantics; no homepage roles or copy in the atom. |
| `site-preview-surface` | `apps/www/src/prototypes/site-preview-surface.proto.ts` | Replace with generic passive Surface and host composition; retain family projection ownership. |
| `site-code-surface` | `apps/www/src/prototypes/site-code-surface.proto.ts` | Compose generic Surface, Text and existing parts. Code panel syntax formatting and layout must not become another page-specific protocol. |
| `site-link-surface` | `apps/www/src/prototypes/site-link-surface.proto.ts` | Compose supported atoms while the native anchor remains the sole navigation owner; do not invent a cross-platform Link protocol or synthetic button navigation. |
| `site-copy-feedback-icon` | `apps/www/src/prototypes/site-copy-feedback-icon.proto.ts` | Compose existing Lucide semantics with consumer state; do not admit another private icon family. |
| `website-image-zoom-content`, `website-image-zoom-mask` | `apps/www/src/components/documentation-image-zoom.proto.ts` | Content and Mask originated on main (#797); #777 also changes Mask pointer-down default prevention. They remain page-specific projection debt. Preserve Dialog/Transition, dismissal and return-focus semantics during migration. |

### Image-zoom inventory correction (09:10 UTC)

The first audit compared the two definitions on main but missed the additional definition in the homepage branch. The complete checkpoint contains **three** website-specific identities in `apps/www/src/components/documentation-image-zoom.proto.ts`:

- `website-image-zoom-content`: inherited from main (#797), based on Dialog Content with page-specific transition styling.
- `website-image-zoom-mask`: inherited from main (#797), additionally modified by #777 to prevent pointer-down default behavior from stealing restored focus.
- `website-image-zoom-trigger`: newly introduced by #777, based on Base Button with `docs-image-zoom-trigger` styling and a focus-visible rule.

Thus this is not entirely pre-existing debt. The next migration must reuse existing governed parts and reusable atoms while preserving activation, dismiss/return-focus, native link and image-content behavior. No additional website-private API is admitted by this inventory. The earlier omission is retained here as a correction rather than silently claiming the first audit had already covered the new Trigger.

## Experiment boundaries

The #809 owned-material fixture is not equivalent to these page-specific wrappers: it inherits Base Button and probes a general semantic material path consumed by a real Adapter and specialized compiler. Its fixture name does not itself grant catalog admission. The website page records this distinction and the exact bounded execution evidence. Source-only results, GPU execution, public admission and package budgets remain separate.

## Maintenance and verification

Keep this dated checkpoint intact; append integration results rather than rewriting observations into claims of historical completion. Update current family pages when code is integrated. Check both locales, route reachability, actual exports and unsupported host/compiler paths. Do not use another commit's screenshot as candidate evidence.

## 08:34 UTC integration update

The candidate now incorporates the actual public Text/Surface dependency commit `70e0ea27a0b18614ffd78fc966cef491655b98e2` (tree `6611361ad42e7e8b8f403a4b66fbc1461469e1f9`, parent `06c1eb9f0cc96c98e72b337540845f99e5554277`). The five `site-*` implementations listed above were removed by that implementation commit; the separate image-zoom gap remains recorded. Text has Base/Shadcn/Brutalist pages; Surface has Base/Shadcn/Brutalist/Bootstrap/Liquid Glass pages. Together these add sixteen bilingual atom detail pages and eight actual public-registry recipes. The index and Material experiment add four more pages.

Local candidate validation: 92 focused recipe, public-registry, compiler and real-Adapter tests passed, workspace and docs types passed (397 files, zero errors/warnings and three existing hints), 282-page static build and all 188 internal links across 34 changed/new localized pages passed, 26 documentation tests and 111 runtime-planner tests passed. An initial recipe test collection used Happy DOM's URL instead of Node's file URL; explicitly selecting the Node test environment repaired collection. A concurrent build exited 137; the controlled serial rerun passed without changing the implementation. The local Chromium launch fails with `socket() failed: Operation not permitted`; all 64 browser cases were skipped, not counted as passing. The exact-head read-only documentation evidence workflow will run those cases on its normal supported runner and retain original PNG/JSON evidence. No local browser-policy bypass was attempted.

The new Material page preserves original `9ce6011` image provenance and additionally records the later `157269bbd9bea981a4c59425f667628b9b6d5b8e` source/built-artifact GPU run. Built artifacts are not claimed to be npm-published packages; package-budget debt stays explicit.

## 09:05 UTC rendered follow-through

The first exact docs-head run, `833460b21ae32b40e1981509db828a7a19db39d5`, completed 61/64 browser cases successfully. Three cases rejected two raw slot nodes immediately after runtime selection. The original artifact `11299000026` and per-commit report preserve that failure; one successful Shadcn Text image was byte-verified and published without claiming the failed cases passed.

The dependency has advanced to `36cec84151f848b61d3f7d4a537ea4d76954ae6c`. It repairs real caller recipe closure, selected-runtime forwarding and awaiting shell readiness, alongside the bounded source fixes recorded in #777. Surface's new `secondary` variant is reflected in both locales. This documentation branch merges the dependency normally, preserving the original docs commit and its evidence history.

The next browser probe records every slot's hidden/inert/display state, borrowed content, atom count, generation, visible phase (null when not exposed) and ready-event timestamp/snapshot. Hidden or empty preparing/retiring candidates remain in the record; two visible borrowed-content owners remain a failure. Ready events must themselves expose exactly one active content owner matching the runtime named by that event. Runtime selection, active-frame readiness and native listbox exit share the existing 20-second budget; no sleep, animation disabling, widened deadline or first-match filtering is used. Five socket-free negative-control tests verify this distinction and the unchanged 64-case registration. Final rendered results remain pending until that exact committed candidate runs.

## 09:17 UTC exact-head result

Run `37191245429` on docs head `0b2048f8e606f6a185b9f03cddd3da371bbfd000` passed all 64 browser cases. Downloaded artifact `11298897954` contains 64 original PNGs and 64 JSON reports; every report has that source SHA, `sourceDirty: false`, and no page errors. Across all recorded states the maximum raw slot count was one and the maximum active owner count was one; all 176 ready-event snapshots passed runtime ownership. No second slot had to be excluded for this actual successful run. The earlier 833460b2 failures remain historical negative evidence.

The screenshot exit guard is further narrowed to the real document-owned listboxes, because Select portals its content outside the preview root. This preserves the original readiness deadline while preventing a menu outside the preview subtree from being omitted from capture readiness. This observation changes the screenshot probe, not the atoms' interaction contract. Aggregate repository checks and the three image-zoom migrations remain separate from the successful bounded atom-docs run.

## 09:43 UTC public composition integration

The next dependency is `0fd5f4744f68d54328ace6e21ea402b5a291b93b` (parent `36cec841`, tree `d5ddc7e507bff9cef39abd0bfe5e1409bac46975`). It removes `documentation-image-zoom.proto.ts` and all three `website-image-zoom-*` definitions. The image preview now composes direct Base Button/Dialog parts with public family Surface presentation. This is source removal and integration, with exact-head rendered acceptance still a separate pending result; prior records retain the original identities and omission correction.

Surface adds `scrim`, `fade` (default false) and observed `transitionState` (default entered). The family projection maps that existing Transition owner's facts to paint without a second lifecycle clock. Web duration comes from a finite non-negative composition-owned value through `--pui-surface-transition-duration`, default 0ms, not a universal 220ms. Native unresolved-variable/starting-style limitations stay explicit. Ten localized Surface pages document the actual new vocabulary and distinguish ordinary scrim/transparent paint from optical material effects.

The bounded `P-BASE-DIALOG-MASK-DEFAULT-ACTION` revision is recorded on Base Dialog and linked by its Shadcn/Brutalist projections. The Base page's pre-existing claim that `alert` belongs on Content is corrected to Root, and its unsupported non-modal claim is aligned with `P-BASE-DIALOG-ROLE-MODAL-WINDOW`, consistent with the existing protocol and Shadcn page. These are workspace/draft claims, not retroactive 0.2 release guarantees.

The final dependency for this documentation increment is `6721a50c0f0e93a4a58b2964bfc1331363959744`, whose parent is `0fd5f474`. It changes browser test oracles/fixtures only; the production Surface and Dialog APIs documented above are unchanged. The normal dependency merge retains both earlier docs commits and their exact-source evidence.

## 10:09 UTC functional evidence and font-environment correction

The exact docs head `6e6ec029b002ccfbe7073b80e052f6089ca845b8` passed 64/64 browser cases in run `37193756666`; artifact `11299294548` retains 64 JSON reports and 66 original PNGs, including two full Surface documents. All reports bind the clean source SHA, with zero page errors and at most one raw/active shell in the recorded states.

Visual inspection found missing Chinese glyphs in that run's full Chinese document. Functional preview success does not establish localized prose rendering. The original failed visual evidence remains retained under its original source. The evidence runner now follows the existing typography workflow's `fonts-noto-cjk` installation, records the package versions and fontconfig CJK inventory, and records Chromium's actually rendered platform fonts plus computed family, size, weight and line height for the document sample. The mixed-script first-paragraph sample must use a rendered CJK font, but its aggregate glyph counts do not identify individual Chinese glyphs or prove whole-page coverage. Final screenshot inspection remains required. Font facts are retained in failure reports as well as successful captures. No application font substitution or screenshot synthesis is used to hide the environment defect. Final validation is pending the combined dependency/environment increment.

### Associated CI failure attribution

The ordinary CI run `37193756656` checked out GitHub's PR merge commit `888c7b7406668804d445c77e376b24d7a57582f1`, whose tree `b25e1c399abac5129d878786a6188922ba3a6b92` is identical to docs head `6e6ec029`. This differs from the dedicated atom evidence workflow's direct head checkout.

Browser shard 5/8 passed 51 of 54 cases. Its three failures are all `site-search-commands.browser.test.ts` initial readiness: Shadcn light/1440px, dark/390px and dark/1440px. Recorded ready events arrived 194.4ms, 41.5ms and 510.4ms after the unchanged 1000ms deadline, respectively. Subsequent observation found all three ready with no page errors; it does not turn the failed deadline into a pass. The aggregate `test` failed solely because the required browser job failed, not due to a second independent assertion.

The docs increment changes no Search implementation, renderer or Search test, but its additional demo recipes can affect the module graph. Absence of a direct source edit is not proof of zero startup impact. Final integration must rerun Search by suite identity: adding the atom suite changes deterministic shard allocation, so a successful same-numbered shard on the dependency branch is not equivalent coverage.

## 10:49 UTC final candidate synchronization

The documentation branch now incorporates `ec6e5710d0aaeee6d5844f9c996c1d7ca594aa31` (tree `9f9eaf79adf03d9b3152a8325b2a55ca60873b7d`), preserving the intervening source history. The dependency narrows runtime module acquisition and defers hidden Code/Copy initialization until real activation; its last increment uses public Text for the image error status while retaining the native paragraph/live owner. None adds a new public atom API. The documentation evidence environment correction is combined with this one synchronization. The next direct-head 64-case run, Chinese full-document visual inspection and Search suite/aggregate checks must bind the resulting docs commit; earlier source-branch successes remain separate evidence.
