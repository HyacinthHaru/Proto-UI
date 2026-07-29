# Proto UI 0.2.0-rc.7 (Draft)

> These notes track candidate changes after `0.2.0-rc.6` that are intended for rc.7. `0.2.0-rc.7` has not been published. Exact package versions, the BOM, Git tag, GitHub prerelease, and immutable spec snapshot must be established and verified separately by the release-train preparation.

## Fixed

### Continuous trigger groups and Dialog hit boundaries

- Directly and continuously nested `asTrigger()` instances are no longer described as proxying events one way to either the outermost or innermost Trigger. They merge into one trigger group with a distinct default outer anchor, member set, default inner interaction surface, and shared semantic activation route.
- Every member retains its own behavior declarations. Semantic activation registrations converge on the current surface's shared target, while `host:*` listeners remain on each instance's own host root.
- Pointer activation may now enter the group semantic route only when its native hit origin is within the current surface root or its content. Hits on the extra host box of the anchor or another non-surface member are rejected instead of being redirected into a surface activation.
- This fixes `ShadcnDialogClose > ShadcnButton` compositions where the outer Close wrapper is wider than the inner Button and clicking the adjacent blank area incorrectly closed the Dialog. The same rule covers blank space around `ShadcnDialogTrigger > ShadcnButton`.
- The shared Dialog journey for Web Component, React, and Vue now verifies that blank space on the outer Trigger or Close does not activate the group, while pointer and keyboard activation on the inner Button, focus looping, and focus restoration after close continue to work.
- New group capabilities use the `mergeGroup` and `getGroupEventTarget` names. Deprecated route-owner aliases remain temporarily available to ease migration of existing host integrations.

### Shadcn Tabs v4 default-style fidelity

- The default horizontal Shadcn Tabs surface now follows the project's pinned shadcn/ui v4 baseline: Root uses `flex flex-col gap-2`, while List uses `inline-flex h-9 w-fit rounded-lg p-[3px]` and no longer stretches to the container width by default.
- Trigger restores the v4 geometry, typography, and selected, hover, focus-visible, and disabled feedback, while removing pressed scaling, the extra ring offset, and the older oversized rounded surface that are absent from the baseline.
- Content returns to an undecorated `flex-1 outline-none` content carrier. Tabs no longer imposes a border, background, padding, or shadow; consumers that need card-like panels compose that surface inside the content explicitly.
- The Proto style CSS compiler now supports `w-fit`, `h-fit`, `flex-1`, `shadow-sm`, and the required outline tokens so the aligned prototype styles reach Web output without degrading into unsupported tokens.
- This pass intentionally covers the default variant's horizontal primary path. The `line` variant, vertical layout, explicit dark branch, SVG descendant rules, and complete native API/data forwarding remain tracked parity gaps.

### CLI Brutalist CSS-only style preset

- `proto-ui init --prototypes brutalist` is now a first-class CSS-only style preset. It writes a Brutalist theme (`brutalist-theme.css` with light/dark variables and the flat canary/mint/lavender/coral/sky accent palette) plus a generated Proto UI token closure scanned from official Brutalist prototype sources, so target projects get usable initial CSS before any prototype package is installed.
- The preset is intentionally CSS-only. The private workspace package `@proto.ui/prototypes-brutalist` (Button reference family) has no public install path yet and is not part of the rc.7 BOM; the CLI `add` component registry exposes no Brutalist entry until the package is promoted through a later release train.

### Private Brutalist Scroll Area shell candidate

- The private `@proto.ui/prototypes-brutalist` workspace now carries a five-part Scroll Area visual shell over Base Root, Viewport, Scrollbar, Thumb, and Corner anatomy, with focused bilingual docs and preview evidence.
- This shell remains a non-launch commitment: the package stays private at `0.0.0`, remains outside the rc.7 BOM, exposes no public `proto-ui add` entry, and defers portable metrics and thumb dragging to a separate behavior PR.

## Build and release

### Executable artifacts for all 37 public packages

- All 37 public `@proto.ui/*` packages now produce `dist/*.js` and `dist/*.d.ts` before publication. Package exports point separately to the JavaScript runtime and declaration outputs instead of publishing `.ts` source as an npm runtime entry that requires a TypeScript loader.
- Every public package now has a package-local `build` and `prepack` contract. The root `build:packages` command builds selected packages and their upstream closure in production-dependency order, validates every export target, and runs import smoke tests in native Node ESM without loading TypeScript.
- Release staging now reuses and copies the same locally verified `dist` output used by development and CI instead of maintaining a second temporary compilation path that could drift.
- A generator now maintains public manifest `dist` exports, `files` allowlists, and build scripts consistently. Source and tests remain repository inputs but are excluded from the default npm payload; test files across the 37 tarballs were reduced from 1,031,558 B to 0 B.

### Bundle, documentation, and CI feedback

- The fixed Lucide icon entry is decoupled from the full icon-registry renderer. The representative `icons/x` entry decreased from 119,273 B to 1,560 B gzip, preventing a single icon from transitively including the complete registry.
- Lucide Gallery now server-renders a limited initial set, reducing its English page's raw HTML by approximately 63%. The internal Demo Matrix again mounts Web Component, React, and Vue side by side for every demo to preserve fast cross-adapter acceptance; its English and Chinese routes are development-only drafts and no longer enter production documentation output or the sitemap.
- CI now computes affected public packages from the workspace production-dependency graph and enforces gzip budgets for representative package entries. `main` and manually triggered workflows continue to run the complete public-package validation.
- A repeatable monorepo analysis snapshot now records builds, tests, tarballs, bundles, documentation output, and package update frequency so these improvements can be audited under the same measurement method.

## Validation

- The trigger-group and Tabs v4 style-fidelity changes pass the complete workspace test suite: 239 test files and 1,077 tests passed, together with the prototype catalog, style preset, type checks, generated Agent-document check, and the shared Web Component/React/Vue Dialog conformance journey.
- The delivery optimization has validated builds, export targets, native Node ESM imports, release staging, and `npm publish --dry-run` for 37/37 public packages. Package-manifest, bundle-budget, type, test, Astro check, and documentation-build gates also passed.
- The development Demo Matrix was verified with 27 demos and 81 simultaneously mounted previewers, 27 each for Web Component, React, and Vue. Its English and Chinese routes are absent from the 150-page production build, sitemap, and Pagefind index; the development-only and three-adapter side-by-side policies are now covered by the 37 release tests.

## Upgrade notes

- Consumers that use public package exports do not need to change their imports, but runtime resolution now targets compiled `.js` and type resolution targets `.d.ts`. Non-public usage that imports package-internal `src/*.ts` paths or assumes source/tests are present in the npm payload is not a compatibility guarantee.
- Custom host integrations should migrate to the trigger-group capability names. Deprecated route-owner aliases are transitional only.

## Release preparation still required

- This draft does not mean rc.7 is an installable release. A draft version entity must still be created, `VERSION` and every public package manifest aligned, the package BOM generated, and the complete release rehearsal passed before publication review.
