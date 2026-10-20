# Header presentation and bounded query cleanup at 6a4e2b3d

Commit [`6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0`](https://github.com/Proto-UI/Proto-UI/commit/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0), tree `41adb1995907dde0fecd8a0bda72431aa952547f`, has parent `98932e8132ae4f3e1dacb9bf5967ebac481953ab` and includes accepted main `042f1e5740e1a809b9ca238593f5bb01a1f8a8e3`. This is a bounded C-group repair and diagnostic-cleanup increment in PR921. It is not feature admission, formal approval, an all-CI pass or a merge.

The ten files were frozen after formatting at 05:39 UTC on 2026-10-20. Final local checks record all ten changed/untracked source hashes before and after. Each hash was subsequently bound to the signed commit's Git blob. Those checks remain **precommit executions of 98932 plus the frozen candidate**; later Git equality does not change their original head, time or environment and is not a complete loaded-source census. [packet.json](packet.json) and the [raw/public map](raw-public-map.json) distinguish the source epochs.

## What changed

The Header's existing responsive padding was omitted from the full Shadcn Surface branch. The private original-case measurement was 20 px text + 8 px top/bottom padding + 2 px border = 38 px against the retained 36 px rest oracle. Homepage now opts into its existing padding variable through the app-internal composition configuration and existing Surface style channel. Generic Select defaults, auto height, wrapping, minimums and the 36/44 px expectations remain.

The actual Vue2 Header Escape negative in the **Node/Happy DOM fixture** had an owned entry in the public `preparing` phase. Synchronous leave retired that presentation before the existing late focus-return branch. Base Select now applies the same focus conditions before retirement **only in this phase**, followed by current-presentation guards for synchronous reentry. Other phases retain their original close/leave/guards/late-focus order. A captured focus error is rethrown after applicable cleanup. This Node fixture is the red reproducer, distinct from Chromium positives; four WC reopen/error controls already passed baseline and are nonregression controls.

Fixture changes are explicit. The Node fixture registers the actual Shadcn Surface/Viewport/ItemText parts. Popup paint evidence resolves the connected, uniquely identified, same-owner/generation Surface rather than its transparent positioning Content. The obsolete Shadcn +1 px pressed premise is reconciled to the current draft zero-displacement direction. Native-link sampling now waits for the same focused anchor's original `ring-2` token using the default 1000 ms poll before the original snapshot/assertions. That intentionally changes the snapshot time while retaining the original case deadline; it is not a production Adapter flush or a CSS fallback.

The family matcher and its 1000 ms verdict remain unchanged. Only post-verdict diagnostic drainage gains a **separate 1000 ms total observation budget**, shared across batches. Expiry neither cancels original query references nor converts late results into a pass. Incomplete capture avoids getter collection/restoration while a pending query could still invoke it; after the actual context-close attempt, only best-effort detach occurs. Metadata records actual close success and restoration-not-attempted. The timer is not a hard wall-clock guarantee under Node event-loop starvation.

The [source and causal walkthrough](source-walkthrough.md) links these observations to their owning layers and preserves the error/reentry limits.

## Actual local evidence

| Scope | Recorded outcome |
| --- | --- |
| Final Node combination | 132 files: **1821 passed / 4 failed**, exit 1. The four Checkbox Group token failures match retained names, predicate, serialized failures and selected unchanged inputs; this is not proof of one common cause or whole-import identity. |
| Final native combination | Shadow 111 + Homepage 9 + Header 16 = **136/136 passed**, 05:43:21–05:49:25 UTC, max1/min1, no name filter. The 16 Header sidecars contain **424 measurements**, with empty error arrays. Their `candidate-accepted` disposition is test-owned, not formal admission. |
| Types | **936 files / 0 errors / 0 warnings / 14 hints**. The CLI-only build is not a fresh 47-package build. |
| Catalog | **536 diagnostics, exit 1**. The complete retained log equals an earlier log byte-for-byte; this is not a fresh clean-main baseline or proof of each underlying cause. |
| Authoring | Base-aware authoring check exits 0 against main042f. |
| Preparing-close focused controls | Six files, **98/98 passed**. Original Header Vue2 negative becomes green; the four baseline-passing WC controls remain passing. |
| Query-budget units | **4/4 passed** using fake timers; not real browser scheduling evidence. |
| Synthetic pending caller | **0 passed / 1 failed / 8 filtered**, as expected. After one real backend return of `shadcn`, a private Node chain is held. Observation expires after **1001.613917 ms**, pending1/incomplete. Original failure capture/rethrow completes, context closes, Chrome exits0. Closed-target detach error and no-explicit-restoration remain recorded. This is not an actual renderer getter hang. |

Original negative runs and incomplete controls remain intact: both full Header 6/10 outcomes, the zero-case owner-probe setup timeout, later real observation arms, raw0's failed experimental premise, the run that executed only two normal controls after a preparing append failed, and the pending-control preflight that executed zero tests. Later positives do not rewrite them.

All 17 keyboard-owner controls and the original Homepage 171 matchers are preserved; the final Node run actually passes the owner cases. Mobile 390→430→320 reaches its 12 stages locally, without a new rejection. That local positive cannot classify the older DE mobile failure or replace current canonical evidence.

## Canonical evidence at this source

Canonical [CI39377429538](https://github.com/Proto-UI/Proto-UI/actions/runs/39377429538) is terminal **FAILURE**:22 jobs,13 successful and9 failed. The retained06:22:15 UTC snapshot is complete. Actual checkout `6da7be999c6054700279c0c180891f589c5bea12` has the exact `41adb1995907dde0fecd8a0bda72431aa952547f` source tree. Original acquisition records disclose ten duplicate read-only log downloads during collector handover; the package log was imported with its original receipt, not downloaded a second time.

| Actual current scope | Result |
| --- | --- |
| Four complete browser shards3/4/5/6 only | **437 passed /7 failed /15 skipped**. Shards1/2/7/8 exit124 without complete summaries; there is no all-eight test total. |
| Header original16 | **16 passed** in shard8; that whole shard later exits124. |
| Homepage original9 | **9 passed** in shard2, including Brutalist family and all12 mobile390→430→320 stages; no mobile rejection. That whole shard later exits124. |
| Other observed individual files | Collapsible36,Field25,color-scheme9,overlay-direction8,scrollbar16 andTooltip2 pass in their recorded jobs. These individual results do not make their enclosing shards or all C work pass. |
| General | 78 public-doc drift findings stop the job before ordinary Vitest. Local owner17 execution is not attributed to this job. |
| Types | 936 files /0 errors /0 warnings /14 hints. |
| Package | **45/47 actual package builds**,47 manifests,9 policy tests;4PASS/5ADVISORY. Not strict all-budget compliance. |
| Separate full-platform read06:24:22 UTC | 37 terminal workflows26success/11failure;105 check runs69success/36failure. Vercel fork-authorization status is separately retained. |

The current Homepage positive is not evidence that the older98932 one-second failure's cause was repaired. Main-CI Shadow/readiness, paint, Search and other failures remain individually recorded without a common-cause or inherited/flake label. Auxiliary evidence is separate: Accordion stops at apt repository403/unsigned metadata before browser tests; Dialog fails a verifier control (`processTimedOut`) before its matched browser run; Native-links has9pass/1fail at sidebar visibility, not the repaired ring predicate; Search has15pass/15fail split between seven initial-readiness/onTime and eight combobox-role predicates. One subsequent clean6a original Docs Shadcn320 local control passes its four-runtime loop (1pass/29filtered,06:27:59–06:28:13 UTC), without source/timeout/assertion changes. It neither explains nor closes the hosted15 failures. The raw full-platform snapshot retains a stale `previewBoundary` label naming2189; actual head/headEnd are6a4e, and no new preview artifact admission or rendered-preview result is claimed here.

## Selected original images

Root individually viewed the 16 selected final-candidate Header **viewport frames** below. They are two families × four runtimes × wide/light rest (1440×1000) and narrow/dark popup (390×1000). The original capture uses `page.screenshot({ path })` without `fullPage`; these are not full-scroll document screenshots or all-asset/production-artifact admission. The final run generated 560 PNGs; the other 544 are not selected or claimed visually assessed in this packet. The original review's “full rendered page” wording is retained with an additive frame-scope clarification.

| Family | Runtime | Capture | Original bytes |
| --- | --- | --- | --- |
| shadcn | wc | light / 1440 px | [Original PNG](images/shadcn-wc-light-family-1440-runtime-rest.png) |
| shadcn | wc | dark / 390 px | [Original PNG](images/shadcn-wc-dark-family-390-family-popup.png) |
| shadcn | react | light / 1440 px | [Original PNG](images/shadcn-react-light-family-1440-runtime-rest.png) |
| shadcn | react | dark / 390 px | [Original PNG](images/shadcn-react-dark-family-390-family-popup.png) |
| shadcn | vue | light / 1440 px | [Original PNG](images/shadcn-vue-light-family-1440-runtime-rest.png) |
| shadcn | vue | dark / 390 px | [Original PNG](images/shadcn-vue-dark-family-390-family-popup.png) |
| shadcn | vue2 | light / 1440 px | [Original PNG](images/shadcn-vue2-light-family-1440-runtime-rest.png) |
| shadcn | vue2 | dark / 390 px | [Original PNG](images/shadcn-vue2-dark-family-390-family-popup.png) |
| brutalist | wc | light / 1440 px | [Original PNG](images/brutalist-wc-light-family-1440-runtime-rest.png) |
| brutalist | wc | dark / 390 px | [Original PNG](images/brutalist-wc-dark-family-390-family-popup.png) |
| brutalist | react | light / 1440 px | [Original PNG](images/brutalist-react-light-family-1440-runtime-rest.png) |
| brutalist | react | dark / 390 px | [Original PNG](images/brutalist-react-dark-family-390-family-popup.png) |
| brutalist | vue | light / 1440 px | [Original PNG](images/brutalist-vue-light-family-1440-runtime-rest.png) |
| brutalist | vue | dark / 390 px | [Original PNG](images/brutalist-vue-dark-family-390-family-popup.png) |
| brutalist | vue2 | light / 1440 px | [Original PNG](images/brutalist-vue2-light-family-1440-runtime-rest.png) |
| brutalist | vue2 | dark / 390 px | [Original PNG](images/brutalist-vue2-dark-family-390-family-popup.png) |

The [synthetic pending-caller failure capture](images/pending-caller-failure.png) is a seventeenth image from a **different source epoch and run**. It is a late failure capture, not a deadline frame. All selected PNGs retain their original bytes; [images.json](images.json) maps both archive members and any outer image copies to their raw hashes. Copies at two locations are not counted as additional unique images.

Image inspection is not all-frame optical acceptance, all-page coverage, accessibility/AT validation, or a quantitative geometry/timing substitute.

## Authority and remaining boundaries

`P-SHADCN-SELECT-TRIGGER` (including the `STATE-DRIVEN-STYLES` criterion), `P-BASE-SELECT-CONTENT` and `HC-PROPS-SOURCE-0001` are **draft**. `STATE-DRIVEN-STYLES` is a criterion, not a separate entity. `A-REACT-18-19-0001` is active only within its declared React/Web profile. No lifecycle or stable-family admission is promoted by this repair.

The earlier [98932 query execution packet](https://github.com/HyacinthHaru/Proto-UI/tree/1978615f3bd027bdc5bfc6dfc84051dcc86ba630/evidence/2026-10-20/issue883-query-execution-98932e8) retains that official failure and its then-open unbounded-drain gap. Its late third getter is not evidence of a single-layer cause and is not rewritten by this increment. The [2189 family/mobile packet](https://github.com/HyacinthHaru/Proto-UI/tree/39c630a7003ded286f7ace7f7d7ef4ec38774194/evidence/2026-10-20/issue883-family-shell-2189bae8) remains separately sourced.

The complete06:22:02 UTC CLI coordination read still contains4 comments on#902 and10 on#890, with the latest entries being the existing own handoffs and no owner ACK. The [existing mailbox](https://github.com/Proto-UI/Proto-UI/issues/902#issuecomment-6268946005) and [routing index](https://github.com/Proto-UI/Proto-UI/issues/890#issuecomment-6269763641) remain the channels; no duplicate reminder or collector ownership transfer is claimed. The separate06:24 platform read has35 comments,0 formal reviews and0 review threads; metadata is not approval.

The [archive](records.zip) contains the selected evidence and a byte-identical embedded copy of the outer raw/public map. Text/source projections are sanitized derivatives with explicit transformations; they are **not the original executed bytes or standalone runnable recipes**. Raw ModelTrace material, private model context, operational handoffs, authorization and environment-policy files are excluded. Local reviews remain partial/ABSTAIN; a participating peer review is not relabelled independent formal approval.
