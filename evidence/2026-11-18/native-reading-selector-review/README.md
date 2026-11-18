# Native reading selector review follow-up

The previous compiled assertion still required the old Homepage Runtime descendant selector. The review fix checks the actual canvas exclusion in both Tailwind-compiled reading rules. All size, leading, color, family and ownership assertions remain.

The preceding exact PR head reproduced the review finding with 36 passed and one failed test in the file. The correction passed 218 affected tests across eight files and all three original native no-script reading cases from production assets with unchanged product inputs.

The same 353-file non-browser Website inventory ran on the preceding PR head, the corrected test bytes and upstream main at 0f0955a9. The final candidate had 4,882 passing tests, 59 failed tests and three skipped tests. The preceding PR head has one additional failure at the old selector assertion. Upstream main has one additional failure at the original code-scroll inventory assertion addressed by the earlier commit in this pull request. The 59 remaining named failures occur on both preceding revisions. The candidate and main each report 12 unhandled errors. This inventory remains red.
