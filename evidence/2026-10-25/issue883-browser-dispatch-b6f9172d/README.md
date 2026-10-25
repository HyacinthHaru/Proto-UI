# Issue 883: original query dispatch at b6f9172d

Product head `b6f9172d51bb8065bf18965916bbcbc5b38a0d3d`, tree `6326cbb9a3e3a558113bc69be6a6c3f381555194`, includes accepted main `357068f0f371dd40826b81da43bd4ef5df73bee7`. This commit adds a bounded test-side collector and frame correlation metadata. Original assertions, deadlines, inputs and keyboard-owner controls remain. No production performance repair or formal acceptance is claimed.

The key result is the **natural failure in [CI 40191179866](https://github.com/Proto-UI/Proto-UI/actions/runs/40191179866)**, job `121162906226`, artifact `12598479134`. Its original one-second verdict remains false. Actual query `call@979 / CDP 4272` carries the 305324-character expression SHA `730c2ff13134a1ef5afdb2584d768787110b548e2653bd4ee9e0c7d543c7bb1a`. The late `combobox` result does not turn that failure green.

| Same-run boundary                              | Observed interval |
| ---------------------------------------------- | ----------------: |
| Browser forwarding to renderer command entry   |        2062.575ms |
| Renderer command scope                         |           9.593ms |
| Nested EvaluateScript                          |           8.029ms |
| Largest contained CompileCode                  |           5.799ms |
| Its nested ParseProgram                        |           5.443ms |
| Original query return after the failed verdict |     1138.696031ms |

Nested durations must not be added. The actual post-verdict clock marker gives a conditional mapping of Browser parsed handler to 3.879–5.493ms after Node send, and renderer entry to 1067.063–1068.677ms after the failed verdict. This is not raw pipe receipt or a complete drift calibration. Trace EOF is complete, no data loss is reported; 88 auxiliary IO-lifecycle rows were dropped at their cap, separately from zero dropped/error records in the original SDK ledger.

A preceding same-thread RunTask contains an 1814.182ms `v8.evaluateModule` with empty arguments and no source identity. A separate later `refreshTheme` event has a source URL; that does not identify the anonymous module. The matching-selector role observation reached Node before the query, but its terminal first-role observer does not continuously rule out later replacement.

## Validation and remaining failures

- Exact committed b6 local combination: 14 files, **292 pass / 5 fail / 0 skip**, exit 1, 12:00:35–12:24:19 UTC. Tracked bytes and recorded extras are stable; owned preferences were CAS-restored and the worktree is clean. Failures are two S4 startup 150s cases, the S4 paint 150s case, a Contents **width** `43.99998474121094 >= 44` assertion, and a native popup's exact-URL `domcontentloaded` 30s wait. The popup's trusted modifier click hit its anchor and was not prevented. Initial Root wording “height” was corrected against the original stack at line 728; raw results are unchanged.
- Saved precommit executable bytes: 23 focused units passed; typecheck reported 971 files, zero errors/warnings and 14 hints. One original Docs collector control passed, 29 cases filtered. A later dated-record whitespace change is separately bound; these are not relabeled postcommit runs.
- Canonical primary CI: **22 jobs = 8 success / 10 failure / 4 skipped**. Actual synthetic checkout `38b4e6ec4e417bb8f089a64e8f87c79cf0f232d2` has the exact b6 tree. General stops at 78 public-docs findings before ordinary Vitest; media 15/15 is separate. Package build is skipped.
- Search's original file is **12 pass / 18 fail**. Only browser shards 3/5/6 have complete subtotals: 254 pass / 18 fail / 15 skip. Shards 1/2/4/7/8 exit 124 without complete whole-shard totals.
- Hosted Homepage is 9/9, including the original Brutalist 1s case; this does not explain the previous head's late getter. Hosted paint still fails at the original first light-trigger 30s click, before screenshot/close/paint assertions. The prepared Input/DOM observation map is a plan, not executed instrumentation.
- S4 startup appears in shard 4's plan, but neither the complete 297-member artifact nor its original log contains S4 phase, first-missing or case results before the 900s cutoff. **This hosted result is unknown**, not the local 150s failure or a pass.

A separate private CPU-category control passed one original Docs case with 29 filtered. Its 572.915ms local module window contains 4412 reconstructed samples, including 2108 leaf samples in `withNativeContentLease`, under `initSiteNativeControls → SocialIcons initialize`. This is a new local Vite URL/sample association, **not an identity for the anonymous hosted module**. It uses 100µs sampling with no internal sample limit; the 32MiB stream bound does not bound internal allocation. Signed negative deltas, absent endTime chunk and 94 dropped auxiliary rows remain recorded. EOF is not a complete-CPU-profile guarantee. No transformed JS bytes or getter-level layout causality were captured.

The native Selection primary-source walkthrough and existing freshness regressions do not justify caching an empty Selection across owners. No Selection/keyboard-owner guard, 44px threshold, original one-second assertion or deadline was weakened.

## Contents and provenance

`REPORT.md` gives the detailed result boundaries. `PUBLIC-MAPPING.json` identifies every original SHA/size and its sanitized archive member, or an explicit private hash reference. `evidence.zip` contains selected text/JSON/source derivatives and the same mapping. `MANIFEST.json` binds the outer files.

Full raw traces, CI ZIPs, large byte censuses and transformed third-party source remain private hash references. Private ModelTrace records/challenges/samples, user requests, authorization documents, preference contents and unreviewed images are excluded. No new PNG is published: this collector change has no new UI rendering claim, while the width failure lacks pre-assert style/transform/frame evidence. Public projected source has machine aliases and omissions; it is neither the original executed byte stream nor an as-is runnable script. The fixed ZIP timestamp is package metadata, not an event timestamp.

Earlier source and evidence remain in [4737796b](https://github.com/HyacinthHaru/Proto-UI/tree/4737796b784aee44dfbf66e59d385709a81ca736/evidence/2026-10-25). This package is additive. Local independent checks remain partial / ABSTAIN and do not constitute GitHub approval, all-CI green, deployment or accessibility acceptance.
