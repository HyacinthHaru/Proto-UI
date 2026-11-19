# Website bundle ownership

Source `ad1db8170aa7abc0ba56e08427f2e3e9076f4efa`, tree `8cbf90f33d39acc52e59931178fd2482ac23ac1a`, based on `21af3bec014503e68782a6f1f3756aec2bb987cd`.

The built graph records `keyboard-press-owner.ts` and `pointer-sample.ts` as dependency-free leaves within the existing WC control bridge. Their emitted direct edges come from the shared router, instance tree and move-gesture code already in that chunk. The New York Button boundary and default no-addon Command routes directly acquire the existing demo renderer. Their React, Vue and Vue 2 entries stay dynamic. The checker now names these four existing identities explicitly.

- The exact main website build produced 683 pages and 53 production bundle findings. The signed checker and website build leave two findings, the existing tint-stage and visible-refraction diagnostics with direct material dependencies. The same two remain when this verifier inspects the existing #1577 build. Main and candidate have the same normalized 2,568 chunk and 5,818 module records after matching chunks by owners and membership; content-based filenames differed between the builds.
- The production graph fixture suite grows from 1,774 to 1,858 passing tests. Existing placement and importer-bypass controls cover both helpers, and the exact-route tests still reject an adjacent facade and eager React import. Cascading failures in the test-first run occurred because the shared positive fixtures included the four identities before their checker registration.
- The source Coverage Matrix still reports the same 1,183 issue lines on main and this candidate. The two standalone optical diagnostics retain the separate boundary decision recorded in `internal/records/2026-10-26-c-bundle-graph-reconciliation.md`.
- Separate local composition of the exact Search test blob from #1534 yielded 10 passed disposal tests and 1243 Astro files with zero errors and warnings. Publication keeps #1534 under its existing author. The local composition was restored after the checks.

[Verification](verification.json)
