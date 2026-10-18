# Copy staging overflow — 0b68 checkpoint

This additive checkpoint records the three-line Copy staging repair in [0b68e7ec](https://github.com/Proto-UI/Proto-UI/commit/0b68e7ec96f5857a6e1b7b6463b192c695ee753f). Only direct `.site-copy-mount` children marked `staging` receive `overflow: clip`. Active content, generic materialization, Prototype behavior, and the original test inputs/assertions/timeouts are unchanged. This is local evidence preparation, with partial/ABSTAIN review scope.

The unmodified local WC390 dark test on the exact cc3 official artifact failed with **14 px overflow >1 px**. A separate early MutationObserver A/B/A control measured document widths **398 →390 →398** against client390 while the staging wrapper remained width 0 and its child 36. That control's 8px observation is not the same sample as the original 14 px failure. A late-idle control found no remaining staging targets and was non-discriminating.

| Actual execution | Source/build origin | Result |
| --- | --- | --- |
| Original selected baseline | Clean cc3 test + official cc3 artifact | 1 failed, 19 filtered |
| Same selected original test | cc3 + working CSS, local build | 1 passed, 19 filtered |
| Static QuickStart + Copy combination | Same precommit local build | 32 passed, 2 failed; Copy 14 passed, QuickStart 18 passed/2 request-gate premises failed |
| Full original QuickStart/default harness | Same precommit CSS; no external base URL | 20 passed |
| Expanded unit combination | Clean committed 0b68 | 94 files, 1285 passed |
| Collapsible/Tooltip/Brutalist/Field | Clean committed 0b68 test execution; prior local build bound to its sources | 4 files, 71 passed |
| Original settings journey | Same committed 0b68/static-build boundary | 1 passed, 10 filtered |

The first wrong name filter selected no cases (0 passed/20 filtered), and the first wrong package filter built no package. Both setup records are retained. The static combination's two `heldRuntimeRequests.length >0` failures remain failures; the later default-harness success does not rewrite them. Historical `in progress`/`pending` phrases inside original records remain intact and are superseded only by the later facts in [summary.json](summary.json).

The real precommit `apps-www build` produced 651 pages. Its complete local ZIP had 3836 files/669 HTML paths/104,048,147 expanded bytes and passed one generated-artifact admission test. It is not an official Actions artifact, is not mirrored here, and was not rebuilt after commit. All 11,329 frozen source files were independently bound to 0b68 Git blobs; the exact CSS before/after/diff and binding are in the records archive. Normal nonforce push was recorded; a stale immediate head read was reconciled without a second push.

[Original red capture](original-red.png) and [candidate hydrated capture](candidate-hydrated.png) are the only two included PNG captures. Both were viewed by root and are byte-identical (`f10eba94…`, 500×913); they do not show a visible paint change. The recorded browser viewport was 390×1000. Offscreen staging/frame JSON and the A/B/A control carry the overflow evidence. The bulk 198+277 capture sets remain private and were not all visually reviewed.

[copy-staging-records.zip](copy-staging-records.zip) includes the necessary raw-derived receipts/results/logs, controls, JSON observations, source exports and independent review. [raw-public-map.json](raw-public-map.json) maps every original SHA/size to its public member SHA/size and exact path-redaction rules. Transformed code/logs are public derivatives, not the executed bytes or a standalone recipe. PNGs are unchanged. Credentials, private attribution/authorization/handoff records, dependencies, compiled assets, and the full generated site ZIP are excluded.

The prior cc3 checkpoint remains [published separately](https://github.com/HyacinthHaru/Proto-UI/blob/3473ffd155c209958cc4338b808ef3f0c349b126/evidence/2026-10-18/issue883-preview-input-cc3e5670/README.md). New 0b68 main CI 39092692003 and preview producer 39092692110 are explicit extension points: this checkpoint does not assert their outcomes. No whole-CI, universal layout, full visual/AT/HIG acceptance or #883 closure is claimed.
