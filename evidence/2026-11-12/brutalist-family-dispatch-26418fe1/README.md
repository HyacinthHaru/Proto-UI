# Brutalist family query dispatch and exact Contents regression

The product head is `26418fe1ba55e13bb4ede4fc4ad107e405c42b3e` on `b25229a94251398bc2f375554fcb9622dc8e79ab`. The clean local regression and the separately instrumented local failure have distinct receipts. The repository CodeExamples, product source, original tests, assertions and deadlines were preserved. The trace worktree uses only the three test/diagnostic edits in [probe-only.patch](probe-only.patch).

## Original hosted failure

The original hosted failure is from [run 43088111759, Homepage job 130795062534](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759/job/130795062534), artifact 13892977816. The family write was at +649.932–650.649ms. At the +999.875ms original verdict, the fourth original query was outstanding. Node wrote CDP request 14702 at +214.671–214.682ms and received its matching response frame at +1036.064ms. The matching utility-world selector entered at +1034.232–1034.949ms and reached the getter 0.700ms later. The getter recorded `brutalist` on the same page-clock tick. The original Node call returned at +1036.408ms. The archive has no Chrome browser command receipt/forwarding or renderer dispatch events for that request.

## Local controlled failure

Chrome 156.0.8078.79, macOS arm64, one Vitest worker and renderer CPU throttling ×3. The unchanged 1000ms preference assertion failed at +1000.848ms. The original in-flight query was the fourth query, CDP request 109. One trusted input marker aligns Chrome trace time with the page clock. Repeated same-root page samples bound page time against the Node poll clock. Times below are relative to the start of the original poll.

| Boundary                           |                      Time |
| ---------------------------------- | ------------------------: |
| Node started original query        |                +350.696ms |
| Node pipe writes returned          | +351.417ms and +351.424ms |
| Chrome browser command handler     |        +350.938–351.541ms |
| Chrome forwarded command           |        +350.941–351.544ms |
| Original failure verdict           |               +1000.848ms |
| Browser family write               |      +1279.796–1280.399ms |
| Renderer started protocol dispatch |      +2064.586–2065.189ms |
| Getter returned `brutalist`        |      +2066.496–2067.099ms |
| Node original query returned       |               +2067.925ms |

Chrome forwarded the command 0.003ms after entering the browser handler. The renderer started dispatch 1713.645ms after forwarding, with 1713.618ms overlapping renderer tasks. Dispatch took 2.347ms and the getter took 0.500ms at the page clock precision. The pipe return and Chrome receipt intervals overlap across the two clock domains. This locates the delay in this controlled run. The hosted sample retains its independently observed pre-deadline family write and unresolved Chrome scheduling interval.

The trace was complete without reported data loss. Context, trace stream and session closed. The renderer task interval contains about 523ms of style-tree updates and 57ms of layout. Sampled stacks include canonical motion palette CSS reads and Typography selection work before family publication, with geometry and style reads after publication. These samples identify where time was spent and do not establish which work can safely be removed. The two failure timings provide no verified C-group source fix. The post-verdict image shows the later Brutalist state, with no implication about the state at the original verdict.

[Local failure after the verdict](brutalist-after-rejected-verdict.png) · [Same-failure protocol receipt](probe-dispatch.json) · [Renderer profile summary](probe-performance.json)

## Clean exact local regression

The original two named Contents/mobile shell cases and all eight Dialog available-space cases passed. Eight other Homepage cases were filtered. All eight Contents runtime switches and all 24 click/Enter/Space sidebar handbacks retained their original assertions. Shadcn React and Vue returned in 226ms and 217ms. Brutalist React and Vue returned in 249ms and 200ms. Dialog captured 196 observations and 120 images. The Vitest terminal summary and JSON agree on 10 passes. A zsh wrapper error happened after Vitest finished and prevented capture of the child exit code.

[Exact run receipt](exact-regression.json) · [Shadcn React Contents open](shadcn-react-public-popover-open.png) · [Brutalist React Dialog at 200%](brutalist-react-long-font200.png)

The named regression is distinct from the complete hosted browser gate, which remains red. The [prior matching-main comparison](https://github.com/HyacinthHaru/Proto-UI/tree/9e6b0bf695a7485855d22665ed2bcafd2f3fd113/evidence/2026-11-12/contents-review-follow-up-26418fe1) retains both hosted outcomes.

## Search follow-up

The [#848 props.ts A/B plan](search-848-props-ab-plan.md) and [checked one-file intervention](search-848-props-equal-write-B.patch) are prepared for review. They were not executed. Five review threads on #1435 remain open.
