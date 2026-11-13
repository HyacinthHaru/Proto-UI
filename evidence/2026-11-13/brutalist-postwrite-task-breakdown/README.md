# Brutalist renderer work after family publication

The retained four original shard 1/8 AB/BA traces on one runner were clipped from the measured family write return to renderer entry of the original query. Each trace reported complete collection without loss. The interval lasted 510.604–544.486 ms. In each sample one renderer RunTask already in flight at the write consumed almost the entire interval. FireAnimationFrame occupied 487.093–520.910 ms, FunctionCall union 395.370–422.717 ms, UpdateLayoutTree union 111.280–116.660 ms and Layout union 17.272–18.982 ms. The intervals nest and are not additive.

The large generated FunctionCall groups include the WC disconnect microtask, connectedCallback, live palette notification and entry-refresh microtasks. Another callback maps to the documentation image viewer's family observer, which rebuilds its own controls and scans eligible media. Generated coordinates were compared with a local Vite 6.4.1 transform. The timing is attribution, not a claim that a callback can be removed or that its full time is avoidable.

PrePaint began 487.116–520.936 ms after the write; the renderer trace Commit started at 510.212–544.054 ms, just before the pending query entered the renderer. These are trace milestones, not physical screen presentation. A separate actual click geometry sample on a7952f1 at 320 and 390 px observed a 5 px Header gap and 8 px side margins at family mutation delivery and the following two animation callbacks. Geometry reads were excluded from the original timed comparison.

The a7952f1 fix reuses the already admitted media source for a new preview trigger label. The paired controller reads currentSrc twice before and once after; activation still validates and reads the current source. Exact local Chromium passed all 24 original image-viewer cases and 15/15 selected Homepage, Contents and Dialog originals. The full original same-runner fork comparison is running.

[Original AB/BA source and receipts](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43423158821) · [New original-shard comparison](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43438495099)
