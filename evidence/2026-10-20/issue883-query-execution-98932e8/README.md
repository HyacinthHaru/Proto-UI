# Query execution evidence at 98932e8

This packet records the diagnostic increment in commit `98932e8132ae4f3e1dacb9bf5967ebac481953ab`, tree `086f2d336a5adbdc5849dfb77aca7ee194a513cd`, over parent `2189bae8f3e39ed9708f79576f6bc6b0c6660192`. The commit changes only the Homepage browser test and its query-observer helper. It does not implement an application fix or relax the original matcher. [Exact source change](https://github.com/Proto-UI/Proto-UI/commit/98932e8132ae4f3e1dacb9bf5967ebac481953ab).

The official hybrid run provides an additional observation: under the documented clock assumptions, the third observed utility getter executes after the original one-second poll rejects. The original test remains failed. The indefinitely unsettled-request cleanup gap in this source remains **OPEN**. Later bounded-drain and Header/Select candidates, their tests and their results are outside this packet.

## Official result

[CI run 39371457764](https://github.com/Proto-UI/Proto-UI/actions/runs/39371457764) completed with **13 successful and 9 failed jobs**. All 22 original logs and download receipts are included. Each checkout marker identifies synthetic merge `665c0661c56f4e54a4dcbb489f6b180dc9550308`; its Git tree is exactly the same as 98932e8.

| Browser shard | Passed | Failed | Skipped | Summary boundary             |
| ------------- | -----: | -----: | ------: | ---------------------------- |
| 1/8           |    211 |     29 |       0 | Complete                     |
| 2/8           |      — |      — |       — | Exit124; no complete summary |
| 3/8           |     58 |      3 |       0 | Complete                     |
| 4/8           |    122 |      2 |       0 | Complete                     |
| 5/8           |     88 |      2 |      15 | Complete                     |
| 6/8           |    169 |      0 |       0 | Complete                     |
| 7/8           |      — |      — |       — | Exit124; no complete summary |
| 8/8           |      — |      — |       — | Exit124; no complete summary |

The five complete shards total **648 passed / 36 failed / 15 skipped**. These are not totals for all eight shards. Individual completed files inside a timed-out shard do not establish its whole-shard count.

General stopped at **78 public-docs drift issues before ordinary Vitest**. The types job reported **935 files, 0 errors, 0 warnings and 14 hints**. The package job contains **44 actual build records out of 47 public packages**, 47 manifest checks, 9 passing budget-policy tests, and **4 PASS / 5 ADVISORY** budget measurements. Advisory measurements are retained as advisory.

The Homepage file reported **8 passed / 1 failed**. Its mobile case reached all 12 recorded stages without a rejection marker and passed in this execution. This is not a repair or first-failure explanation for an older mobile negative. Header failures and all other original failures remain in the complete logs; they are not attributed wholesale to the query observer.

## Query timing

The raw evidence comes from [ordinary browser2 job 118461123949](https://github.com/Proto-UI/Proto-UI/actions/runs/39371457764/job/118461123949). Values below are relative to the original poll start.

| Observation                                               |    Time in milliseconds |
| --------------------------------------------------------- | ----------------------: |
| Native dataset write finished, conditional interval       |   794.513795–795.410299 |
| MutationObserver callback delivered, conditional interval |   917.813795–918.710299 |
| Original poll rejection                                   |             1000.939018 |
| Third observed utility getter, conditional interval       | 1104.813795–1105.710299 |
| Original Node Promise returned `brutalist`                |             1106.093828 |
| Additional post-verdict drain duration                    |              104.897409 |

The original writer/MO analysis retains **all five** main-world setup, collection and calibration brackets. A separate report adds the utility installation and collection brackets and retains **all seven**. Their intersections happen to be numerically identical in this run: Node minus page is `[116110.422785, 116111.319289]` ms. One method is not substituted for the other.

The three utility rows and three Node calls have matching order and values: `shadcn`, `shadcn`, `brutalist`. Source, root, origin, zero-drop/error conditions, own-hook restoration and CDP detach were checked independently of the caller's coverage flag. **Ordinals are not protocol request IDs**; matching counts, order and values do not independently prove request identity. Equal recorded getter-start/end ticks do not prove zero execution cost.

These intervals assume approximately stable relative clock offset/rate within the observed document. There is no independently measured drift, quantization or zero-interference bound. The result does not isolate renderer scheduling, selector resolution, protocol/transport, network or Node-event-loop causation, and does not locate the older2189 getter. A native attribute write is not the completion of the whole family transaction. A late successful value does not revise the rejected original matcher.

[Published feedback 6283933166](https://github.com/Proto-UI/Proto-UI/pull/921#issuecomment-6283933166) confirms the narrower static/log observation and requests an indefinitely unsettled-request cleanup control. The finite pending drain is observed here, but this version still waits without an independent cleanup bound before failure capture/rethrow/context close. That gap remains open for 98932e8. The feedback is not independent browser execution, formal approval or overall acceptance.

## Local evidence and source epochs

The retained local evidence includes the initial V1 foreign-owner cleanup finding, two runner startup errors with **zero controls executed**, and two successful real-Chromium private-DOM ownership controls. The controls verify that a busy second observer does not remove the first and that a successful installation with a deliberately suppressed acknowledgment can clean up only its own hook. They are diagnostic-helper controls, not Homepage acceptance.

The three observation configurations ran in actual order `hybrid`, `native-only`, `node-only`; each executed one original Brutalist case and filtered eight. Those runs included the then-present Header candidates. All were positive with zero pending references at verdict; none is a Linux negative-path execution or a causal estimate of instrumentation overhead.

After the Header candidates were parked, local validation executed **Shadow111 + Homepage9 = 120 passed**, **17 keyboard-owner controls + 3 callback-serialization controls = 20 passed**, and types **935 / 0 / 0 / 14**. These executions preceded the final commit. The tracked caller has matching before/after hashes. The first explicit formatted-helper hash was recorded **after** the native run; earlier mtime/ctime and controlled edit history are supporting chronology, not a before-run hash or a complete loaded-source census. Final immutable Git copies bind the committed two files separately.

The original 171 matcher expressions, 76 input expressions, case deadlines and mobile predicates are retained in the source comparisons. The original Promise ledger adds declared observation work; no local mode is called unobserved. Historical records keep their original timestamps, pending statements, failures and source boundaries. They are read together with the later exact-head checkpoint rather than rewritten.

## Contents and transformation boundary

[Source walkthrough](source-walkthrough.md) explains the actual control flow. [Packet metadata](packet.json) and the [raw/public map](raw-public-map.json) describe every selected input. `records.zip` contains the selected records and the **same bytes** of `PUBLIC-MAPPING.json`. The manifest covers the outer files and excludes itself.

Text and source files are sanitized **derived evidence**. They are not the original execution bytes and are not a standalone runnable recipe. Original/private and public SHA256 values and transformation operations are recorded per member. Personal machine roots, full PATH/TMPDIR values and credential-setup lines are removed or aliased. Public attribution metadata omitted by the projection is not newly exposed raw model data. No private ModelTrace samples/context, handoff, authorization, CONTINUE or environment-policy file is selected. Actual Chromium frame/execution-context metadata is runtime evidence, distinct from private agent context.

There are **zero PNGs** in this packet. References to retained screenshots in original records do not mean those images were mirrored or fully reviewed here. No full visual, HIG, accessibility, AT, complete-feature, all-CI or merge acceptance is claimed. Reviews remain bounded and **partial/ABSTAIN**. Assembly is private preparation; any publication is separately performed and verified.
