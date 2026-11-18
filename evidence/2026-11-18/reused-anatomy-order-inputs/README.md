# Live Anatomy order input reuse

Exact contributor head `d50e4b8dd4cec3b46982584615f98c5cf4df783f` retains the arrays that belong to the current notification's sorted order snapshot when every live value still matches. Each reader resolves every target before reading its comparator functions. A change in either sequence takes the existing fresh sort path. The existing synchronous callback and reentry boundaries still clear those snapshots.

The Runtime regression on the parent counts 13 claim-array mappings and 12 target-array mappings for 12 stable subscribers. The candidate counts two and one. Pinned Chromium 156.0.8078.79 repeats the same result in parent, candidate, candidate and parent order. All arms keep 156 live target reads. The same real DOM move gives each reader one changed notification. A separate native steady fixture with 56 claims, 28 readers and 384 notifications per timing batch has per-arm median times of 16.4, 11.9, 11.4, 15.8 ms, with every measured batch retained.

The last delivered sparse observation at page time 74.465 seconds records 3,604,480 eligible order reads in one emitted site-shadcn-controls asset. The target array is reused 3,153,629 times and the comparator array 3,153,629 times, for 6,307,258 total avoided array rebuilds in that delivered prefix. Simultaneously it observes 779 of 13,516 structural notifications entering with an empty order-subscriber list. The original asset, runner and both Matrix HTML inputs were restored and checked.

The exact contributor combination builds 47 packages and 685 pages, passes workspace types, manifests and Finf measurement, 535 focused tests, 21 selected preview cases, 165 WC Shadow cases and five projection-scope cases. The original 1,268-preview S4 readiness assertions still fail in both locales with the 60-second readiness and 150-second case limits retained. The separate instrumented run uses the same original Chinese predicate.

[Earlier shared numeric signature proof](https://github.com/HyacinthHaru/Proto-UI/tree/624ea01fcd882ac45a65a3c3a19181d0fef7458b/evidence/2026-11-18/shared-anatomy-order-signatures)
