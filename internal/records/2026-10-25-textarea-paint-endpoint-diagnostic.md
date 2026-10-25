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
