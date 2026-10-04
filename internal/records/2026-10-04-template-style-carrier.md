# Ordinary Template style carrier prerequisite

Non-normative implementation record for [#788](https://github.com/Proto-UI/Proto-UI/issues/788), independently of the Scroll Area corner consumer in #779 / #783. Baseline: `d05d1a00`.

## Boundary and choice

Draft `C-TEMPLATE-0002` and `C-TEMPLATE-0003` permit ordinary structural nodes with style-only props. Draft `C-FEEDBACK-STYLE-0003` separates author tokens from host artifacts; its `Q-TEMPLATE-STYLE` portable static-feedback question remains open. Legacy WC commit G6 permits ignoring an unconfigured `tw` handle but does not require it. Its historical CSS-handle wording does not expand the current tw-only core API.

The bounded implementation adds the existing `data-pui-style` carrier at the four existing ordinary Template realization points. WC uses the existing token merger; React, Vue and Vue 2 retain their existing merged `className` / `class` compatibility output. A configured WC resolver still receives the exact original token string and its inline result takes normal CSS precedence. The helper is called only for freshly created Template elements; host roots, caller slot nodes and SVG output keep their previous owners. No new props, component channels, PrototypeRef composition, Base identity, lifecycle promotion, Shadow CSS injection or conformance claim is introduced.

This does not make a caller-authored root carrier a new input API. Existing root feedback translation remains unchanged. Tests snapshot that root output before Template updates, while the caller-owned slot retains its exact conflicting carrier and classes and the same DOM node.

## Executed evidence and procedure

- Four real adapter mounts exercise conflicting tokens (`p-2 p-4`, `opacity-25 opacity-50`), empty and absent handles, structural update, caller slot identity, root isolation and two mount/disposal generations.
- Sequential regression across all four adapter test directories: 236 files / 679 tests passed. Final focused tests after the empty/absent-case expansion: 5 files / 8 tests passed. A focused TypeScript project covering new tests, fixtures and their transitive source graph passed; runtime-browser inventory 4/4 and changed-file formatting passed. The independent fixture production bundle built successfully with a bounded heap and minification disabled.
- WC commit tests retain original resolver input and inline result across fresh-element replacement and disposal.
- The same focused tests with the four production inputs restored to the baseline fail six carrier assertions; the two existing invalid-prop/handle guards still pass. With the candidate implementation all eight pass.
- Browser fixture: `apps/www/test/fixtures/template-style/`. It mounts the actual four adapters and loads only `renderProtoStyleTokenCss` output, without Website CSS, global Tailwind or a default resolver. It observes actual paint, class compatibility, root/slot identity, empty/absent/rebuilt output, configured WC inline precedence and disposal.
- `apps/www/test/template-style.browser.test.ts` is registered in the sequential runtime browser inventory. The read-only pull-request evidence job captures baseline and candidate from the same head-bound fixture, replacing only the four implementation files with the pinned pre-change `d05d1a00a353b9e72326a05569233d5bb54456a9` versions for the labeled baseline. JSON records bind fixture SHA, implementation SHA, browser version and measured facts; PNGs are run artifacts, not product-tree images.

## Verification limits

Local Chromium execution is unavailable in this cloud sandbox. No browser result or screenshot is claimed before the exact-head pull-request job passes and its artifacts are inspected. Local workspace type checking was killed under shared memory pressure. Documentation checking first hit an unwritable default Astro config directory; its workspace-scoped config retry was also killed. Neither aggregate check is claimed passing. Exact-head CI, independent architecture acceptance and accessible inspected visuals remain acceptance conditions. This prerequisite alone does not finish the dependent corner.

## Provenance

Original repository-local changes assisted by OpenAI Codex: implementation, tests, fixture, workflow and this record. Existing repository patterns were reused; no third-party implementation or private code was supplied. No human review is claimed. DCO sign-off uses the authorized contributor's existing identity; independent review is tracked separately.

## Independent review: initial fixture commit boundary

Fresh independent review found a fixture-only P1: the initial slot and root-carrier snapshots were captured before Vue/Vue 2 committed their initial view. The native browser run [37226659184](https://github.com/Proto-UI/Proto-UI/actions/runs/37226659184) independently failed in its baseline phase with `p-1` compared to the prematurely captured `null`. This is failed verification, not evidence of a production ownership defect; the candidate browser phase had not run.

The fixture now awaits the existing initial framework/frame settlement, captures and validates all three original ownership snapshots, then publishes its API and ready marker. All update, resolver and disposal assertions remain. A new real Vue/Vue 2 readiness regression observes the actual pre-commit missing slot/carrier, proves capture stays pending across the readiness gate, and checks the committed identity and `p-1` carrier. It passes 2/2 against both the pinned pre-carrier implementation and the candidate; the candidate's existing eight checks also pass. Deliberately removing the awaited settlement makes both readiness cases fail. The four production changes are untouched. Fresh exact-head browser artifacts and full CI remain pending after this repair; earlier captures are not relabeled as the repaired head.
