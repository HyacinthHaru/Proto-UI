# Native ownership and binding evidence at fd9fc6b4

The signed candidate `fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2` (tree `978bb562be172cc6903fb038e85bc80e0034f574`) passed the same 18 native Chrome cases that preserve three distinct historical failure boundaries. The candidate has **218 passing checks: 141 contract-linked observations and 77 fixture execution controls**, with no assertion, initialization, page, or console failures. Passing this bounded matrix is not a review disposition, stable semantic admission, package-budget approval, or a claim that the separate full Adapter journeys ran at this head.

All four browser processes have ended. The candidate source tree was clean before and after execution. The runs used Chrome `153.0.8010.53`, Node `22.23.2`, esbuild `0.25.12`, and Playwright core `1.58.2`. They ran serially from 04:45:26 to 04:46:29 UTC on 2026-09-22. No product file, old result, provenance file, or reviewer failure record was modified. No GitHub operation occurred.

## Heads and actual outcomes

| Source head | Interpretation | Passing / failing checks | Behavioral boundary observed |
| --- | --- | --- | --- |
| `8202853c45eb1e3d4f4f7efb29b69471435dea39` | Initial two P2 findings | 177 / 41 | Explicit snapshot ID overwrites a later host ID; independent writer ownership is mistaken for host authorship; later revocation defects also remain. |
| `83e7bd1e6481efdb637d47b54ca5b3a5249f8c65` | Observer-only repair; historical residual | 201 / 17 | Ordinary observer cases pass. The two real State-before-delivery variations still fail, as do pending-ID revocation cases. |
| `34937f8e0cc0cd4feed67a69bea30ffa4355f79c` | Same-tick replay repair; new revocation finding baseline | 206 / 12 | Original ownership and State replay paths pass. Generated/explicit × detach/replacement before observer delivery fail; all four observer-first controls and both truly-detached author-conflict controls pass. |
| `fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2` | Root-confirmed frozen candidate | 218 / 0 | All 18 cases pass, including synchronous before-reveal checks and observer-after checks. |

Every head ran the complete same matrix, not just the cases expected to fail. Every head passed the ordinary generated-ID control, the real State generated-ID control, and the original actual WC-provider binding sequence. There were zero fixture execution failures in all 72 case executions. The failure totals are assertion counts, not 41/17/12 independent product findings.

Full per-case actual/expected values, timestamps, errors, hashes, and source provenance are in [ownership-native-summary.json](ownership-native-summary.json). In this public edition, the matching `runs/ownership-native-{8202853,83e7bd1,34937f8,fd9fc6b4}-1/raw.tar.gz` archives contain results, provenance, esbuild metafiles and per-case trace, DOM and AX files, with local paths redacted. Compiled bundles and source maps remain local; their hashes and input records are retained. The four outer process logs are published under `validation/*.log.gz`. Historical red runs exited 1; the candidate exited 0.

## What actually ran

The first four cases preserve the independent review's button/section DOM, ref/family/key/epoch/append snapshots, target-before-dependent submission, and `proto-id`, `host-later`, and `independent-id` values. Their constructor order also matches the original repro. They execute the real `createWebA11yProjector` and registry. The absent-dependent control removes the dependent _relation_ before writer release and restores it afterward; it does not claim source Runtime unmount.

The three replay variations use actual Core Runtime, State, A11y, and WC capability-provider code. An ordinary owned State `busy` starts false, and `busy.set(true)` is invoked in callback scope immediately after the host ID assignment or independent-writer takeover, without yielding. The fixture records committed State and the actual target projector input with `busy:true`. This proves the requested normal State replay path; it is not a manually manufactured snapshot delta. The neutral `busy=false` scalar is the only intentional extra initial input in those variations.

The `wc-provider-binding` case and all ten revocation cases use the actual `createWebComponentModules` A11y capability plus `createHostSurfaceProjection().setSurfaceTarget`. They import those implementation seams explicitly. No projection, identity, ownership, epoch rejection, or target-notification algorithm is copied into the harness. Revocation cases use the review's `review-id-detach` family, key `x`, epoch 1, target-before-dependent construction/submission, generated versus `proto-id`, and later `host-later`. Their replacement notification enters through the real WC provider rather than the review's synthetic slot.

These are **internal host-contract fixtures**. Manual ID assignments, lifecycle method calls, supplied snapshot epochs, physical DOM replacement, and hidden/reveal barriers are declared host stimuli. The State variation uses actual Runtime production paths, but the K and revocation fixtures are not complete Adapter user journeys. There is no product-button event, physical OS input, keyboard, screen reader, full resource-count, or business-UI accessibility claim. The fixture has deliberately plain, unnamed native controls; their blank AX names are not presented as a product accessibility pass.

## Synchronous timing evidence

The order below comes from saved native trace events and DOM observations, not the final tick alone. Each `seq` is local to its case's `trace.json` under the candidate directory.

| Case | Exact native order and observed values |
| --- | --- |
| `explicit-id-replay` | `seq71` host write returns with target `host-later` / old controls `proto-id`; the real target State replay runs before `seq74`, which has `busy:true`, ID and controls both `host-later`. The first subsequent mutation delivery is `seq76`. |
| `independent-writer-replay` | `seq73` independent writer returns with ID `independent-id` / controls absent; actual State replay finishes at `seq76`, still absent. Observer delivery is `seq78`. Writer disposal at `seq81` restores the original `pui-a11y-1` ID and controls. |
| `pending-generated-detach-before-delivery` | Live host write `seq9`; actual projector detach returns at `seq10` with controls absent while the host has **not** set hidden; host barrier is set at `seq11`; epoch 2 target and matching source relation are projected by `seq16`, with ID/controls `host-later`; observer delivers at `seq18`; reveal occurs only at `seq21`. This supplies D withdrawal before the host visibility removal and E projection before the fixture's reveal. |
| `pending-generated-detach-observer-first` | Host write `seq9`; native deliveries `seq11/12` establish `host-later`; boundary begins `seq14`; detach `seq15`, hidden barrier `seq16`, current epoch projection `seq21`, later reveal `seq26`. This is a real observer-first ordering control. |
| `pending-explicit-replace-before-delivery` | Live host write `seq9`; barrier `seq10`; actual successor DOM `seq11`; existing provider setter returns `seq12` with successor ID/controls `host-later`, while target epoch remains 1; first later MO delivery `seq14`; reveal `seq17`. The retired node keeps its later authored `host-later` ID. |
| `detached-explicit-author-conflict` | Actual detach `seq9` first withdraws controls; hidden barrier `seq10`; the new author ID is written only at `seq11`; rematerialization `seq16` preserves `host-later` and controls remain absent, both before/after MO (`seq18`) and before reveal (`seq21`). This distinguishes the genuinely detached conflict from a pending live-binding write. |

Every generated/explicit revocation case also asserts the declared observer ordering from the actual trace: either no native delivery occurs between live write and boundary, a delivery does occur first, or detach precedes the author write. For positive cases, the current identity/relation is checked synchronously at provider/projector return with the host barrier held, and again after a native observer/frame boundary before a separate reveal command. The fixture uses `requestAnimationFrame` for that boundary; it never sleeps broadly or sends a corrective update to make a verdict pass.

The D/E observations here establish the provider/projector side under an explicit host barrier. The real production Adapter pending/reveal behavior still belongs to the separate Tabs/generic probes and Runtime/Adapter tests; this fixture must not be used to claim unexecuted whole-framework ordering or reciprocal naming coverage.

## K: real capability provider, same supplied epoch

In `wc-provider-binding`, source epoch starts at 4 and target epoch at 3. Actual WeakMap DOM identities distinguish the nodes. Target input node 4 is replaced by textarea node 5; the existing setter returns at `seq11` with the reserved `pui-a11y-1` and source token `source-caption pui-a11y-1`, before reveal `seq16`. The old input's exact prior empty `id=""` is restored. A different authored-ID input (node 6, `host-different`) is bound at `seq22`; the author ID survives and only the leased source token is withdrawn, leaving `source-caption`. Rebinding node 5 recovers at `seq33`.

Old target epoch 2 and old source epoch 3 submissions do not alter the current relation. Advancing only the target epoch 3→4 with the same ID removes the stale contribution at `seq53`; refreshing the declared relation target epoch restores it at `seq59`. This is recorded as explicit host-contract snapshot input, not a claim that this fixture drove a user-facing Runtime epoch transition.

Source button node 3 is replaced by button node 7 in source epoch 4. The setter returns at `seq65` with `replacement-caption pui-a11y-1`, while the old source retains `source-caption`; reveal is `seq70`. Null binding at `seq75` releases only the lease token, and rebinding the original source recovers at `seq82`. Rewriting/reinserting the retired target at `seq90` cannot affect the active target's identity or controls. All before-reveal cases retain an observer-after, still-hidden capture too.

These observations bind to the actual seams at candidate source:

- [`packages/adapters/web-component/src/runtime/modules.ts:364–380`](https://github.com/Proto-UI/Proto-UI/blob/fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2/packages/adapters/web-component/src/runtime/modules.ts#L364-L380), Git blob `33ee0ac32be8196904eccf9cfba1b6ce223516af`, wires the surface and trigger subscriptions to the real A11y projector.
- [`packages/adapters/base/src/host/surface-projection.ts:28–37`](https://github.com/Proto-UI/Proto-UI/blob/fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2/packages/adapters/base/src/host/surface-projection.ts#L28-L37), blob `e497ba70222426ee38bb7feb9acfa9fc1250537e`, publishes the new surface before synchronous subscriber notification.
- [`packages/modules/a11y/src/web.ts:662–717`](https://github.com/Proto-UI/Proto-UI/blob/fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2/packages/modules/a11y/src/web.ts#L662-L717) and [`:832–887`](https://github.com/Proto-UI/Proto-UI/blob/fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2/packages/modules/a11y/src/web.ts#L832-L887), blob `50b77dc816a98708247fdc89390ef783425c023e`, are the actual identity reconciliation, update, target-change, and detach paths.

## DOM, AX, source, and preservation audit

All **300 AX captures and corresponding DOM documents** were read and reconciled to their stored checkpoint facts, including historical failing DOM. Each run has `ax-review.json` with all 75 entries; there are zero DOM/AX mismatches. Agreement with a failing baseline's DOM does not turn that baseline into a contract pass. Chrome omits the AX controls relationship while the target is behind the fixture's hidden barrier; once revealed, it reports the live target backend node and current IDREF. AX is captured after an observer/frame boundary, never falsely labeled as synchronous setter-return evidence. Raw mutation records retain node identity, old values, per-batch reconstructed new values, and added/removed node identities.

All source inputs were re-hashed after execution and all tracked input Git blobs were compared with their bound HEAD. There were no mismatches. Candidate provenance records 272 bundle inputs, including 267 tracked source files; the remaining entries are external dependency/harness inputs. Public export names resolve to selected TypeScript sources, so this is source-bundle evidence, not an installed package or built-dist claim. The earlier reviewer scripts remain distinct Happy DOM/built-dist evidence.

The exact executed harness is preserved in `ownership-harness-v1/`:

- `ownership-probe.mjs`: SHA-256 `4232dc135571594e591ceedb84548c41dd04f8b01e90fa9ab0a62b6b4260a1ed`.
- `ownership-fixture.ts`: SHA-256 `8bba1539e49b0a96a955497a19e09e70508d69ed3a92c923d8d34e1f8c11b673`.

The pre-revocation prepared-only versions remain in `ownership-harness-pre-revocation/`, matching the two earlier `preparation.json` manifests. They never produced a browser assertion result. The three baseline checkouts share Git objects and only temporary dependency symlinks; their tracked source remains clean. `ownership-evidence-audit.py` is a read-only post-processing script, separate from the executed browser harness. Existing Tabs/generic evidence and its old provenance have not been changed.

To reproduce the same full matrix, set `SOURCE_ROOT`, a fresh external `OUTPUT_DIR`, and exact full `EXPECTED_HEAD`, then run `node ownership-probe.mjs`. The driver rejects a different HEAD. `CASES` can narrow a debugging run but must not be described as the full matrix. `--prepare-only` remains a source-build-only operation and exits before browser/server creation.
