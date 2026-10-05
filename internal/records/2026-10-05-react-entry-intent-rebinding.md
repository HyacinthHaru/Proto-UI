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
