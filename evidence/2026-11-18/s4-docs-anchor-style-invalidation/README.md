# Document anchor matching during S4 publication

Pinned Chrome 156.0.8078.79 and exact signed combination `9ed1270c88dcd55a93b9e06eadbbc117695f2ee3`. All selected Chinese S4 runs retain the same 1,268 roots, assertions and 60/150-second limits. English is filtered for the probes. Source and emitted asset bytes were restored after each diagnostic.

The first wider Chromium invalidation trace reported capture loss and contained no paired Selection marks. A second capture began when actual publication started. Chrome reported no internal loss for that short window, and the client stopped reading at 96 MiB. Its readable prefix preserves 12 paired `anchorNode` intervals. Every recorded pair includes both `UpdateLayoutTree` and `Layout` on the marked renderer thread. The longest getter interval is 35.057 ms, including a 29.958 ms style update. In that window there are 1,613 attributed selector-match invalidation records for `.site-page-frame:has([data-docs-site-header]) main [id]`. This count refers to events in one recorded interval.

Two controlled stylesheet variants changed only the two PageFrame anchor selectors. Choosing Header by direct children but still putting `:has()` on the PageFrame retained most of the cost. Putting the condition on the Header sibling reduced anchor reads while physical moves retained similar measured cost. The phase monitor and exact assets are bound. All 656 compiled documentation Header markers inspected in the artifact have the expected direct Header/Frame shape.

| 640 delivered publications | Page time ms | Anchor reads cumulative ms | Physical move cumulative ms |
| --- | --: | --: | --: |
| original | 69988.1 | 14610.2 | 2533.4 |
| directHeaderChildren | 75677.3 | 14441.6 | 2789.1 |
| headerAdjacent | 50762.4 | 2911.7 | 2527.2 |

The stylesheet probes still failed startup readiness. They supply a selector-level performance result within this fixed workload. They do not establish general latency or a complete S4 pass. Each checkpoint represents delivered progress, and the raw trace prefix is retained locally by its hash. The source candidate additionally preserves original selector specificity with `:where()`; its own build and browser checks are separate from these CSS controls.
