# Final five-probe evidence at fd9fc6b4

The five formatted browser probes completed serially against exact signed HEAD `fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2`, tree `978bb562be172cc6903fb038e85bc80e0034f574`. Actual WC, React, Vue 3, and Vue 2 Tabs each passed **21/21** assertions; the generic WC family passed **22/22**. All five processes exited 0, with no page errors or console warnings/errors. These are 106 bounded probe checks, not a full repository test or an approval disposition.

Every process began and ended with this same HEAD and a clean worktree. Root made no commit during any run. The wrapper recorded all tracked file hashes before the first run. Each tracked bundle source was checked against that starting hash, the run's provenance SHA, its end-of-run bytes, and its HEAD Git blob. Every bundle input, including external dependencies, was re-hashed after execution against its provenance; external dependencies do not have a tracked start/HEAD blob comparison. The separate five harness files were checked against their frozen hashes before and after every run. All applicable comparisons matched. The five bundles share **314 distinct package source inputs with zero hash differences**. A later test-only commit does not retroactively change these exact fd9 execution claims.

## Execution and immutable inputs

| Probe | Directory | Browser process UTC | Assertions | Trusted native clicks | Additional non-trusted click records |
| --- | --- | --- | --: | --: | --: |
| Actual WC Tabs | `final-fd9-wc/` | 05:02:29–05:02:35 | 21 / 21 | 6 | 6 WC semantic deliveries |
| React 19.2.6 Tabs | `final-fd9-react/` | 05:02:38–05:02:44 | 21 / 21 | 6 | 0 |
| Vue 3.5.31 Tabs | `final-fd9-vue/` | 05:02:47–05:02:53 | 21 / 21 | 6 | 0 |
| Vue 2.6.14 Tabs | `final-fd9-vue2/` | 05:02:57–05:03:03 | 21 / 21 | 6 | 0 |
| Actual generic WC family | `final-fd9-generic-wc/` | 05:03:06–05:03:11 | 22 / 22 | 12 | 0 |

All times are 2026-09-22 UTC. Native environment: Chrome `153.0.8010.53`, Node `22.23.2`, esbuild `0.25.12`, Playwright core `1.58.2`. React DOM is `19.2.6`. The source paths resolve the declared public package exports to TypeScript implementations, so these are actual source-bundle/renderer journeys, not published package or installed tarball evidence.

The five recorded command structures, cwd, exit codes, start/end status, per-input comparisons, and final harness hashes are preserved in [final-fd9-execution-manifest.json](final-fd9-execution-manifest.json). This public edition redacts local paths and the verbose PATH listing; it is not a verbatim environment dump. The original command text is retained locally with its digest in the redaction index. Use the packet README commands with a local Node 22/Corepack toolchain for reproduction. `run-final-fd9.py` was a separate execution wrapper: it did not edit the browser harness or its assertions, held one browser job at a time, rejected a different starting HEAD, and would have stopped on a concrete failed run. All output directories were new.

The executed five harness byte hashes remained exactly those approved for the formatting/attribution revision:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `tabs-probe.mjs`            | `6c3c6f406d6af64263cc9f725f7f3d4ff7a03e33db375b87500f01df44457d38` |
| `tabs-fixture.ts`           | `ded4e7a31ec4bd8f0374e15b0b9e32893dcb44b860cd2b8bcdf786b5a3f69765` |
| `framework-tabs-fixture.ts` | `4a9669318f67a4905f6c988b1b026f45fa11e84499910135699af55669f07819` |
| `part-probe.mjs`            | `b441b4190125250e9b3550dee2f10d4b6d44c3c416476dc5e4723b4fd2f8e764` |
| `part-fixture.ts`           | `62dae30c130d7bf2e8d5fad090a4b2ba73a1795ecd2f67270fe7af4404063314` |

No source, harness, scenario, predicate, timer, or authority anchor was changed during this round. Baseline and integration failures remain intact, and all 112 previously protected result/provenance hashes still match. `harness-revision.json` and `harness-v1/` preserve the earlier pre-format exact versions; this report supplies the first native execution of the formatted five-script revision.

## What the rendered and accessible output shows

All **57 PNGs** were individually opened with `view_image`: 11 in each Tabs run and 13 in generic WC. Every final directory contains `visual-review.json` with exact image SHA, dimensions, the inspection method, and individual observations. Selected tab styling, panel text, the intentionally empty missing-target view, duplicate authored panels, generic source/target removal, and physical domain moves are readable and unclipped. No log-card image substitutes for actual components.

All **57 native AX trees** and every corresponding saved DOM fact snapshot were read and checked. Each directory contains `ax-review.json`; the combined [final-fd9-evidence-audit.json](final-fd9-evidence-audit.json) preserves all AX comparisons, every DOM checkpoint, and the selected timing records. No mismatch was found. The probes retain DOM attributes/visibility/matched-target facts; they do not claim a full serialized DOM document when a script did not collect one.

The actual `a+b` / `a b` retained Tabs journey now has distinct target identities in all four Adapters. After selecting `a b`, the visible **Space key** panel has AX name **Key “a b”**, and the selected second tab controls its unique live target. The old wrong **Key “a+b”** accessible name is absent. Missing/duplicate counterpart configurations fail closed at the controls relation without disabling normal selection. Duplicate panels are deliberate app-authored input, and their existence is not presented as a rendering defect.

For generic WC, the independent `evidence-record-detail` family creates reciprocal pairs in two separate Anatomy domains and in both endpoint orders. Native host buttons drive target L1, source L1, public-key changes, domain movement, live authored ID/collision, and terminal removal. All 13 AX stages match their current DOM relationship state. ID mutation and collision often leave the pixels unchanged; their evidence is the actual DOM/AX and mutation trace, not the screenshot alone.

The input distinction remains explicit: Playwright's actual browser clicks are recorded `isTrusted=true`, but no OS input path or screen-reader operation is claimed. WC's six additional `isTrusted=false` click records are semantic `CustomEvent` delivery from the WC exposure path, not six more native clicks. Generic's twelve buttons are ordinary app-authored host controls whose handlers call public props or declared host operations; they are not assertions that a generic part's own business action implements all those operations. No extra recovery update was sent.

## D: source IDREF withdrawal before the L1 removal boundary

The observed claim comes from ordered native mutation records and public Runtime phase samples, not final `afterB` output alone. Indices below are zero-based in each named `lazy-trace.json` mutation batch.

| Adapter | Trigger A controls withdrawal | Later L1 removal observation |
| --- | --- | --- |
| WC | `seq65`, record 34: old target ID → absent | same batch record 37 sets Content A's detached marker; `seq66` unmounting already has no controls |
| React | `seq70`, record 23 | `seq80`, record 0 removes root child; `seq71` unmounting sees the physical Content absent and controls absent |
| Vue 3 | `seq66`, record 23 | `seq71`, record 0 starts root-child removal; `seq67` unmounting already has no controls |
| Vue 2 | `seq69`, record 23 | `seq73`, record 1 starts root-child removal; synchronous `seq65` unmounting already has no controls |

Owned Content IDs and reciprocal labelledBy tokens are withdrawn in the same earlier batches. A normal hidden retained panel is not equated with an L1 detach: `keepMounted=true` panels intentionally keep relationships while hidden. These rows concern the explicit detached marker or physical view-removal boundary, not a new rule that every CSS-hidden panel must drop controls.

Generic WC adds actual source-only L1 coverage. Target hide at `seq58` removes source controls / target labelledBy / target ID in records 2/3/4 before detached record 5. Source hide at `seq75` removes target labelledBy / source controls / source ID in records 2/3/4 before source detached record 5. The other domain's pair remains intact.

## E: identity and reciprocal relationship before reveal

Returned A uses its original reserved ID in all four Tabs Adapters. Ordered native writes establish that identity and both relationship directions exist before the pending/detached reveal barrier is released:

| Adapter | Restored ID / labelledBy / controls | Barrier release |
| --- | --- | --- |
| WC | `seq118`, records 60 / 61 / 62 | same batch record 120 removes Content A's detached marker |
| React | `seq121`, records 141 / 142 / 143 | same batch record 213 removes Content A's pending marker |
| Vue 3 | `seq122`, records 2 / 3 / 4 | same batch record 79 removes Content A's pending marker |
| Vue 2 | `seq118`, records 18 / 19 / 20 | later `seq120`, record 0 removes Content A's pending marker |

Synchronous phase samples agree: WC returning Content A epoch 2 already has the complete pair at `seq109` mounting and `seq111` host commit start, still detached and `display:none`. React has the complete pair at `seq120` mounted while still pending and `visibility:hidden`. Vue 3 has the pair at `seq120` mount.commit.done while pending/hidden; Vue 2 at `seq116` while pending/hidden. Framework commit callbacks alone are not the claim; the recorded reveal barrier determines when the new accessibility binding becomes visible.

First materialization differs by renderer. WC has a complete pair when the second endpoint reaches mounting (`seq37`) before host commit start (`seq39`). React and Vue 3 can reveal the Content while the new Trigger has not yet obtained its semantic binding; when the unique operative pair forms, the Trigger remains pending (`seq40` React, `seq44` Vue 3), and the mutation queue places all four identity/reciprocal writes before Trigger pending removal. Vue 2 has both source and target pending when the pair appears at `seq43`; relationship writes in `seq48` precede both pending removals. The earlier absent-source interval is not described as an already valid relationship.

Generic WC provides both real endpoint orders. Source-first domain A has a complete pair at target mounting `seq20`, before commit start `seq22`; target-first domain B has the complete pair at source mounting `seq44`, before commit start `seq46`. Target remount has the original pair at epoch-2 mounting `seq66` while detached/none, before commit start `seq68`; `seq71` writes ID/labelledBy/controls at records 20/21/22 before detached removal at 47. Source remount has the original pair at epoch-2 mounting `seq83`, before commit start `seq85`; `seq88` writes source ID/controls and target labelledBy at records 18/19/22 before detached removal at 47.

MutationObserver callbacks run after the underlying operations. Their ordered records and old values, combined with synchronous lifecycle facts, support the stated write-before-reveal ordering. Tabs' saved `newValue` is the value at batch delivery, not an invented per-instruction synchronous snapshot. Withdrawal and later restoration here occur in distinct user-input phases. Raw queues are preserved so no same-batch reversal is hidden.

## Generic relationship and live-host boundaries

The generic trace preserves key and domain changes without introducing a shipped Prototype. One-sided re-key removes both directions at `seq92`; the matching key restores both at `seq95`. Moving only target A withdraws the old-domain relation at `seq101`; moving source A restores it at `seq108`, while pair B remains intact. Actual DOM identity node 4/source and node 5/target remains stable through these operations; this is not a same-epoch physical replacement fixture.

For live authored ID, the `host-id` button is the explicit host stimulus. The target ID mutation appears at `seq112`; MO-mediated dependent invalidation/rebind appears at `seq113`, old controls → absent → `author-detail`. The immediate host setter return is not falsely claimed to intercept/rebind synchronously. Collision insertion withdraws controls at `seq117`; removing the collision restores them at `seq121`. Terminal removal leaves the later authored `author-detail` intact and withdraws the referencing source. The probe does not count all internal resources after disposal.

## Acceptance limits and relation to other evidence

These five runs support the named ordinary Tabs journeys across four actual Adapters, and the actual generic WC family's D/E, re-key/domain, authored-ID/collision, and terminal observations. They do not force source-only L1 in every framework, every mount order in every framework, stale/superseded completions, all token-overlap ownership cases, same-epoch physical replacement, or complete resource-count cleanup. They do not establish every C A–K clause on their own.

The separate [ownership-native-report.md](ownership-native-report.md), also bound to fd9, supplies the explicit-ID/writer/same-tick/revocation and actual WC-provider K matrix. That remains internal host-contract evidence rather than being relabeled a Tabs/generic user journey. The earlier baseline, mapped-test, and working-tree integration failures retain their original source bindings and results. No old run is rebound to this head.

No GitHub approval, CI success, merge, lifecycle admission, publication, or package-budget acceptance is implied. The full repository test/lifecycle-fixture follow-up belongs to root's independently recorded validation work.
