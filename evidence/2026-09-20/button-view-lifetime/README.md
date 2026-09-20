# Button view lifetime evidence — Issue #650

This packet records the actual retained-owner Button regression and candidate verification for [Proto-UI/Proto-UI #650](https://github.com/Proto-UI/Proto-UI/issues/650). It belongs on an evidence-only branch and is never merged into the product branch.

- Public baseline: `650895ec12fca740a9e716f96913d0f5e3963e8d`.
- Candidate commit: [`4eb1c0292ea6d7985e3e1d696e241f46f7ac48cc`](https://github.com/HyacinthHaru/Proto-UI/tree/4eb1c0292ea6d7985e3e1d696e241f46f7ac48cc).
- Product change: Button registers its existing transient-interaction cleanup with the existing `onUnmounted` lifecycle hook. Only `pressed` and `hovered` are cleared; state handles and application state remain retained.
- Environment: macOS, Node 22.23.2, pnpm 10.32.1, Chromium 153.0.8010.48. Source-resolved framework dependencies: React 19.2.6, Vue 3.5.31, Vue 2.6.14; protocol tests use happy-dom 15.11.7.

## Executed comparison

The final browser fixture was run with only the Button product file restored to the public baseline, then with the five-line candidate restored. Its test SHA-256 is identical in both runs. All eight baseline cases fail at the intended stale `pressed=true, hovered=true` assertion. All eight candidate cases pass.

Each family (Brutalist and Shadcn) is rendered through the actual WC, React, Vue and Vue 2 Adapters. A private consumer delegates the real package export and adds the public `run.lifecycle.setPresent` control and observation only. It does not write interaction facts, override component CSS or create a replacement logical owner.

A real trusted pointer press is followed by actual detached epoch 1, an outside trusted pointer release, and mounted epoch 2. Setup runs once and the public state handles remain identical. WC retains its shell; the framework Adapters replace the physical root. The baseline retains the press/hover paint; the candidate returns to its initial resting paint. Candidate journeys continue through hover-only detach/remount, fresh pointer activation, native Tab/Enter/Space, disabled mid-press and terminal disposal with no extra outward activation.

The protocol regression covers direct Base Button, asButton, Shadcn and Brutalist through a real RuntimeSession with controlled semantic EventTargets. The baseline has four intended failures and four ordinary controls pass; the focused candidate run has 25 passes across five files. A later two-line TypeScript correction uses the actual `OwnedStateHandle<string>` return type; the resulting eight protocol cases and workspace tsc pass without assertion changes.

## Images and observations

`baseline/` and `candidate/` contain the original PNG bytes and measured JSON observations. Every published image was directly inspected, with byte-identical images sharing an inspected representative. Remounted pairs show the actual component beside an untouched control. Candidate keyboard-focus frames retain full focus rings. The WC initial, pressed and detached frames show the surrounding sequence.

The baseline stops at its first expected failure; later hover-only, keyboard, disabled and terminal fields are candidate evidence only. The browser scope is Chromium, light/default presentation and mouse/keyboard. It is not a Firefox/WebKit, touch/pen, every-variant, assistive-technology or installed-tarball claim.

## Reproduction sources

Run the maintained tests from the candidate checkout with Node 22 and Corepack pnpm 10.32.1:

```sh
corepack pnpm@10.32.1 install --frozen-lockfile
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/button-view-lifetime.test.ts --maxWorkers=1 --minWorkers=1
corepack pnpm@10.32.1 exec vitest run apps/www/test/button-view-lifetime.browser.test.ts --maxWorkers=1 --minWorkers=1
```

The browser suite uses the repository's existing Chrome executable discovery. It prints the temporary evidence directory. No hosted production page, external account or special fixture state is required.

`reproduce/` preserves the reviewed test and fixture files. Their repository destinations are `packages/prototypes/base/test/button-view-lifetime.test.ts`, `apps/www/test/button-view-lifetime.browser.test.ts`, and `apps/www/test/fixtures/button-view-lifetime/{index.html,main.ts,vite.config.ts}`. To replay the baseline, use an isolated checkout of the public baseline with these test/fixture files copied into those destinations, retaining the baseline Button product source. Expect the stated failures; a green baseline would contradict this packet.

## Retained calibration failures

Earlier runs are retained in `logs/` and are not counted as final product results. The first browser fixture used a `data-button` attribute that framework Adapters do not forward, so only the two WC cases reached the intended failure; the other six timed out on a selector. The fixture now uses the existing `data-demo-ref` surface. A later observation counted WC native clicks alongside outward CustomEvents, and attempted to call public exposes after Vue 2 had revoked them during terminal teardown. The final fixture counts the protocol signal and observes actual unmount/dispose diagnostics instead. It also waits for actual CSS animations to finish before comparing paint. No product change was made for these fixture mistakes.

Text logs remove terminal formatting and replace local checkout/evidence paths with placeholders. Original PNG images retain their bytes. JSON serialization may be formatted for repository style; every measured value remains unchanged. The manifest distinguishes these source-bound artifacts; local paths are not claimed as public uploads.

## Provenance and acceptance

Fixtures, implementation and evidence preparation were AI-assisted using the repository's existing MIT source and public issue evidence. Existing component attribution remains in the product source. An independent local Agent reviewed source, assertions, raw observations and pixels; that is not GitHub approval or maintainer acceptance. Full local validation passed on the unchanged candidate content: canonical test (2,362 non-browser runtime tests plus 115 browser tests), complete types including 224 Astro files, 43 package builds/manifests and all enforced budgets, 243 docs pages, release scan/dry-run, React packed consumer (38/43 packages) and CLI packed consumers (40/43 packages). See validation.json and logs. Existing TODOs and framework/tool warnings remain in the logs. No release was published; formal independent platform review and merge are still separate.
