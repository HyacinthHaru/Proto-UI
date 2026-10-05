# React retained entry review corrections

This is a bounded follow-up to #832 at `85691891044525ca525b374f5f02d5ea5a7abf20`. Draft `C-AS-FOCUS-ENTRY-0001-H` and `HC-FOCUS-TARGET-0001-C/D` govern latest distinct intent, actual event-owner readiness and bounded retries. No lifecycle promotion, author-facing option or privileged capability shape change is introduced.

## Review findings and correction

- `discussion_r4184804723`: a subscription captured the old event owner. Releasing a nested Trigger surface left the retained entry waiting on its empty readiness slot. Entry now uses the existing logical surface subscription, including its own owner, and rebinds the readiness source on fallback. Stale copied callbacks check both current owner and source; terminal cleanup releases both subscriptions. Focus still re-resolves entry policy rather than retaining the old DOM target.
- `discussion_r4184804739`: a new request inherited the preceding failed intent's exhausted layout budget. Each entry call now owns a private shallow options snapshot; retries retain that snapshot. React recognizes a distinct snapshot and resets its existing bounded budget. A generation check discards previously queued callbacks after supersession. Caller options may be absent, frozen or reused; their values are not mutated. The three-argument host capability and public facade are unchanged.
- `discussion_r4184804731`: direct readiness and one-target blur tests did not execute roving navigation. Their mappings now use narrow readiness/blur cases rather than crediting the roving case.
- `discussion_r4184804742`: both Module G and Host Capability D now reference the governing entry-H anchor.

## Evidence boundaries

The original source fails both new controlled regressions for the intended reasons: fallback readiness has no subscriber, and a new entry after exhaustion performs only one rejected attempt. The repaired source passes 89 focused tests across nine files, including retained-entry contract boundaries, repeated success, budget exhaustion, absent/reused options, and supersession while an obsolete callback is queued. These tests use controlled readiness sources or simulated DOM and do not substitute for native event ordering.

The graph regression's four assertions fail on the original mappings and pass after correction. The focused graph, relations, lifecycle and Adapter-schema suite passes 114 tests. Existing role-scoped cancellation and synchronous blur-observer policy is already governed by `C-FOCUS-0001-H`, `C-AS-FOCUSABLE-0001-G`, and `C-AS-FOCUS-ENTRY-0001-E`.

The native browser fixture additionally retains CSS rejection for the three two-frame layout retries, submits a distinct entry request while still rejected, then removes the CSS rejection and observes actual focus. This new assertion is not yet locally verified: the default sandbox rejects Chromium's socket and the escalated runner fails before command execution. Exact-head CI/native execution remains required.

The pre-main source package budget still fails: React 88,056 / 87,500 gzip bytes and Vue 87,256 / 87,200 on Node 24.19.0. Current-main integration and remeasurement are separate evidence; no ceiling was raised and no source-only budget success is claimed. Independent review and exact-head CI remain pending.

## Independent-review follow-up and current-main integration

Fresh independent review reproduced two additional boundaries before publication. A second closed-gate surface replacement could leave the subscription on the already removed first member; entry now subscribes through the stable logical group anchor, and the existing base surface notification includes that anchor even when its own view is no longer a member. This covers consecutive fallback/replacement and an empty group receiving a new member, without claiming arbitrary logical reparent support. Review also found that a disposed view's queued callback correctly stopped delivery but left the shared scheduled flag set; current-view disposal now releases that scheduling ownership without allowing an obsolete callback to clear a replacement view's work.

The original red evidence is retained. The expanded React lifecycle and four-web-Adapter Trigger suite passes 23 tests across eight files. Current main `b27e93a2f3b0dfae52dfa7f0473cca3f19d0d56f` is merged with history preserved; its single React readiness conflict retains acquisition-only gating and independent committed projection/blur.

The previously green #826 combination included the independent #824 budget proposal (`f48d895709fe58f861b3a37fb1e66948018f0028`), which is absent from current main. Its larger ceilings are not imported by this repair. Current-main source therefore retains a separate budget blocker; native CI and independent platform approval are also still required.

## Broader integration exposed the Text Control callback boundary

The first full local pass against the `f4886f19` tree passed 3,854 tests but failed the two existing Homepage React 19 composition/caret assertions: after `compositionend`, `A备注` retained selection 2 rather than 3. The same unchanged cases pass on main `b27e93a2`, so this was treated as a real integration regression rather than a flaky test. The initial command also accidentally included the separately owned production-search browser suite; its missing production-runner error is a command-selection failure, not a Focus assertion. The corrected general plan is rerun separately.

Independent instrumentation located the first wrong transition in Text Control: `receive` cleared `composing` before entering Runtime callback scope; that scope drained an older controlled-props task, and `syncLease` projected `A备`, clamping the actual caret from 3 to 2. The later accepted `A备注` patch correctly preserved the already damaged caret. Reverting only the new Focus notification gate made the Homepage case pass by restoring an incidental props flush. Reverting kernel phase restoration or restoring the old shared-target gate did not fix it. None of those diagnostic reversals is adopted.

Draft `C-TEXT-CONTROL-0001-D/E/F/G` already governs callback-boundary restoration, composition preservation, lease revocation and editing-session continuity. Text Control now acquires a true composing state before callback entry but releases it only when the actual listener callback begins after the old props prelude. It checks the captured lease epoch before changing composition state or delivering an event. Canonicalization and uncontrolled input adoption retain their existing positions. No owner value, selection expectation, Focus gate, retry bound or public API is weakened.

Five focused callback-prelude cases preserve first `compositionstart`/composing-input protections, reject stale ending projection, and reject start/end event delivery after a prelude replaces the lease. The old implementation fails three assertions while both starting-composition controls pass; the repaired implementation passes all 30 module cases. An independent four-case seam probe and both unchanged Homepage React 19 cases also pass. These are simulated-host/React integration results; native IME and exact-head CI remain separate.

### Ordinary native input shares the same prelude boundary

Exact-head CI `37345002346` for `f4886f19` independently confirmed the two Homepage React 19 IME failures and a real-browser ordinary-fill failure: `shadcn/react` had the correct `shadcn / react` value but caret 0 instead of 14 (`home-demo-runtime.browser.test.ts`, job `111881336272`). The composition-only candidate therefore did not complete the repair.

A normal non-composing `input` with older controlled props draining before its listener reproduces the same premature value projection. A short-lived, identity- and lease-epoch-bound callback-prelude barrier now withholds controlled value projection until the actual event listener begins. It does not report a false composing fact, delay uncontrolled input adoption, or block a replacement lease's initial owner value. The barrier releases only its own token and is restored in `finally` on exceptional entry. The initial composition fix remains, including the epoch check before old-event delivery.

The ordinary-input probe is red on the composition-only candidate and green after this extension. The focused Text Control and unchanged Homepage suite passes locally; independent probes additionally check thrown preludes and a replacement lease starting composition before the old callback returns. Native fill must still pass on the newly published exact head. A general run started on the intermediate composition candidate was explicitly interrupted when source changed; its partial output is not presented as final-head evidence.

Main subsequently advanced to `4a2320762ba5f4319dec1915ca4e138772dceb0c` through #815. Its already merged documentation and WC fixes are integrated without changing that PR branch. This also brings the actual passive-atom evidence script that the earlier independently running workflow referenced before it existed on the older source.
