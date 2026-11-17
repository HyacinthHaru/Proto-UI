# S4 Matrix theme publication scheduling

These four local Chrome runs share the static Chinese Matrix HTML from `5d4f9113`. Each run preserves 1,268 previewers, the 60s readiness assertion, and the 150s outer timeout. Each uses diagnostic asset overlays. Time in the table is measured from that run's own navigation.

| Scheduling arm | Observed Vue 2 Base Accordion boundary | Full page |
| --- | --- | --- |
| Timer | Current surface ready and appearance enqueued at 40.541s. No appearance read observed. | Readiness timeout |
| User-visible task | Enqueued at 36.066s. Appearance applied at 57.900s. Watch preparation enqueued with no subsequent owner watch read in the delivered trace. | Outer timeout |
| Microtask | Surface ready at 21.001s. Watch prepared and owner published at 21.011s. | Readiness timeout |
| Microtask with sparse publication samples | Earliest incomplete owner is WC Base Accordion at 128 publications and React Base Accordion at 256 publications, at 23.211s and 48.173s respectively. | Readiness timeout |

Publication counters are previewer events and samples report the first incomplete host at those instants. The last sample precedes the failure. The deadline-time first incomplete owner remains unknown. Timing across separate instrumented runs is descriptive.

The signed local source candidate `c37f9d5f` schedules the existing per-document batch with a microtask. There is one failing pre-change scheduling regression, 87 passing focused tests, and a passing workspace type check. The static diagnostic arms have separate artifact bindings. Full Matrix and Dialog product acceptance remain pending.
