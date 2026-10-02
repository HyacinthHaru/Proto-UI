# Homepage presentation and page-wide dogfood

Date: 2026-10-02 Issue: #776 Baseline: `1fd4c08a`

## Approved consumer scope

The homepage refresh combines a compact, readable bilingual presentation with real Proto UI dogfood. One page-level runtime choice should rebuild the homepage interactive component hosts using the existing Web Components, React, Vue and Vue 2 adapters. Static Astro content and service-owned facilities remain explicit boundaries. This is a website consumer integration, not a new Base behavior, Adapter admission, runtime parity guarantee or promise to migrate demo-local state.

The six presentation objectives are consistent sans-serif inheritance, a shorter balanced hero, visible shared-definition/runtime correspondence, less empty space, a restrained preview hierarchy and toolbar, and reader-facing wording with future host research below the working example.

## Existing authority and decisions preserved

- `D-ADAPTER-PROFILE-0001` and the website runtime registry bound the current browser adapters. This work does not alter their contracts or the published support matrix.
- The #578 projection transaction owns hidden/inert candidate preparation, latest-intent arbitration, activation, stale cleanup and focus restoration. Reuse it rather than constructing a second ad-hoc runtime switch.
- #769's consumer CSS layer precedence remains intact. Website layout may arrange components; it must not substitute styles for the selected Prototype family.
- #655's whitepaper entry remains available. The 2026-09-08 reader-guidance record continues to prohibit unqualified cross-framework equivalence and claims that every switch reloads framework modules.
- `D-AS-CHILD-OMISSION-0001` and Template restrictions do not allow adding `href` to Base Button. Native navigation semantics, modified-click/new-tab behavior and no-JavaScript links must survive the homepage integration. Any site-local host/Prototype composition must identify that split without asserting a new Base Link contract.

## Evidence plan

Capture the actual baseline and candidate at 1440 × 1000 and 390 × 844, light/dark, with computed font family and overflow measurements. Exercise the real selector and inspect rendered runtime/owner markers in header, actions and example, including repeated transitions, keyboard focus, disposal, error/stale candidates and native links. Run the applicable existing projection regressions and new homepage tests, type checks and production build on the final tree. Uploaded captures and exact-head results belong on the PR; this plan alone is not completed evidence.

Co-author by OpenAI Dots
