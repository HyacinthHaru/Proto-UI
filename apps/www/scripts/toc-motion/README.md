# Source-bound TOC motion evidence

This kit captures the restored shared TOC implementation at the exact candidate commit supplied to the runner. No additional npm package is needed (`apps-www` already pins `playwright-core@1.58.2`). The runner dynamically imports the target checkout's existing `reading-reference-contract.mjs` and `reading-reference-production.mjs`; preserve those strict source and network guards.

## Commands (from repository root, a clean committed candidate)

```sh
export COREPACK_HOME="${COREPACK_HOME:-/tmp/corepack}"
export PROTO_UI_EXPECTED_HEAD="$(git rev-parse HEAD)"
export PROTO_UI_TOC_ROOT="$PWD"
export PROTO_UI_TOC_OUT="$RUNNER_TEMP/toc-motion-$PROTO_UI_EXPECTED_HEAD"
export PROTO_UI_READING_EVIDENCE_DIR="$PROTO_UI_TOC_OUT"
export PROTO_UI_BUILD_RECEIPT_DIR="$PROTO_UI_TOC_OUT"
export CHROME_PATH=/usr/bin/google-chrome
mkdir -p "$PROTO_UI_TOC_OUT"
node --test apps/www/scripts/toc-motion/motion-contract.test.mjs
node apps/www/scripts/reading-reference-production.mjs begin-build
corepack pnpm@10.32.1 --filter apps-www build
node apps/www/scripts/reading-reference-production.mjs finish-build
node apps/www/scripts/toc-motion/capture-toc-motion.mjs
```

Use Node 24 and the repository's Corepack/pnpm 10.32.1 baseline. `CHROME_PATH=/usr/bin/chromium` is the installed cloud-computer equivalent; do not download a new browser or npm package implicitly. The browser runner creates only its own supported Astro production preview on loopback port 4397 (override `PROTO_UI_TOC_PORT` if necessary). It refuses external/shared-server URL overrides and refuses Astro's port fallback; it closes only the browser and preview it owns. No login, account profile or credentials are used. Service workers are blocked. Actual browser HTTP requests use the existing own-origin, no-redirect `routeOwnResponse` guard; external WebSockets are closed.

CI: run setup/install using the repository's existing workflow steps; then the above commands. Use `actions/upload-artifact@v4` with `if: always()`, a SHA-bound artifact name, and the entire `$PROTO_UI_TOC_OUT` path. Do not reduce the artifact to screenshots: preserve `toc-motion.json`, `production-build*.json`, `toc-motion.webm`, original JPEG compositor frames plus timestamps, screenshots, script hashes, console failures and build logs. `/usr/bin/ffmpeg` assembles original compositor JPEG frames with their variable timestamps into WebM; it does not synthesize tween frames. If unavailable/failed, raw frames remain and video encoding is recorded as debt.

Do not mark the run accepted simply because a video was created. A nonzero exit means failed assertions/setup. `status: partial` with only explicitly out-of-scope debt can still provide complete named Chromium observations; visual inspection of actual screenshots and motion remains required.

## What executes

- Initial/resting native current independently matches the last linked heading at or above the actual header+32px reading boundary; exactly one `aria-current=true` is asserted separately from the multiple `in-view` sections.
- Forward and reverse continuous Playwright wheel input. Browser-applied scroll offsets and trusted scroll/wheel events are stored separately from input requests. A post-animation-frame task samples real computed transform/width/height in container-relative coordinates, target endpoint geometry, range identity, visible/current link hashes and WC Surface identity. Static before/after images and pending layout invalidation without computed-vs-inline interpolation explicitly cannot pass the interpolation assertion.
- Native anchor click, actual fragment destination, current/visible state and resting range bounds.
- Desktop viewport resize, separate larger-text root-font reflow stress, native theme toggle, and supported document-family signal replacement. The text stress starts at 1600px so increasing rem does not inadvertently hide the desktop sidebar at its breakpoint. It is not browser zoom.
- One shared build feeds all 8 fresh-browser modes: 2 families × 2 themes × 2 motion preferences. Every mode performs continuous forward/reverse wheel input plus native anchor navigation. Normal motion requires real intermediate computed-vs-inline geometry; reduced motion requires zero transition duration and zero intermediate geometry in every sample, plus correct current/visible state.
- Actual remove/reinsert lifecycle of the same `sl-toc`, including removal with a pending resize invalidation; no detached updates/visibility and correct reconnected behavior. The triggering resize event is intentionally synthetic and labeled; custom-element lifecycle callbacks run natively.
- Fresh no-JavaScript context with SSR native anchors still working and the unenhanced range not painting.
- Fresh font context delays only own-site actual font network requests, samples the fallback/`document.fonts.status=loading` state, releases original bytes, records real `loadingdone`, waits `fonts.ready`, and checks resulting geometry. A geometry change is recorded rather than assumed. No fake font event or synthetic metric is used.
- Bounded geometry/performance observations wrap original methods without changing arguments/returns: no more than one product update per observed continuous-scroll rAF; at most 3 added range rect reads per update; at most 3 geometry writes; counters use actual requestAnimationFrame timestamps, not timer/sample indices; no layout rect reads after native-state/geometry writes in the same update; zero TOC updates/attributes during 60 settled frames. An empty instrumented sample fails. Observer measurement reads are excluded from product counters. These are local work bounds, not a CPU/FPS or whole-site performance benchmark.

All captures are the actual running candidate. Family and font-size signal injections are clearly labeled as controlled integration inputs, not native family-picker behavior. No screenshot, inline token string or geometry assertion alone establishes that paint is visibly correct; inspect actual screenshots/video before using them publicly.

## Evidence boundary

The runner checks the candidate only. Historical baseline `411c354cfb` used a different unmarked highlight with no passive public Surface. It must be captured separately without rewriting its DOM; candidate evidence does not by itself establish historical visual parity.

Source bound means a clean exact Git head and a verified production-build receipt before and after capture. Syntax/helper test passes are not browser passes. Preserve the first failed run, fix any diagnosed runner or product defect, and rerun the unchanged acceptance boundary. The eight-mode Chromium matrix excludes mobile TOC, other browser engines, screen readers and whole-site elapsed performance; those remain separate scopes. Actual screenshots and continuous compositor frames still require visual review.
