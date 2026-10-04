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
| `website-image-zoom-content`, `website-image-zoom-mask` | `apps/www/src/components/documentation-image-zoom.proto.ts` | Existing main Dialog-derived page-specific styles; recorded as a separate migration gap, not silently declared fixed by the homepage change. Preserve Dialog/Transition semantics when replacing the private projection. |

## Experiment boundaries

The #809 owned-material fixture is not equivalent to these page-specific wrappers: it inherits Base Button and probes a general semantic material path consumed by a real Adapter and specialized compiler. Its fixture name does not itself grant catalog admission. The website page records this distinction and the exact bounded execution evidence. Source-only results, GPU execution, public admission and package budgets remain separate.

## Maintenance and verification

Keep this dated checkpoint intact; append integration results rather than rewriting observations into claims of historical completion. Update current family pages when code is integrated. Check both locales, route reachability, actual exports and unsupported host/compiler paths. Do not use another commit's screenshot as candidate evidence.

## 08:34 UTC integration update

The candidate now incorporates the actual public Text/Surface dependency commit `70e0ea27a0b18614ffd78fc966cef491655b98e2` (tree `6611361ad42e7e8b8f403a4b66fbc1461469e1f9`, parent `06c1eb9f0cc96c98e72b337540845f99e5554277`). The five `site-*` implementations listed above were removed by that implementation commit; the separate image-zoom gap remains recorded. Text has Base/Shadcn/Brutalist pages; Surface has Base/Shadcn/Brutalist/Bootstrap/Liquid Glass pages. Together these add sixteen bilingual atom detail pages and eight actual public-registry recipes. The index and Material experiment add four more pages.

Local candidate validation: 92 focused recipe, public-registry, compiler and real-Adapter tests passed, workspace and docs types passed (397 files, zero errors/warnings and three existing hints), 282-page static build and all 188 internal links across 34 changed/new localized pages passed, 26 documentation tests and 111 runtime-planner tests passed. An initial recipe test collection used Happy DOM's URL instead of Node's file URL; explicitly selecting the Node test environment repaired collection. A concurrent build exited 137; the controlled serial rerun passed without changing the implementation. The local Chromium launch fails with `socket() failed: Operation not permitted`; all 64 browser cases were skipped, not counted as passing. The exact-head read-only documentation evidence workflow will run those cases on its normal supported runner and retain original PNG/JSON evidence. No local browser-policy bypass was attempted.

The new Material page preserves original `9ce6011` image provenance and additionally records the later `157269bbd9bea981a4c59425f667628b9b6d5b8e` source/built-artifact GPU run. Built artifacts are not claimed to be npm-published packages; package-budget debt stays explicit.
