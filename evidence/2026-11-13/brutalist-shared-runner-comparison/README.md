# Brutalist original shards with a pinned browser and shared runner

Each job ran both arms of the corresponding original 1/8 or 3/8 shard sequentially on one runner. The product source was clean and retained the complete suite list. The browser executable was Chrome for Testing 157.0.8103.50, with the same binary and archive digest in both arms. Node 24.22.2, pnpm 10.32.1, the frozen lockfile and the CJK font package were held fixed. Each arm had a separately prepared worktree, browser and documentation server. The order was baseline then candidate. Shared machine cache, scheduling and order can still affect the measurements.

## Historical f58c7af3 to prior product 29a61c4

Both arms retained the original family failure and both complete traces. Contents, mobile shell and Dialog 8/8 passed in each arm. Both containing jobs are red.

| Observation, in ms                                    |          f58c7af3 |           29a61c4 |
| ----------------------------------------------------- | ----------------: | ----------------: |
| Original 1-second rejection                           |          1001.144 |          1000.331 |
| Family write after poll                               | 1281.696–1283.405 | 1067.638–1069.370 |
| Browser forward to renderer dispatch                  |          1648.340 |          1426.310 |
| Renderer dispatch duration                            |             1.992 |             1.736 |
| Node received original result                         |          2018.459 |          1737.583 |
| Before-write Typography selection sample weight       |            79.796 |            76.927 |
| Before-write canonical palette property sample weight |            96.766 |            86.787 |
| After-write Header geometry sample weight             |           104.128 |           101.560 |

The f58 geometry sample maps to the active Button. The 29a sample maps to the Header root rectangle in Homepage publication. Typography maps to selection boundary capture during the active generation, and palette samples include observer and resident motion calls. A same-binary same-runner comparison controls the runner environment within each shard. Multiple product changes and fixed arm order remain. Sample weights overlap trace intervals and do not estimate isolated savings.

The separate S4 receipts remain in each run record. They report the existing unsupported owned-decoration startup failure where captured, with no terminal outcome inferred for a missing receipt.

[Historical to prior product paired run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43410821425)

## Isolated Header attribute change from 29a61c4 to 1e3f268

The original browser fixture and diagnostic helpers are byte-identical in both tested carriers. Only the Header source, its focused unit test and coverage fingerprint differ. The prior product ran first. Shard 1 used the same Ubuntu image revision as the historical pair and an AMD EPYC 9V74 runner. Both arms within this pair shared that same runner and Chrome binary. The two pairs are independent comparisons.

| Observation, in ms                                    |           29a61c4 |         1e3f268 |
| ----------------------------------------------------- | ----------------: | --------------: |
| Original 1-second rejection                           |          1000.266 |        1000.547 |
| Family write after poll                               | 1045.254–1046.478 | 953.937–958.875 |
| Browser forward to renderer dispatch                  |          1378.308 |        1266.721 |
| Renderer dispatch duration                            |             1.548 |           1.830 |
| Node received original result                         |          1649.590 |        1509.042 |
| Before-write Typography selection sample weight       |           105.167 |          93.008 |
| Before-write canonical palette property sample weight |            79.963 |          74.914 |
| After-write Header root geometry sample weight        |            91.656 |          84.764 |

Both complete traces bind the same original third query in their respective runs. The repair arm published the family before the deadline and returned the original query after it. Both arms passed the named Contents and mobile-shell cases, all eight Dialog cases, and Sidebar 7/7. Both containing jobs failed with the original wrapper limit. The report includes the sampled current anchor-node, live CSS property and Header root reads with their source coordinates. The source repair earns the demonstrated removal of three equal attribute writes. A single fixed-order pair does not establish a latency gain or meet the original family gate.

[Isolated Header change paired run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43411772231)
