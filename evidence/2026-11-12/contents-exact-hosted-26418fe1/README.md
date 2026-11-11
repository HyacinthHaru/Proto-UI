# Final exact Contents browser and CI observations

Exact `26418fe1ba55e13bb4ede4fc4ad107e405c42b3e` passed both original hosted Contents journeys, all eight switch verdicts and 24 ordered sidebar returns. Shadcn React, Vue and Vue 2 measured 346ms, 342ms and 379ms. Brutalist measured 391ms, 311ms and 260ms. The original deadline remains 1000ms. The included focus-return and open-panel images are original exact-head captures.

The original Dialog file passed 8/8 with 196 observations and 120 images. The original Copy file passed 15/15, including the held-Header first Copy. The earlier `6d7a17eb` product source also passed two independent hosted executions. Its second Shadcn React and Vue observations were 319ms and 285ms.

The exact fork CI remains red. All eight browser jobs reported failure. Six reached their runner limit with exit 124. Shards 1 and 4 returned complete failing test summaries. Shard 1 included the separate Brutalist family-commit timeout and other failures. The general job stopped at 1614 coverage diagnostics, the same complete set as the current main control. Type checks passed with 1215 Astro files, zero errors or warnings and 30 hints. The package job built all 47 public packages and checked their manifests. Six of the nine size measurements exceeded their ceilings under the current Finf advisory policy.

[Exact fork run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759) · [Contents job](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759/job/130795062534) · [PR #1438](https://github.com/Proto-UI/Proto-UI/pull/1438)
