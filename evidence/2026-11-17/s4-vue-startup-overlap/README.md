# S4 Vue startup overlap

Both runs used the original zh-cn full DemoMatrix journey. The 1,268 previews, 60-second readiness assertion and 150-second outer test limit were retained. The English case was unselected. The two fresh, exact compositions differ in the renderer and its focused import test. Both include the React launch-order change, Bootstrap Dialog recipe fix and current split slot and scrollport review fixes.

| Variant  | Last delivered first-pending observation    | Verdict                             |
| -------- | ------------------------------------------- | ----------------------------------- |
| Baseline | Vue Base Accordion at browser +41.1165 s    | Original 60 s readiness wait failed |
| Overlap  | Vue 2 Base Accordion at browser +109.2065 s | Original 60 s readiness wait failed |

The last observation in the overlap run shows that WC, React and Vue were ready when that predicate executed. Both runs recorded zero page and console errors. The independently bounded post-verdict journal query expired in each run. The samples locate the first pending runtime in each run and do not establish a repeatable startup speedup.

A separate held-Adapter control reproduced delayed Vue package start before the change. The corrected focused import suite passed seven tests, including WC laziness and superseded owners. Final types checked 1,240 files with zero errors or warnings and 31 hints. The Vue change is local and the full S4 acceptance remains open.
