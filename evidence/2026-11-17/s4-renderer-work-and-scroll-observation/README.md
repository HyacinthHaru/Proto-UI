# S4 renderer work and Scroll observation

PR #1487 merged into main at `e485e75c`. Local signed `91e9fd6e` incorporates that main into the previously tested S4 composition. Its tree equals the tested `9ec40424` tree. All 173 focused cases pass on `91e9fd6e`.

A separate instrumented run on `9ec40424` captures 9,978 Chromium CPU-sampling intervals and a complete renderer-task trace. The 52.409–62.689s Table import interval includes samples attributed to theme-token reads, native content lease handling and Scroll follow-layout reads. These are sample intervals within the observed task trace. The preceding broad trace is capped at 96 MiB and covers only an early prefix.

Local signed `29468465` retains the installed Scroll observers when the ordered content and track targets and the observation mode remain equal. The regression reproduces an unnecessary rearm on its parent, then checks that geometry still updates and real child, track and follow-mode changes rearm. The separate Chinese probes both deliver a 2,048-call checkpoint. The parent has 2,008 stable inputs and the candidate reuses those registrations. The remaining 40 calls install or reconfigure observers. All 218 Scroll tests and all six native end-follow cases pass.

The built candidate completes 47 packages, 685 pages, types, manifests and the Finf budget command. Its packaged Accordion and Portal cases pass. Both full 1,268-preview Matrix locales still hit the original 60-second readiness assertion before Dialog. The original optical suite passes Light and public Button. Dark crosses the 20-control count and records 9 source uploads against the unchanged fewer-than-8 limit. In the separate matched upload diagnostics, the older tree reaches a dark DPR-stale timeout before stress and the candidate passes all three cases with one stress upload per theme. The original dark failure remains in the record.

The test-only 32-start budget reached 532 generic render starts by its last queue checkpoint. The original Chinese readiness timed out before Dialog. The budget is an emitted-artifact experiment on the compiled candidate. The original product Git tree and its assertions are retained.
