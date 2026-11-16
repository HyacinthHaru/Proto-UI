# React previewer import overlap

A deferred Adapter import leaves the old code with zero React package-load calls while the independently available runtime wrapper waits. The signed change starts package loads for the three current renderers before that Adapter import resolves. The same tests cover WC import laziness, superseded owners and loader failure. The combined focused tests pass 65 cases, and the standalone workspace and Astro type checks pass.

The two local combinations share current main and the same three S4 repairs. Only the previewer import ordering and its regression test differ. Separate fresh worktrees ran the unchanged original Chinese DemoMatrix S4 case sequentially with one worker and pinned Chrome 156. The English case was unselected. Both counted all 1,268 cards and recorded zero browser errors.

- Baseline last sampled the initialized React Base Accordion with no host children and ultimately reached the outer 150-second timeout.
- The overlap candidate moved the first pending sample to the Vue Base Accordion. The same predicate had accepted the preceding WC and React previews by that observation. The candidate ended at the original 60-second readiness wait before its interaction journey. Its final snapshot collection also timed out.

The comparison demonstrates the changed React startup dependency and observed movement of the readiness boundary. Full matrix completion still requires work.
