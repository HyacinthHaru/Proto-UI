# Contents review follow-up

The exact candidate is `26418fe1ba55e13bb4ede4fc4ad107e405c42b3e` (tree `175ef45a4a3fc722dac6653f668e37952fe52eee`). The canonical hosted comparison uses the matching base `b25229a94251398bc2f375554fcb9622dc8e79ab`. The [maintainer review](https://github.com/Proto-UI/Proto-UI/pull/1438#pullrequestreview-5867580129) identified the remaining verification work.

Ten focused files passed all 227 cases on the clean candidate, using macOS arm64, Node 24.21.0, pnpm 10.32.1 and one Vitest worker. The cases include first and recovery Docs Copy and Code preparation while Header is pending, cancellation on owner disposal, superseding replacement of a committed decoration, and the independent local previewer control. The receipt records each test file's Git blob and the original JSON report digest.

## Matching-base hosted comparison

Both hosted runs exercised the same Homepage test blob. The candidate passed all eight original Contents switches and 24 ordered sidebar returns. The matching base passed the first WC switch and stopped at the Shadcn React deadline at +1001ms. Shadcn React took 346ms and Vue took 342ms on the candidate. The remaining base switches have no verdict in this run.

The separate Brutalist preference case hit its original 1-second deadline in both runs. The calibrated browser write occurred before the candidate verdict and after the base verdict. Times are relative to the start of each original poll.

| Hosted checkout | Original failure verdict | Browser family write interval | Final original query start | Node pipe write returned | Final query returned `brutalist` |
| --- | --: | --: | --: | --: | --: |
| Matching main | +1001.486ms | +1005.198–1006.261ms | +316.397ms | +317.950ms | +1604.551ms |
| Candidate | +999.875ms | +649.933–650.649ms | +213.268ms | +214.682ms | +1036.408ms |

The candidate query was still outstanding at the verdict. The available pipe markers bound the delay from Node's write to its read dispatch. The browser-side wait within that interval remains unassigned.

The general-job coverage diagnostic multisets each contain 1614 entries and match exactly, including multiplicities. Shard 4 has the same ten failure headings on both sources. The browser gate remains red on both runs. The candidate's full earlier evidence includes the named Dialog and Copy runs, type and package checks, and the separate shard outcomes.

- [Canonical main run](https://github.com/Proto-UI/Proto-UI/actions/runs/43112160868) and [main Homepage job](https://github.com/Proto-UI/Proto-UI/actions/runs/43112160868/job/130832993579)
- [Exact candidate run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759) and [candidate Homepage job](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759/job/130795062534)
- [Exact candidate browser and CI evidence](https://github.com/HyacinthHaru/Proto-UI/tree/91f25a5be6ae1b04a884e90703ab909fb80d34f3/evidence/2026-11-12/contents-exact-hosted-26418fe1)
