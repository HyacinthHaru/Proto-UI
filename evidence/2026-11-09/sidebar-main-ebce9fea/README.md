# Sidebar and Dialog on main ebce9fea

Tested source `ebce9feae890d8b9b318e1da82611331ceeb0e19`, tree `c0f5054032334b7c96ba296ac547d67441388083`. Node 24.21.0, pnpm 10.32.1, macOS arm64, Chromium 155.0.8059.39. The three #1299 files are byte-identical on the PR head, merge commit and tested main.

| Execution | Outcome |
| --- | --- |
| Clean main, original Contents journey | Failed at Shadcn WC → React publication, original 1000 ms budget. At the first post-verdict sample (+1492 ms), WC was active and React staging. At +3239 ms, React was active. Three WC closes had already completed. |
| Main, disposable CDP observation copy | Same original failure, three WC closes. Sampling over the transition and late observation attributed ~1444 ms inclusive to CSSOM dependency discovery and ~976 ms to external-ancestor focus eligibility. These sampling intervals can overlap and the profiler can affect timings. |
| Clean merged PR head bcfcc0b1, same machine | Passed the unchanged journey, 24 closes. Shadcn React assertion completed in 247 ms. |
| Main, remove seven CodeExample instances from Shadcn Button page temporarily | Passed the unchanged journey, 24 closes. Shadcn React assertion completed in 169 ms. This intervention is diagnostic. The original page was restored byte-for-byte. |
| Clean main, original Dialog journey | 8/8, 196 observations, 120 PNGs. Original 150 s case limit. |
| Clean main, focused controls | Contents source-host 11/11. Dialog classifier, runner integrity and input path controls 113/113. |

The observed website timeout precedes React handback. The CodeExample workload is an experimentally supported contributor. The Web Component Focus Entry call stacks identify where work accumulates, without isolating one stylesheet invalidation source. The first screenshot is after the late React observation, not the instant of the timeout. The second screenshot is the settled 390 px Shadcn/WC Dialog. Both images were inspected.

The Dialog inputs still match CURRENT closure 50f13884 / 3b425734 / 4bbc332f. Independent calibration is pending. The earlier [official pair](https://github.com/Proto-UI/Proto-UI/actions/runs/41643601508) remains 8/8 candidate and 0/8 fixed baseline, with `Uncalibrated probe closure`. This local run adds candidate evidence only.

For #1191, artifact 13554499442 from [official job 128258563286](https://github.com/Proto-UI/Proto-UI/actions/runs/42325138367/job/128258563286) was downloaded and verified against the service SHA-256. The run is bound to 94e1c11f and has 30/32 passes. Brutalist WC and Vue2 light 390 px still fail the original 1000 ms wheel-scroll assertion. The seven previously failing geometry cases passed. The guarded Popover journey requires hosted CI for a new current-main receipt.

`summary.json` contains measured timings and runner receipts. The archive manifest lists raw and public hashes. Machine paths in text are sanitized, PNG bytes are unchanged, and unselected PNGs are provided as raw evidence. The original hosted ZIP remains linked at its source. AI assistance: Codex.
