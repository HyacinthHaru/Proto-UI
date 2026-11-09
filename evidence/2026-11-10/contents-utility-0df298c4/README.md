# Contents runtime publication and getter timing

Local Chromium 155.0.8059.39 on macOS arm64. Both diagnostics are based on `0df298c4b48c2e4805ec7ce81b5644c0f4e5aef5`. Each uses a temporary copy of the original test and a temporary timestamp around the original application publication. The second run also observes the actual Playwright utility-realm getter. The application and test changes were removed after execution. They are distinct from the uninstrumented exact-head runs.

| Shadcn runtime | Browser publication after click | Last Node getter request | Native getter actually ran | Original assertion verdict |
| --- | --: | --: | --: | --: |
| React | 554.7–555.7ms | 587–672ms | 670.8–671.8ms | Passed at 672ms |
| Vue | 648.8–649.8ms | 671–923ms | 922.4–923.4ms | Passed at 923ms |

The original Vue success getter spent about 251ms before the native getter executed. The native attribute read itself was below this timer's precision, and the return arrived close to execution. The elapsed interval before the getter still includes selector work, command delivery and browser scheduling. It does not identify their separate contributions. The host wall-clock relation is bounded by a measured one-millisecond round trip for each runtime.

Both original 1000ms assertions passed in these diagnostic runs. This evidence does not explain an earlier failed run, establish hosted Vue margin, or replace the exact-head Contents regression. The actual isolated-world wrapper restored its native descriptor and detached for both selected runtimes. Source copies, receipts, output, and raw and published hashes are retained.

AI assistance: Codex.
