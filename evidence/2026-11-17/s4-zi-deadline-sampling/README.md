# S4 browser-side deadline sampling

The run used the same local Chinese Matrix HTML, early React and Vue script calls, and three instrumented assets as the [prior control](https://github.com/HyacinthHaru/Proto-UI/tree/d1b92921d3739f78e2ec32d3b55dec70ffcc36f6/evidence/2026-11-17/s4-static-early-vue-control). The 1,268-preview predicate kept its 60-second wait and 150-second outer bound. The sole test delta added a browser-local, short-circuit observer with a requested two-second timer cadence. Each sample was forwarded during the run.

The browser delivered three samples at 5.57, 12.45 and 34.56 seconds after navigation. At 34.56 seconds the first unmet predicate was the initialized but empty WC Base Accordion at index 0. Vue returned at 15.13 seconds and React returned at 40.91 seconds. Node recorded the original 60-second readiness failure at approximately 73.00 seconds after navigation. There were no additional browser-sampler rows in the intervening approximately 38.44 seconds. The post-verdict read reached its collection limit.

The final first-missing owner is unknown. The lack of timer samples brackets a diagnostic servicing gap, and the React return within that gap demonstrates other browser work progressed. The test reached no Dialog journey. The overlay, copied observer and compiled artifacts were restored after the run.
