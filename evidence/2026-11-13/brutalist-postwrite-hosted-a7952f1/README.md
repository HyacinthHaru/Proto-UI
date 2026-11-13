# Brutalist post-write workload on a7952f1

Original shard 1/8 and 3/8 were run with d854cae then a7952f1 on a single runner per shard. The Chrome for Testing 157.0.8103.50 binary and ZIP digests, Node 24.22.2, pnpm 10.32.1, CJK font and full original suite list are recorded. Both original wrapper jobs failed and kept their 900-second per-arm bound. The pair was fixed-order AB and shard 1 used an Intel Xeon 8370C runner, so its durations must not be pooled with the prior AMD AB/BA.

| Original observation, ms           |           d854cae |           a7952f1 |
| ---------------------------------- | ----------------: | ----------------: |
| Original poll rejection            |          1001.179 |          1001.003 |
| Family write after poll start      | 1285.515–1287.263 | 1165.356–1166.370 |
| Write to renderer query entry      |           709.264 |           682.051 |
| Renderer RunTask union after write |           709.240 |           682.032 |
| FireAnimationFrame overlap         |           671.221 |           647.870 |
| FunctionCall union                 |           573.285 |           543.683 |
| UpdateLayoutTree union             |           133.684 |           137.369 |
| Layout union                       |            22.417 |            23.152 |
| Query renderer dispatch            |             1.947 |             2.309 |
| Original Node query result         |          1999.439 |          1852.655 |

In both arms a RunTask was already executing at the write and occupied nearly the entire post-write interval. These nested intervals overlap. The generated WC disconnect microtask and connectedCallback dominate named callback groups. The image viewer family observer itself measured 24.344 ms then 34.137 ms. The repair removes one duplicate source read in the controlled admission test, and the single hosted pair does not establish a callback or end-to-end gain.

Both arms retained both named Contents/mobile cases, eight Contents switches and 24 ordered handbacks, Sidebar 7/7 and Dialog 8/8. The post-write renderer trace Commit started at 708.774 and 681.592 ms. This is a trace milestone, separate from the exact local native first-animation-frame geometry and visible ring evidence. The narrow ring occurs after the failed hosted family assertion and did not execute there.

[Owned fork run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43438495099)
