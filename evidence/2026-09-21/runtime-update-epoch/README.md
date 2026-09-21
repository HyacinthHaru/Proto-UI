# Issue #647: update ownership across view epochs

Baseline `67d4dc86be5d196815e3d2192c3cd0cbcfd2b935`; candidate `53e4205cc29256ce13f6ca9927f132d0e9180043`. This evidence-only branch must not be merged into product history. The Runtime repair and durable tests live on the candidate product commit.

Agent request paraphrase: restore a fully mounted replacement view's update liveness without waiting for a superseded acknowledgement, preserving logical-instance state, same-epoch coalescing and existing exception behavior. Public source: [Issue #647](https://github.com/Proto-UI/Proto-UI/issues/647). Expected ownership follows active `C-LIFECYCLE-0008-D/E`; epoch direction `C-LIFECYCLE-0006-C/D` and test catalog `T-LIFECYCLE-0005` remain draft.

## Executed component and first divergence

The disposable page runs the official repository React Adapter and Runtime, actual React/ReactDOM 19.2.6, and Chrome 153.0.8010.48 at 1280×1000. It renders a State counter through the Runtime's template into the large blue panel. The State value, mount epoch/phase, renders and callbacks are sampled separately. Component text is never replaced with an expected value.

In one `flushSync`, request update1 and hide `React.Activity`; React disconnects layout effects before that pending commit is acknowledged. Reveal in another `flushSync` in the same JavaScript turn, preserving the existing Proto owner and canceling the Adapter's existing deferred terminal disposal. Mount2 completes, then request update2 normally. No extra recovery update is issued.

| Observation | Baseline | Candidate |
| --- | --- | --- |
| Initial view | epoch1, State0, Count0, render1 | same |
| Update1, Activity hidden | epoch1 detached, State1, hidden Count0, render2 | same |
| Activity visible, mount complete | epoch2 mounted, State1, Count1, render3 | same |
| Normal replacement update2 | **State2, Count1, render3, updated0** | **State2, Count2, render4, updated1** |
| Separate same-epoch two-update control | Count2, render3, updated2 | same |

The old signal is superseded by the real Adapter on remount. The browser fixture neither intercepts nor manually delivers it. The baseline's first divergence is a fully mounted epoch2 with no `update.render` for its update. The source-derived explanation is the old instance-wide in-flight flag; private closure flags are not instrumented observations. In the candidate, callbacks capture their epoch's update-state record and cannot mutate its replacement.

Measured State identity survives; setup/created each run once, mounted twice, unmounted once. The full canonical event traces are in `*-crossing.json` and `*-coalescing.json`. Browser page/console errors are empty. Observation timestamps and source identities are retained in each JSON.

## Visuals

All six selected screenshots were inspected after capture:

- [Baseline initial mount](baseline-crossing-initial.png), [blocked replacement](baseline-crossing-result.png), [same-epoch control](baseline-coalescing-result.png).
- [Candidate initial mount](candidate-crossing-initial.png), [working replacement](candidate-crossing-result.png), [same-epoch control](candidate-coalescing-result.png).

The figures show an actual component plus measured diagnostics, not a model or a log card substituted for UI. The harness controls public React/Adapter calls; no native-input claim is made. It proves only this same-turn order, not long-hidden Activity, arbitrary user timing, React18, other Adapters, or non-Chromium engines.

## Reproduction

Use Node22 and the declared pnpm10.32.1 in existing baseline/candidate checkouts with their frozen-lockfile workspace dependencies installed. Download these evidence source files together. The code does not require a deployed documentation site.

```sh
node build.mjs /path/to/baseline/Proto-UI baseline
node run.mjs /path/to/baseline/Proto-UI baseline crossing --chrome /path/to/chrome
node run.mjs /path/to/baseline/Proto-UI baseline coalescing --chrome /path/to/chrome
node build.mjs /path/to/candidate/Proto-UI candidate
node run.mjs /path/to/candidate/Proto-UI candidate crossing --chrome /path/to/chrome
node run.mjs /path/to/candidate/Proto-UI candidate coalescing --chrome /path/to/chrome
```

The browser path can also be supplied by `CHROME_PATH`. The runner starts an ephemeral loopback HTTP server, checks the real observations and saves JSON/PNGs, then closes the browser/server. `index.html` can be served locally for interactive use after bundling; GitHub displays HTML as source/download, not an executing site. The screenshots are the public static fallback.

`build.mjs` records the contents actually embedded in the sourcemap: 262 inputs, including 248 repository files verified individually against the respective commit's Git blob. The remaining inputs are installed dependencies, the fixture and explicitly generated source metadata. The baseline/candidate inventories differ only in Runtime `session.ts` and metadata. This does not claim that all 262 inputs are tracked repository files. Dependency versions and all input hashes are available in `baseline/` and `candidate/`; raw bundles/sourcemaps are omitted because they embed local build paths and vendored dependency source. Rebuilding regenerates them.

## Runtime matrix and validation

The durable Runtime file explicitly controls `CommitSignal.done` order. It covers old acknowledgements before replacement update, while one is pending, while current intents are queued, after current completion, or never; duplicate old signals, terminal disposal, throwing callbacks, remount reentry and old host-commit errors are included. The real React test separately covers retained State, setup/created, same-epoch coalescing and terminal disposal. Detached-prop behavior is covered by the unchanged ViewIntent suite.

The same 14 new test cases run against the frozen baseline session source produced **8 failed / 6 passed**; candidate focused tests produced **25 passed** including existing lifecycle controls. For the recorded baseline Vitest run, a disposable pre-loader supplied the exact baseline `session.ts` at its original module ID; all other production sources match baseline. A clean baseline checkout with the two candidate test files copied in reproduces the same assertions. Browser baseline execution used the clean baseline checkout directly.

- 23 spec test files / 152 tests, base-aware spec authoring, regenerated projections and Agent-doc check passed.
- Types passed, including 230 Astro files with zero errors/warnings/hints.
- All 43 public packages built; all 9 package budgets passed. Runtime is **60000/60000 bytes, with no margin**, and the cap was not raised.
- Full `pnpm test` with Vitest max threads/forks2 and min threads/forks1: exit 0; Vitest main stage **2,580 passed / 34 existing TODOs**, followed by **26 browser files / 136 passed**. No CLI selection arguments were supplied; both default phases and all26 serial browser suites remain. The first Vitest stage includes real Chromium Scroll tests; it is not wholly a non-browser stage.

`validation.json` binds the reviewed files, source inputs, commands and timestamps to the candidate. The first full run passed all 2580 main-stage and 136 browser cases, but the Button lifetime suite afterAll hook exceeded its unchanged 60000ms deadline, making that command exit1. That suite then passed unchanged in isolation (8/8, including teardown). A second default-concurrency run exceeded the unchanged5s Context fixture deadline (2579 passed,1 failed,34 TODO) before entering the separate browser phase. That fixture passed unchanged in isolation in1.50s. The final full command caps Vitest workers at2 via its documented installed-version environment variables, preserving original two-phase selection, assertions, browser serialization and timeouts. No source or CI configuration changed. The original log does not identify whether browser.close, Vite.close or HTTP server.close stalled, so an environmental cause is not asserted. `full-test.log` retains the initial failure; `full-test-rerun.log` retains the second failure; `full-test-bounded.log` records the final full attempt. The bounded local result is not proof of healthy default-concurrency CI, which remains required on the final PR head. Raw logs are searchable; only local workspace/evidence/temporary paths are replaced in public log projections. Original raw logs remain locally archived. `types.log` retains the initial ActivityProps failure; `types-final.log` records its correction without changing behavioral assertions. The independent agent also detected an initial per-commit queue change after a deferred updated-callback exception. The final per-epoch record preserves baseline behavior; the differential probe and persistent regression confirmed it. Earlier experimental candidates are not claimed as the final source.

Independent local inspection has no remaining concrete finding but remains **partial/advisory/ABSTAIN**. It is not a GitHub approval. Trusted PR CI, independent maintainer acceptance and actual merge are separate outstanding gates. The named Runtime/React evidence scope is complete; universal Adapter race coverage and broader lifecycle exception policy are not claimed.

## Provenance

Original AI-assisted fixture/tests and repair based on this repository's MIT source and published issue. React/ReactDOM are existing MIT dependencies, not copied into this packet. User-directed work was validated by automated runs and independent agent inspection; human maintainer acceptance is pending.
