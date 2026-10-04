# Homepage motion and narrow-text regression repair

Source baseline: `c0f5c2e9a68900938923c11462bf4947229cea43`, PR #777.

## Actual failures

CI `37148887247` completed all eight browser shards; shards 1–4 failed. The exact-source Header evidence and typography workflows also failed. Header elevated Select retained two alternating hover/geometry states at its original left edge. English homepage at 320 CSS pixels and 200% root text size measured document/body width 360, although its native slogan surface width was 240. These are actual browser failures, not passing source inspections.

## Repairs and ownership

- Elevated Select and Button retain their existing +0.25rem/+0.25rem motion, hard-shadow endpoints, inherited state and native interaction owners. Their feedback now includes a generated transparent pseudo-element spanning the original and translated body. The feedback establishes a relative containing block. The utility is emitted on the same host, including lowered hover/pressed predicates, rather than adding a replaceable pointer-target child or an application-level event listener. Its inset accounts for the existing 2px structural border. Native GPUI keeps this Web-only generated-box behavior in an explicit `unsupportedSelectors` inventory and reports `UnknownToken`; its fixture generator must not silently classify pseudo-element declarations as harmless markers or flatten them onto the native owner. Default flat Select and popup remain unchanged; disabled still gates the host and its generated content.
- The app-private action Link surface no longer forces its English CTA into one unbreakable line. Its real Prototype owns wrap-anywhere and max-width, while the Hero's native anchor layout can shrink to available width. Content, font sizes, native destinations, selected family and runtime are preserved.
- Content-flow browser measurement now waits for actual projected controls, rather than interpreting the synchronous `data-inited` admission marker as an asynchronous render receipt.
- Homepage pointer coordinates are sampled after the real compact-to-desktop preference move and a layout-frame boundary. The pressed-state and displacement assertions are unchanged.
- Hover Card now moves the native pointer away before checking rest/focus/theme transitions. Synthetic pointerleave previously left the physical pointer over the moved trigger, so a later browser boundary event could restore hover. The original visibility/shadow/focus assertions remain.
- Typography failure reports retain overflowing nodes. Production Search failure reports now retain native h1 content/visibility and document readiness. The prior Search artifact shows successful HTTP200 main-document navigation and a visible Button destination, but its one-second heading assertion failed; that cause is not claimed fixed by these diagnostics.

## Verification boundary

Local Node24/pnpm10.32.1 focused tests pass 66/66 across four files, including the final motion token and generated CSS. Three focused native-fixture assertions and fixture regeneration/check pass. Workspace type check and Astro check (382 files, zero errors/warnings, three hints) pass. A local general run retained a delayed Copy family-synchronization failure; the exact isolated Copy suite then passed 15/15, so that full-run failure remains unaccepted rather than being erased. No local Rust run is claimed because cargo is unavailable. Full local general/type results and exact-head hosted browser outcomes are reported in the commit progress comment, separately. No assertion tolerance, viewport, runtime/family case, CI gate or polling deadline was weakened.

Local Chromium cannot open its required socket (EPERM), including the approved execution retry; the separate cloud browser rejects localhost. Therefore no local browser pass or new screenshot is claimed. Original Actions screenshots/measurements were inspected and keep their original baseline SHA. New screenshots must come from the new exact-head workflows before visual acceptance. No merge, deployment, credentials or protection changes are included.

Co-author by OpenAI Dots

## Current-main integration

The repair was published as `3ddc179c81663ede8c91048c2af00783606efacd` with the same tree as local `3741d07a`. GitHub then reported the PR as conflicting, so no pull-request Actions or new capture artifacts were created. Vercel reported preview success, but the actual cloud-browser route required Vercel login; no screenshot of the product could be obtained there.

Normal integration of main `d4bdb66b54d68625fb3da1109a76e0829c1e77d7` preserves its Shadcn Input, selection diagnostics and draft-family GPUI mappings. The only textual conflicts were the generated style fixture and additive fixture tests. The fixture was regenerated from the combined compiler; both upstream palette checks and this repair's explicit unsupported pseudo-element check remain. After resolution, 71 focused tests across five files, four focused fixture tests, workspace types and fixture check passed. Exact merged-head hosted browser evidence is still required; the integration is not a force push or a merge to main.
