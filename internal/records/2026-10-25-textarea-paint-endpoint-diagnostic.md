# Textarea invalid-clear paint endpoint: retained failure and bounded diagnostics

Recorded 2026-10-25 UTC. Existing owner/scope: #954, merged carrier #955.
This is a non-normative diagnostic continuation, not a production repair or acceptance waiver.

## Evidence and decision

The final source `80f6909e901d84d18e0c452b77ade217d246444d` failed the
[native job](https://github.com/Proto-UI/Proto-UI/actions/runs/40225011567/job/121264419282).
Artifact `12611071355` has SHA256
`7e4d4762811ef262a472e6b2e87bf391ea1b5a52ab5ab0455120d23723cb24ae`.
Static inspection of its JSON and CSS, without executing its bundle, found:

- Observation 517 already passes the same React/dark/Rhea/readonly focused valid target.
- Observation 485 passes the normal-mode invalid-clear route.
- Observation 548 fails the readonly invalid-clear route after destructive/40 paint:
  expected Oklab a `0.0000253916`, observed `0.0000253917`; other recorded state,
  border, ring color-property, alpha and 3px geometry match.
- The final source and preparation baseline main
  `17e49ca7e03fd8e763179c453f63d3ba35a390dc` have identical evidence script,
  strict shadow helper and production Textarea visual source.

The existing independent box-shadow probe is retained. It was already introduced
by b01cd; replacing color-property matching with that probe again is not a repair.
The previous collector overwrote each poll and recorded no transition phase. The
artifact cannot distinguish an in-flight/interrupted transition, late state
projection or settled serialization precision. Earlier passing identical targets
argue against an always-wrong static recipe, not against every production defect.

[CSS Transitions sections 4–5](https://www.w3.org/TR/css-transitions/#application)
distinguish interpolated current values and completion.
[CSS Color 4 section 16.4](https://www.w3.org/TR/css-color-4/#serializing-lab-lch)
does not fix exact internal Oklab precision. Neither fact justifies a numeric
tolerance, skipped assertion or a claim of harmless rendering here.

## Additive diagnostic implementation

The existing capture script now retains browser-monotonic sample times, host
elapsed times, computed paint/state and relevant CSS transition metadata/events.
Listeners are attached before the original state sequence. No animation is
finished, paused, cancelled or awaited. The original nominal 240ms polling window
and cadence, strict predicates, colors, geometry and state sequence remain unchanged.
An already-started sample can return and satisfy the original predicate after the
deadline; this is not a hard completion cutoff. Diagnostic reads consume time
without resetting the deadline or adding retries.

Retention is finite: first 31 plus latest sample per attempt (32 total); latest 64
relevant events per editor with cumulative sequence/count; at most 8 relevant
animation snapshots per sample with omission counts. Events exclude descendants
and pseudo-elements. Scope is box-shadow and border-color CSS transitions, not
arbitrary keyframe animations. API absence/read failure is explicit, never proof
of completion. Original actual/expected paint fields are captured before a guarded
diagnostic lookup/read. Missing or throwing tracers produce explicit `missing` or
`read-failed` status (and error for a failed read), without reinstalling a tracer or
fabricating an empty successful history. This preserves paint evidence even if
the reacquired editor has been replaced. Sampling reads are not atomic frames;
instrumentation can affect scheduling, so a changed outcome alone proves no fix.
The source receipt records probe hashes, browser version and these limitations.

Focused tests in the existing collected probe suite cover retention, filtering,
metadata, non-mutation, API failure and continued strict rejection of the original
one-digit mismatch. Missing tracer, throwing snapshot and throwing tracer-lookup
negatives invoke the same self-contained browser sampling callback and require
the original actual/expected paint plus failed strict comparison to survive.
These tests are authored but not executed on the preparation
seat. No repository resolver, generator, dependency installation, build or browser
execution is claimed. Standalone syntax checks, if reported by the preparation
handoff, are not runtime verification or independent acceptance.

## Existing validation route and next decision

`.github/workflows/shadcn-textarea-style.yml` checks out the exact PR head, runs
the four existing focused suites, then runs
`node --import tsx scripts/prototypes/shadcn-textarea-evidence.mjs` and uploads
the complete artifact even on failure. Its path filter now explicitly includes
the shared shadow/diagnostic helper. Existing failure JSON, screenshot/hash and
original acceptance outcome remain preserved.

Read every original scenario and retained trace on that exact head. A still-running
or restarted transition calls for timing/state-owner investigation; a completed
transition with persistent mismatch calls for a bounded independent upstream CSS
reference reproduction. Do not derive expected color/geometry from actual output.
Any eventual comparison repair requires wrong-color/alpha/width/state negatives
and independent review. Continue diagnostics and the actual repair in the same
follow-up PR under #954; do not claim this increment closes the Issue or finishes
native acceptance. Production, renderer, Compiler/IR, #887 and other owner paths
are unchanged. No new Issue or separate quantity-only diagnostic PR is needed.

## Exact-head native result and post-verdict continuation, 2026-10-26 UTC

The first diagnostic increment was published on the same #954 follow-up PR #1010
at `4f4d98ab968801983cdbfbe61b03dcf0e2f461a9` (tree
`b6a67bac89399f3f89a23dd1f1b1dfa79c84424b`). Its
[native job](https://github.com/Proto-UI/Proto-UI/actions/runs/40245950237/job/121327422116)
passed 34 focused tests across four files, then failed native paint acceptance.
Artifact `12618538242` SHA256 is
`08915dcf1713e841847cb1b12548620a668768cfd8c273cc85e24bb3980246f8`.
Source/app/index/CSS bindings were inspected; browser version is `155.0.8059.39`.
These results belong to that exact published head, not the continuation below.

This failure is React **light**/Rhea readonly invalid-clear, distinct from the
original dark failure. All 11 polling samples are retained without omissions.
At the last sample, host elapsed is 230ms and browser snapshot time is 13582.5ms;
the box-shadow transition remains running at 199.992ms of 200ms with progress
0.9999999991666418. Its startTime remains 13372.428. Event216's transitionend at
13306.1 belongs to the previous transition; events217/218 are the current
run/start at 13372.8. No current completion or restart is observed.

The host first-to-last delta is 222ms and browser delta is 221.8ms, not proof of
an exact shared clock. The final retry sleeps up to the remaining nominal window
and checks the deadline before sampling again. It can miss a completion in that
unsampled tail, but this trace does not prove one happened. The possible next
frame inferred from the roughly 16.666ms animation steps is an extrapolation,
not measured completion. Settled precision drift is also unestablished.

### Smallest additional observation, preserving the failure

The catch handler first attempts an atomic primary `failure.json` write before
optional page work. Supplemental writes use a same-directory pending file and
rename so a failed write does not truncate an already persisted primary receipt.
A write failure is reported, not represented as successful persistence.
If primary writing or renaming fails, both new phase reads are explicitly skipped.
The pre-existing readiness and screenshot attempts still run independently, and
a later receipt write may retain their result plus the failed-primary/skip status;
that does not retrospectively authorize the skipped reads.

Two direct `page.evaluate` reads then capture the failed-attempt fixture editor:
one before existing readiness/screenshot work and one immediately after the
existing screenshot attempt. There is no locator auto-wait, sleep, retry,
animation mutation, new oracle node or new expected color. Each optional read,
readiness capture and screenshot attempt has an independent error boundary.
Missing editor/tracer and failed reads remain explicit. Primary observations and
error remain unchanged; later data is stored separately in
`postFailureDiagnostics` and never reconsidered as acceptance. The original
error is rethrown even if optional capture or supplemental persistence fails.
Both browser and server cleanup are attempted independently. Secondary cleanup
errors are recorded in `cleanup-errors.json`; recording failures are logged. A
failing run rethrows its original value (including null/undefined) after cleanup;
on an otherwise successful run a cleanup error remains a failure, not success.

Each phase records host wall-clock start/end and browser monotonic read boundaries;
these clocks are not precisely aligned. The reacquired editor is not claimed to
have proven identity with the failed sample. Existing bounded tracer history can
retain a subsequently delivered transitionend, but missing/failed history cannot
prove completion. No extra wait is added to obtain it.

Screenshot options remain `path` and `fullPage` only. Playwright's documented
default `animations: "allow"` does not fast-forward transitions; `"disabled"`
would, and is not used. Its existing default caret hiding is unchanged. A later
phase can reflect elapsed screenshot processing and is not proof of completion
inside the original nominal polling window. See the
[official screenshot options](https://playwright.dev/docs/api/class-page#page-screenshot).

Focused negative controls cover first/both phase failures, readiness failure,
screenshot failure, later matching paint, missing editors and throwing tracers.
They require the original verdict/attempt reference, both phase attempts and
absence of probe-node creation. These new cases are authored but unexecuted on
the source-preparation seat; only standalone JavaScript syntax/static inspection
is permitted here. Fresh exact-head CI, screenshot evidence and independent
review remain required on the same PR. The observed light failure and original
dark failure remain open; neither sampling-tail nor settled-precision root cause
is asserted, and no timeout, tolerance or production behavior is changed.

### Unpublished candidate rejection and correction

Independent review rejected the first local post-verdict delta, SHA256
`fa77ed4568e40c133722dd6f2a451dcba03d04d28005cee963057d1ac3166d52`.
It accidentally inserted two helper identifiers as extra arguments at the native
sampler's `locator.evaluate` call, continued new phase reads after failed primary
persistence, and retained cleanup that could overwrite the primary exception.
That candidate was not published or executed; its local copy and diff are retained
for review history. Its syntax-only success did not establish correct wiring.

The corrected call is exactly the original `sampleTextareaPaint` callback plus
the `{ kind, border: expectedBorder, ring: expectedRing }` argument. A focused test
reads the actual collector source to guard that complete invocation, primary-error
capture, persistence-status wiring and cleanup handoff. Persistence controls cover
both write and rename failure branches, explicitly skipped new reads and preserved
old screenshot attempts. Cleanup controls cover original Error/string/null/undefined
identity, both close attempts, secondary-record failure and failure after an
otherwise successful run. No assertion, polling sequence or acceptance interval
has been weakened. These additional tests remain unexecuted locally.
