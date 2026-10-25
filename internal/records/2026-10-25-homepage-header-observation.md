# Homepage Header observation repair (#984)

Agent: dot
ModelTrace: not measured — owner-authorized dot exemption (2026-10-06)

This is a bounded diagnostic and integration record, not a new normative contract.
Parent: `1dcd9545d6dadeb0e04491653d51124aaff1a467`, downstream of #982.

## Observed failure and responsibility

The [exact-head family job](https://github.com/Proto-UI/Proto-UI/actions/runs/40161123886/job/121072720386)
reports 7 passed / 9 failed: eight Shadcn cases stop at background alpha 0 versus
255; Brutalist/React/dark stops at the immediate focus ring token assertion.
The 39,628,539-byte artifact was not downloaded because it exceeds the available
32 MiB transfer limit. These findings use the official log and source comparison,
not a claim that all artifact screenshots were inspected.

The current probe reads paint from Select Content, which owns lifecycle. The
accepted family composition places paint on its Surface. The owner's
[source-bound QA](https://github.com/Proto-UI/Proto-UI/pull/921#issuecomment-6284852882)
documents that division and historical 16/16 evidence for
`6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0`. Historical evidence is not acceptance
of this downstream combination.

## Bounded correction and provenance

Integrate HyacinthHaru's existing `readHeaderPopupPaint` implementation from
that exact commit. Shadcn paint must come from exactly one Surface whose closest
listbox is the target Content, with matching nonempty owner and generation.
Missing, duplicate or stale Surfaces throw instead of falling back or selecting
whichever descendant passes. Content still supplies transition state and
animations. Non-Shadcn Content continues to supply its own paint.

Integrate only the corresponding popup shadow/token observation and real native
focus readiness hunks from `header-select-elevation.browser.test.ts`. The latter
polls actual focus and the complete ring-2 token within the existing matcher
budget, then retains the original final assertions. It adds no arbitrary sleep,
input replay or deadline extension. Background/text alpha 255, opacity 1,
contrast at least 4.5 and all existing geometry/shadow/focus assertions remain.

The accepted source also removes a narrow Shadcn +1px pressed pose expectation.
That is a separate oracle change, so this patch deliberately retains current
`pressedY` unchanged. After the earlier popup failure is removed, later press
or focus cases may expose independent failures; do not preemptively waive them.
No production component, Adapter, Compiler, IR or original owner branch changes.

## Added regression controls and actual validation

Eight additive unit cases cover matching Surface paint distinct from transparent
Content (including nested-listbox isolation), missing/duplicate/wrong-owner/
wrong-generation Surface, missing Content owner/generation, and non-Shadcn
self-paint. The unit canvas fixture is not real-browser pixel evidence. Existing
settling, contrast and self-contained serialized-callback tests are preserved.

Guarded TypeScript checking of the three changed TS files reports zero targeted
and zero transitive diagnostics. Actual focused Vitest invocation stops before
collection with Rollup `ERR_DLOPEN_DISABLED`; no unit pass is claimed and native
addon permission was not enabled. No local browser acceptance was performed.
New exact-commit official family tests and source-bound screenshots are required.

Separate #984 outcomes remain visible: density 28/28 demonstrates 44px narrow /
36px wide Header sizing; Hero composition remains 9 passed / 2 failed for the
second React/Vue Home/Enter closure; general CI stops at 79 public-docs drifts
before units. This observer patch does not fix or accept those separate failures.
Keep the PR stacked and Draft pending remaining evidence and review.
