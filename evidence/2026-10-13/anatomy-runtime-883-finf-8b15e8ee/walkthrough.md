# Executed C-group transition walkthrough

Current product candidate: `8b15e8ee5d5795ec76bf4c6355a9ad9a9b47a6a6`, tree `b4bb8316f9e01b509dbf757fad255cb89172c320`, imports observed WIP foundation `3ce1b6acdab94eee3dff93409dd43dd8ce3702aa`. Historical 485/949/67 execution and oracle provenance remain separately identified. The current source union preserves all 35 C paths byte-for-byte and imports four disjoint CLI paths; importing WIP is not acceptance. This packet preserves the execution times and frozen-snapshot provenance of each control; matching Git input bytes do not turn a precommit run into a later run.

## Ordinary Search selection admission

Authority is the existing draft `internal/contracts/prototype-base/search-selection-completion.v0.md`; ordinary registered-choice values must identify a unique item in the same Root. Autocomplete's separate free-text commitment keeps its prior behavior. The clarification was made reviewable before changing implementation.

The failing fixture uses the actual WC Adapter and Runtime in Happy DOM. Alpha and Beta both remain registered with value `shared`; querying Alpha hides Beta without unregistering it. The source checks in `packages/prototypes/base/src/search-primitives/family.ts` originally counted only visible matches. The first divergence is acceptance of an ambiguous ordinary value, before any lifecycle-tail question.

| Observed step | Fixed pre-repair merge485 | Repaired source |
| --- | --- | --- |
| Registered matches for `shared`; query-visible matches | 2; 1 | 2; 1 |
| Ordinary `select('shared')` acceptance | true | false |
| `valueChange` / Command `execute` proposal | emitted | absent |
| Combobox after clearing query | both same-valued items selected | rejected request did not introduce selection |
| Unique visible/enabled value | accepted control | accepted control |

The same final 25-test bytes ran as 16 passed/9 failed on fixed merge485 and 25 passed on the candidate. The original 9 tests remain, plus 16 direct cases for the three families, controlled/uncontrolled requests, hidden/disabled duplicates and normal controls. The independent execution includes the actual final25 and five extra nested-Root/free-text boundary controls. Native keyboard/pointer input, screenshots, installed packages, other Adapters and AT were not measured by these fixtures.

## Calendar notification retirement

Authority is the draft notification-completion contract and the existing instance/view lifecycle. `packages/prototypes/base/src/calendar/index.ts:251` captures the calling owner and view epoch before a value request. State notification, Context publication and month request can synchronously unmount, dispose or remount that owner. An accepted request may return true after retirement, but the old invocation must stop before the next dependent publication.

| Observed transition | Pre-repair | Repaired control |
| --- | --- | --- |
| State/Context/month notification | observer invoked and retirement occurs | same observer/retirement |
| Return from initiating request | stale continuation or throw in nine cases | accepted true without stale event |
| Final `valueChange` in normal case | one | one |
| Final `valueChange` after unmount/dispose/remount | old tail continued | zero |

Three observation points multiplied by normal/unmount/dispose/remount give 12 controls. The independent fixed-merge baseline has 9 failures and 3 normal passes; all 12 pass with the candidate. These are actual Runtime/semantic fixtures, not physical focus or an AT navigation test. A separate missing-navigation-click feedback was inspected against existing Web and GPUI click-to-PressCommit bridges; it was not used to invent a second handler or claim AT acceptance.

## Authored created failure and resource teardown

Current draft `C-LIFECYCLE-0002-J` requires the initiating synchronous authored-created thrown value to survive reachable teardown, including secondary failures. It does not define a general callback-error policy. The private holder in `packages/runtime/src/instance/session.ts:566` records only the authored created-loop failure, including falsy values. The existing teardown runs before that same value is rethrown; initial Props/association errors and ordinary explicit disposal retain the foundation aggregation behavior.

The actual controls observe two queued Delay tasks, two beforeDispose callbacks, Props subscription release, disposal diagnostics, late delivery and owned State validity. With all secondary cleanup paths throwing, both tasks are canceled once, both authored cleanup callbacks and diagnostics run, Props releases, late callbacks remain zero, State is invalid afterward, and the returned thrown value is the identical initiating value. Separate controls preserve non-created AggregateError behavior and normal explicit-dispose aggregation.

The final author tests also verify cleanup-time State is still false, new Delay registration is rejected, the queued Delay is canceled once, a diagnostic runs once and a later host flush produces no stale callback. These are artificial host orderings, disclosed in the executable fixture, not a real browser schedule.

## Discriminating the Delay test oracle

The new cleanup policy deliberately catches secondary callback failures. Two expectations inside beforeDispose could therefore fail without failing the outer test. Commit949 moves those expectations to observations asserted after the catching boundary, while preserving their meaning.

| Same-position private test-body mutation | Result |
| --- | --- |
| Old oracle plus forced early cleanup-observer throw | 14 passed, exit0: false positive |
| New oracle plus the identical forced throw | 4 failed/10 passed, exit1: external observations detect the missing work |
| Normal Runtime and final new test bytes | 14 passed, exit0 |

The mutation changes only the saved private test body, not product Runtime. No timeout, scheduler or product behavior was relaxed. Final test bytes match commit949. The independent 172-case execution loaded433 tracked inputs and none intersects this final test-only change; that earlier execution is retained with its original time and final Git binding, without a rerun claim.

## Preserved integration and limits

Drawer snap now equals the exact incoming533 source bytes, which include both the existing terminal admission release and the upstream identity/generation/request guards. Independent upstream Select/Drawer74 and existing popup/snap41 controls passed on the frozen final source. Accordion's eight Root/Item State/Context retirement controls already passed; no duplicate source fix was added. Calendar/Tree automatic merge regions and earlier C repairs are separately enumerated in the preservation audit.

This is source-bound internal/semantic evidence. No new PNG, native Form/Search/Calendar journey, four-Adapter AT equivalence, installed-package or full Finf acceptance is claimed. The original local test preflight, complete general results, canonical eight browser jobs and their incomplete/skipped scopes remain separately reported; none is replaced by these focused controls. Local independent review remains unassessed human-assisted partial/ABSTAIN, not GitHub approval.

## Fixture registration discovered by the full combination

The exact949 full general exposed a missing portable fixture record for existing draft `T-LIFECYCLE-0001-CASE-FAILED-CREATED-TERMINAL-CLEANUP`. The original all-case alignment assertion fails in an isolated run as well. Both target files were identical on533 and949; the foundation CI stopped earlier at public-docs and did not run this assertion.

Commit67eb adds that existing expectation literal and G/J case to the shared fixture and its consumesCases list. Spec cases, fixture cases and the implementation list now contain the same eight IDs. No expected trace, criterion or lifecycle status was invented, and the original alignment test is unchanged. All fixture files plus the two real resource/Delay test files pass:19files176tests. Full types at these final precommit bytes complete with860Astrofiles0errors0warnings11hints; local CLI build1/47 only. Two spec-authoring inputs pass against533.

## Remaining Shadow admission observation

Two original-file controls load396 Git-bound tracked inputs at fixed485 and949; both show one Shadow failure and five passes. The website native-anchor full-general failure does not reproduce in either isolated control; its mechanism remains unknown. Only Runtime session differs among the Vite-loaded inputs; direct filesystem reads outside Vite are not claimed intercepted.

One additional failure-preserving Shadow fixture adds only a finally observer before original parent cleanup. The actual loaded inputs are 376 exact Git67 files plus one private test-body override containing only the finally observer. The captured error is the existing hidden-token I1 recipe admission error from shadow-split-effects.prepare through WC adapt.project. Observed events are commit start, commit done, mounted, then disposing/unmount/disposed. There is no observed mounted-after-dispose sequence.

Source inspection locates a WC initial-acquisition boundary that temporarily stores project() failures, invokes attachView/mount, and rethrows the acquisition error afterward. This remains a WC/Shadow acquisition handoff candidate for the A/cross-owner workstream; it is not evidence that the authored-created J holder violates its definition. The original assertion and failure remain. Neither this diagnosis nor a reproduced baseline failure is acceptance or permission to silently delete the test.

The original Shadow test stops at its first failed mounted-event assertion. Its following listener, exposed-handle, marker and Shadow-child cleanup assertions did not execute; dispose.done alone does not establish those postconditions. The diagnostic did not measure numeric epochs or the complete internal microtask ordering.

## New3ce style combination and current full general

Incoming3ce adds six bounded physical utility recipes, invisible generated entries and its new renderer test, and removes two family-closure assertion expressions: the required-count lower bound and the specific drag-height CSS check. Those changes are imported WIP history, not C-authored test weakening or independent semantic acceptance. The 35 C net paths have no overlap with the four incoming files. Independent preservation checks the entire union and all modes/blobs, plus433/433 unchanged inputs of the earlier172-case execution.

Actual new merged-byte validation:45files659passed (43C plus2CLI), full types860files0errors0warnings11hints, all preset manifests/physical closure plus12palette tests passed. The original pnpm test passes the previous Bootstrap style gate and stops at catalog537. These checks began around the commit boundary and bind the unchanged final tree; they are not mislabeled postcommit executions.

The original complete general plan actually ran on signed8b15 with max2/min1, producing11876passed/352failed/36TODO and1unhandled error, exit1.43mapped C files have597passed; the whole run stays red. Relative to67, ten failing titles disappear and one historical Dropdown title returns; matching/missing titles alone do not establish all causes. The C/CLI source check results and unexecuted native scopes remain separate.

## Form preparation feedback already covered

Feedback4254178835 targets3ce foundation, whose FormRoot lacks the C guards already present in884. Current8b captures run, view epoch, cancellation generation and submission sequence before cancel(), and rechecks after cancel() and submitted.set(false), before assigning waiting/pending. The old invocation cannot take ownership from a retired view or a newer nested accepted submission.

One actual private RuntimeSession probe uses the real FormRoot and public Root request/State APIs, plus an authored Field-role fixture. It covers two preparation observation points multiplied by normal/unmount/dispose/remount/legal nested operation (10cases), and preserves the original validation-error5case block byte-for-byte. Observers perform/record actions; expectations remain outside callback error-catching boundaries.

| Same private15cases                                   | Actual outcome   |
| ----------------------------------------------------- | ---------------- |
| Fixed current8b product                               | 15passed/0failed |
| Other inputs remain8b; only FormRoot replaced with3ce | 6passed/9failed  |

The old-source eight preparation failures show retired pending=true, disposed-State access, or stale/duplicate validation. Its ninth failure is ordinary validation throw leaving pending behind. Current guards preserve new-view request recovery, one nested completion and the original error rules.307current product inputs are Git8b exact; the discriminator has306of those plus one exact3ce FormRoot override. This is not a whole3ce execution, full official Field/WC validation, native browser or AT proof. No new product fix or repeated commit is attributed to this already-covered feedback.

## Dropdown full-run failure remains unexplained

A single paired original Dropdown file control has5passes on fixed67 versus1failure/4passes on fixed8b. All386tracked Vite-loaded inputs are byte-identical and neither changed CLI path enters that loaded graph; direct filesystem reads are not intercepted. The actual failing light/dark polling assertion and both outcomes are retained. This distinguishes the observed full-run failure from an established source regression, but does not prove a flake or determine the mechanism. No timeout or assertion is changed and no speculative A/theme repair is included.

## New dedicated native execution

All dedicated job checkout logs and API trees bind8b15/b4bb. Bootstrap now really passes its15browser test cases; the four-file Vitest command is44passed/1failed at the controls token-array closure assertion. Its9fixture and12palette prechecks pass. The old67 preflight block is historical. Field is22passed/3LiquidGlass focus failures; Collapsible32passed/4LiquidGlass focus failures. Diagnostics remain pending/time out; focused=false is not inferred. Subsequent assertions in the failed cases and the final Field inventory checker did not run. No screenshot ZIP/PNG was downloaded or visually accepted by this collection, and exact Chrome version is unmeasured in the read logs.
