# Keep the native range created by a move or focus callback

Agent request paraphrase: continue the authorized Website repair, handle valid review findings, preserve page content, assertions and deadlines, and verify the exact source and packed candidate.

PR #1494 initially repaired Chromium document Selection restoration resetting a focused native input/textarea from 3–8 to 0–0. [Review r4604270688](https://github.com/Proto-UI/Proto-UI/pull/1494#discussion_r4604270688) identified a real precedence defect: replaying that original tuple also overwrites a newer value/range chosen synchronously by a move or focus handler. The existing WC relocation path already preserves author focus-handler precedence.

Signed candidate `0eca13c4a6fb61fa559ee195d3063228c9cfa3d8`, tree `406818faef7fbf7e537ea3bb0283b5bed6913cc0`, follows `e97761a5a5ace8bafe5efaee5314b77f161a9d75` on main `0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53`. The change captures the current range after move/refocus callbacks, immediately before restoring document Selection. It still requires the original field to own focus. No callback is skipped, no asynchronously cached range is introduced, and the Website projection decision stays draft.

## Same execution state and controls

| Stage | e977 baseline | 0eca candidate |
| --- | --- | --- |
| Initial focused field | uncontrolled text, 3–8 forward | same |
| Move or native focus callback | replaces value with `New text`, selects 1–4 backward | same |
| After helper finishes | value survives, stale 3–8 forward range overwrites callback | value and 1–4 backward range survive |

The unit matrix covers input/textarea × move/focus handlers: identical final test bytes give 4 failures / 12 passes on e977; all six focused suites give 256 passes after repair. A first source-edit attempt failed an exact-pattern assertion before any write; the following test run therefore still used e977 and retained the same 4 failures / 252 other passes. This failed attempt remains recorded separately.

The real Chrome observer adds these four callback cases to the earlier ten native lease cases. A red source run compares the exact same e977 helper on both sides: 28 rows, eight expected callback failures. Green source and actual emitted-module runs each retain four e977 baseline failures while the candidate passes all 14 cases. The original four field direction cases and page/cross-owner/registered-wrapper cases remain green. Focus events are browser events initiated by programmatic refocus; the move update is an explicit synchronous callback. This is not a trusted keyboard-input journey or a complete public-page four-Adapter acceptance run.

`native-control.mjs.txt` and `packed-control.mjs.txt` retain the exact executed script bytes, without hook reformatting. `measurements.json` binds their hashes, source/bundle hashes, all measured before/after rows and actual served module bytes. Rename a script locally to `.mjs` when reproducing it; the fixture/environment inputs are documented in the preceding [main repair packet](https://github.com/HyacinthHaru/Proto-UI/tree/38246f6abbc0f684304aba8d5f9577f8cec38a0f/evidence/2026-11-17/native-text-selection-main).

## Candidate combination and limits

- Node 24.21.0, pnpm 10.32.1, Chrome 156.0.8078.79, macOS arm64.
- Actual new-head Website build: 685 pages. Both disposable draft-route overlays were restored after the build. Fresh artifact inventory retains all 1,268 matrix roots in each locale.
- Fresh workspace types check exits 0. Actual packed Contents/Dialog/Runtime Tabs: 11 passed, 13 filtered. Header trusted-family first-frame control passes at 320/390 px; geometry reads can force layout. The public article retains 9/9 CodeExample entries.
- The actual served native lease module passes all 14 candidate cases in the synthetic same-origin native DOM harness, keeping the four previous-head callback failures.
- Package source/config/lockfile/manifests are unchanged by this two-file Website follow-up. The prior e977 47-package build, manifest check and 3 PASS / 6 ADVISORY measurements are explicitly reused with their exact source identity and actual excesses. They are not new-head package execution or canonical hosted evidence.
- The original full bilingual S4 suite failed at e977 before Dialog under the existing 60 s readiness / 150 s test limits. It was not repeated for this callback-only repair; no new-head full S4 pass is claimed. Continue that separate startup diagnosis with all page content and the original deadlines.

Evidence disposition: partial. This packet is an actual source/packed internal state walkthrough and scoped functional validation. It does not establish new visual-design, cross-browser, hosted full-suite, independent maintainer approval, thread resolution, merge or release acceptance. The P2 correction is implemented and verified locally; independent exact-head recheck and platform integration remain open.
