# Split Dialog Mask admission after module effects

Reproduction for [the deferred sink review on PR #1498](https://github.com/Proto-UI/Proto-UI/pull/1498#pullrequestreview-5957621229). Chrome for Testing 156.0.8078.79 ran the actual Shadcn Dialog Root and Mask with synchronous scheduling and a visual sink factory returning null. The invalid companion lacks the same I1 hidden recipe in every run. The valid companion uses the same initial Root and Mask. Both fixtures reached the sink once.

| Exact revision | Invalid companion after append | Valid companion |
| --- | --- | --- |
| `ab2afce5e22d083ae1913ffdab49c748599d1230` | both mounted notifications, zero I1 reports | admitted and released |
| `b5e41dd601d67ba48cb5d030811f93394893116d` | both mounted notifications, zero I1 reports | admitted and released |
| `bc97737cafd789b404438cc9b9a236e7fca01e2c` | mounted phase, one I1 report, released | admitted and released |
| `8e4da4dfcfd0a64e67fa873edc339e979161884e` | one I1 report, neither mounted notification, released | admitted and released |

Each row was exercised against the source entry and packages' public dist entries with source aliases removed in the dist bundle. The baseline packages were built through the declared Adapter and Shadcn dependency closure. The candidate also rebuilt all 47 public packages and passed workspace types and manifest validation. Finf advisory status is reported by the budget check. The signed normal site build produced 683 pages and passed 21 selected Contents, Dialog, preview, CodeExample, copy and scroll cases. The Chrome Header first-frame checks passed at 320 and 390 pixels.

The local candidate carries the active split admission callback through the existing CommitSignal. It invokes the callback after final module effects and before the Runtime publishes the mount epoch. The change preserves the original scheduler for authored mounted callbacks. The optional host-facing parameter is included for maintainer review.

The same added test bytes fail the two old-companion rows on the maintainer branch and pass both on the local candidate. The broader selected suites record 854 pass and 3 fail before, then 856 pass and 1 fail. The same decoration Rule cleanup assertion fails on both revisions. The candidate also retains the valid-companion observation. The prior earlier-effects experiment was red and is excluded from the candidate results.

The candidate patch starts at the maintainer branch above. It is supplied for reconciliation and review. No integration or deployment is implied. The subject is lifecycle and error ordering, with no paint or accessibility claim.
