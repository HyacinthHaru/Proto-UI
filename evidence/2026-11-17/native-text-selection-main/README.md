# Preserve native text-control selection during a Website content move

Agent request paraphrase: continue the authorized Website regression work with complete page content, original assertions and deadlines. This bounded repair preserves a focused input or textarea's selected range when its authored content moves between physical preview owners. The broad release and S4 acceptance work remains open.

Candidate `e97761a5a5ace8bafe5efaee5314b77f161a9d75`, tree `ff8cc11d1383a36af7afca4d1e7a868768336fb3`, is a signed two-file, 49-line addition on upstream main `0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53`. It contains the caret repair and four focused regressions, without the other local S4 performance changes. The Website projection decision `D-HOST-PROTOTYPE-PROJECTION-SCOPE-0001` remains draft; no public Prototype lifecycle is changed.

## Observed state transition

Actual Chrome 156.0.8078.79 on macOS arm64, Node 24.21.0 and pnpm 10.32.1, 2026-11-17 UTC. The helper receives a physical native DOM move. In each input/textarea × forward/backward case, the same field starts focused with uncontrolled value and range `(3, 8, direction)`.

| Stage | Unmodified main helper | Candidate helper |
| --- | --- | --- |
| Before moving retained source | same focused field, range 3–8 | same focused field, range 3–8 |
| After move and document Selection restoration | field identity, focus and value survive; range becomes 0–0, forward | same field, focus, value and original 3–8 direction survive |

The fix snapshots the owned native text control's range before the move and restores it after the document range, while the original connected field still owns focus. It follows the existing Website clipboard selection preservation pattern.

`measurements.json` contains source hashes and full measured rows. `native-control.mjs` and `packed-control.mjs` are the actual observer scripts, unchanged from the executions. They test ten modes: empty document Selection, forward/backward page range, a cross-owner range, forward/backward registered-wrapper endpoints, and the four native text field cases. Each run has 20 rows, ten baseline and ten candidate. The scripts retain baseline failures and only fail their process for candidate failures; the evidence assembly separately requires the four expected baseline failures.

For the red source run both variants used unmodified main and all eight text-field observations failed. For the green source and actual emitted-module runs each candidate passed 10/10 while the four baseline field failures remained. The packed control imports the actual emitted `native-content-lease` module from the same static Astro preview origin and compares served asset bytes to the build. Its fixture is a synthetic native DOM harness, not a full four-Adapter public-page journey. It does not use a mocked browser Selection.

The unit fixture explicitly models the measured Chromium document Selection side effect. On unmodified main the same final unit-test bytes give 4 failed / 8 passed. Candidate focused validation gives 252 passed across six files. This unit simulation and the real Chromium rows are separate evidence.

## Exact candidate validation

- Focused suites: `native-content-lease`, `passive-shell-composition`, `runtime-preview-surface`, `runtime-preview-portal-theme`, `projected-previewer-shell.integration`, and `projection-scope`: 252 passed.
- `corepack pnpm@10.32.1 build:packages`: 47/47 public packages; package manifest check and workspace type check exit 0.
- `corepack pnpm@10.32.1 --filter apps-www build`: 685 pages. The two draft Demo Matrix routes were temporarily enabled only for this disposable static build, then restored byte-for-byte. They retain all 1,268 preview roots per locale. The public Shadcn Button article retains all 9/9 CodeExample entries.
- Package budget policy exits 0 with three PASS and six ADVISORY rows. Actual over-budget values and minified hashes are retained in the JSON; this is not a nine-entry strict budget pass or canonical hosted measurement.
- Actual packed preview: 11 selected Contents, Dialog and Runtime Tabs tests pass across three collected files; 13 unselected tests remain filtered. Existing assertions and deadlines remain unchanged. Header's trusted family switch also passes the first-frame geometry control at 320 and 390 CSS px; those geometry reads may force layout.
- Original full bilingual S4 suite: both cases fail at the existing 150,000 ms test deadline while waiting for all roots to become ready under the original 60,000 ms readiness limit, before reaching Dialog assertions. Neither result is replaced by the selected green tests. The changed helper does not establish full matrix startup success.

## Reproduction and remaining acceptance

Use the repository's pinned toolchain and exact candidate. The source-level observer takes an esbuild IIFE exposing `{control, candidate}` as `globalThis.nativeLease`; compile the baseline helper obtained from the exact parent alongside the candidate helper. Run `PUI_WWW_PACKAGE` pointing at the checkout's `apps/www/package.json`, `CHROME_PATH` pointing at the recorded Chrome, and `node native-control.mjs fixture.js result.json`. For the packed observer, also supply the preview origin in `PROTO_UI_BROWSER_BASE_URL` and its actual emitted module filename in `PUI_PACKED_LEASE_ASSET`. Minified export names are checked against this exact build, not promised as a public API.

Evidence disposition: partial. This is a measured internal host-state walkthrough and functional source/packed evidence. It claims no new visual-design acceptance, hosted browser pass, cross-browser result, independent maintainer approval, merge or release. Independent review and required PR checks remain pending. Continue the separate S4 startup diagnosis with the original content and deadlines; do not treat this isolated repair as resolution of that umbrella.
