# Brutalist AB and BA on the original hosted shards

The owned fork ran unchanged original shard 1/8 and 3/8 workloads. Within each shard all four arms used the same GitHub-hosted runner, a pinned and digest-verified Chrome for Testing 157.0.8103.50 executable, fixed Node 24.22.2, pnpm 10.32.1 and the original CJK font package. Each arm used a clean separate worktree and server. The original per-arm 900-second outer bound and all original test assertions and deadlines remained. Shard 1 image 20261111.196.1 ran on AMD EPYC 9V74. The execution order was baseline, candidate, candidate, baseline.

| Order and product | Family write after original poll start, ms | Renderer queue, ms | Node getter result, ms |
| --- | --: | --: | --: |
| AB baseline 1e3f268 | 855.794–856.597 | 1143.115 | 1375.053 |
| AB candidate d854cae | 845.823–846.654 | 1131.695 | 1359.545 |
| BA candidate d854cae | 869.900–870.773 | 1156.857 | 1391.410 |
| BA baseline 1e3f268 | 835.032–835.882 | 1156.363 | 1382.558 |

All four original 1-second polls failed even though family was written before the deadline. The candidate returned 15.508 ms sooner in AB and 8.852 ms later in BA. The complete no-loss traces retain a large renderer queue. The sample weights before the write were 65.677–67.447 ms for Typography selection and 71.400–84.749 ms for canonical palette; Header root rectangle after the write was 86.721–91.030 ms. The selection samples predominantly bind to the still-required anchor getter. Sample weights overlap and do not measure the savings of removing a getter. The regression proves the unused focus getter is skipped in the no-anchor case.

Both candidate arms retained eight Contents switches and 24 ordered sidebar handbacks, both named Contents and mobile-shell cases, Sidebar 7/7 and Dialog 8/8. All four arms observed Dialog 196 records and 120 captures each. Both containing jobs failed. The original Brutalist reconnect case stopped at its family assertion in the hosted runs, so the later narrow ring was verified in the exact local source and production preview. Separate first-animation-frame geometry observations and native palette/selection controls are indexed alongside the run.

[Owned fork run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43423158821) · [Product PR](https://github.com/Proto-UI/Proto-UI/pull/1438)
