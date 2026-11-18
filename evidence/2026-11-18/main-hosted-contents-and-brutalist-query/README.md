# Hosted Contents and Brutalist query timing

The scheduled run and browser job identify checkout `0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53`. These readings come from the original browser-3-of-10 job and its uploaded artifact. Eight Contents source hashes match the checkout, and the ten recorded Playwright source hashes match the local stock 1.58.2 dependency files. The JSON contains relative times, source hashes and original artifact hashes. [Hosted run](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045), [Browser job](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632266062)

## Contents

The Shadcn WC round passed its runtime predicate and recorded the click, Enter and Space close observations before the React switch. The next round failed the original one-second poll of `data-contents-runtime` at line 1003. The React preference event occurred about 1,773 ms before the matcher failed, approximately 772 ms before Playwright returned from the click. The first snapshot, about 224.5 ms after the verdict, saw active React generation 2 on Header, Contents and Search. A 236 ms browser long task started about 16.6 ms before the verdict. The available resource entries and post-verdict snapshots leave the exact publication timestamp and the timing of the original poll queries unobserved. [Exact predicate](https://github.com/Proto-UI/Proto-UI/blob/0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53/apps/www/src/content/docs/zh-cn/homepage-dogfood.browser.test.ts#L1003)

The historical `f9b4b9e1` same-runner failure remains a separate case. After the first WC handback, its second Enter opened Contents and the original scroll-position change predicate timed out. The retained executions at that head have no captured React failure.

## Brutalist

The third original family query started 741.8 ms before its SDK verdict and was still pending at that verdict. The Node selector and utility-context preparation reached CDP in about 1.52 ms. Both Node pipe writes returned true with zero queued bytes and no requested drain. Matching response bytes entered Node 1,240.6 ms after the transport call returned. Node needed about 0.93 ms more to return the original getter. The browser-side selector and getter ran near that response, and the getter returned `brutalist` within the same browser clock tick. A prior reading of this same run bound the family write at about 90 ms before the verdict. The artifact has no browser receipt rows, so the duration from Node send to the browser-side selector remains unpartitioned. [Same-run family write and original verdict](https://github.com/HyacinthHaru/Proto-UI/tree/ff7a384966ab019e26a6c5873d93d64ee572ea12/evidence/2026-11-18/main-hosted-brutalist-and-s4)

The observations preserve the original failure results and deadlines. Node intervals use one monotonic clock. Browser and Node cross-clock comparisons use their recorded time origins and are approximate.
