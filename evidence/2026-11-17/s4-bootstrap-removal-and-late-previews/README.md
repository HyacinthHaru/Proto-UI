# Preview owner cleanup and late Bootstrap previews

Signed product candidate `58f38cdca1657b6a17eb4ae48856462b4a3d6628` checks pending preview connections only when a mutation delivery includes an element removal. Tests retain direct removal, ancestor removal, a preview moved within the document in the same delivery, Astro swaps, and teardown. The final test fixture exposed one unnecessary connection read on its parent and passed with the change. The first test attempt used an inherited-getter spy that recursed. The final red and green used the same corrected fixture.

The candidate passed 182 focused tests. Its exact build contains 47 packages and 685 pages. Workspace types, manifests and the active Finf budget policy passed, with all nine budget rows matching the previous build. Eleven selected Contents, Dialog and Runtime Tabs browser cases passed. The checked article kept nine CodeExamples and the Header first-frame checks passed at 320px and 390px. Both original bilingual S4 readiness cases still timed out before Dialog. Each retained 1,268 previews, the 60-second readiness check and the 150-second case limit.

## Delivered removal observer checkpoints

At the last delivered checkpoint of 2,816 callbacks in each of two separate executions, both runs had 1,268 tracked previews.

| Delivery type                  | Previous product checks | Candidate checks |
| ------------------------------ | ----------------------: | ---------------: |
| Additions without removal      |               1,799,292 |                0 |
| Removals containing no element |                 356,308 |                0 |
| Removals containing an element |               1,415,088 |        1,408,748 |

The previous two skipped groups spent 28.0 ms in the observer's connection scan. The groups had different delivery counts and the measurement excludes guard and notification overhead. The result measures avoided checks, with no whole-page speedup established. Scoped tests independently exercised real disconnection and same-delivery moves.

## Bootstrap preparation in the candidate observer run

The Chinese full-matrix observer captured one Web Components Calendar and one Drawer. Times are seconds on that browser's page clock. The resource column is the latest recorded response end among the root loader's mapped Vite entry and dependencies.

| Preview | Demo start / return | Latest mapped response end | Entry body start | First child at render return | Publication |
| --- | --- | --: | --: | --: | --: |
| Calendar | 30.750 / 47.949 | 47.960 | 59.998 | 60.564 | 68.107 |
| Drawer | 46.016 / 50.472 | 50.477 | 69.465 | 69.550 | 71.377 |

The marked entry bodies ran for less than a millisecond before the registered prototype loaders returned. The gaps capture time between resource response and observed entry execution, which can include dependency execution, module preparation and scheduling. They do not isolate a single cause. Demo lookup and load also warranted separate measurement, especially the 17.2-second Calendar interval. These component markers are distinct from the original readiness predicate. Its bounded stream last reported Shadcn Tree in this observing run, and markers can arrive after the deadline. All temporary files were removed or restored byte-for-byte.
