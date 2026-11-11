# Brutalist family commit and query dispatch timing

This is a local diagnostic on product source `c2251fd6c7c16629ba0976bf64e479e3ee1517ed` with three test-only tracing inputs, macOS arm64 Chrome 156.0.8078.79, the development toolbar and CPU throttling ×3. The original trusted family click, polling predicate and 1000ms deadline ran. An initial instrumentation attempt stopped at a missing import before the poll. The report describes the import-corrected run.

The original verdict was rejected at +1001.203ms. The browser family setter completed at +1279.866–1280.670ms. Original query 4 was already sent through the Node pipe at +348.147ms. Chrome's browser process received and forwarded CDP call 109 near +348ms. The renderer started that same command near +2049ms and spent 2.249ms inside it. Forwarding to renderer dispatch took 1701.086ms. The getter returned Brutalist near +2051ms. Times are relative to original Node poll start. The report gives calibrated bounds.

Renderer RunTask spans account for almost all the forwarding-to-dispatch interval. Style-tree updates overlap that task time. Weighted CPU samples include the canonical motion palette's CSS token reads before and after the family commit, with selection preservation before the commit and geometry reads after it. Those samples overlap the trace intervals and do not measure the effect of removing work.

The screenshot is the original failure capture after the verdict and shows the later Brutalist state. The prior hosted failure on the same product independently observed a setter after the original deadline, followed by a late getter. That hosted trace did not observe the renderer dispatch interval. The local result leaves hosted causality and the new Contents candidate verdict open.

[Separate hosted source run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43053262446)
