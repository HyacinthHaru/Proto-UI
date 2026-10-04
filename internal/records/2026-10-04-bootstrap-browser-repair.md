# Bootstrap evidence repair on current main

Date: 2026-10-04. Non-normative continuation of PR #808, within #799 / #792.

## Merge and diagnostic baseline

The PR head `48073a78da9e37539f8060350595d4b3653ba369` was merged with main `d4bdb66b54d68625fb3da1109a76e0829c1e77d7`, preserving both histories. The sole textual conflict was the generated GPUI style-token count. Running `node --import tsx scripts/gpui/generate-style-fixture.mts` regenerated the combined inventory: 286 tokens, 280 compiled, six without declarations. An automatic merge also duplicated the Input union/required-parts entries; those duplicate declarations were removed while retaining both the Bootstrap and Shadcn Input registrations.

The existing four editor failures remain intentionally unrepaired at this checkpoint. The exact-head Actions fixture retains its `count === 1` assertions and the native-input attribution added in `48073a78`. A fresh run after this conflict repair can distinguish multiple native edits from duplicate outward delivery. The governing draft `C-TEXT-CONTROL-0001-C` requires normalized events in native order; `P-BASE-TEXTAREA` owns the editor and event protocol, and `P-BOOTSTRAP-2-3-2-TEXTAREA` only projects its appearance.

## Verification and limits

- Six browser-scaffold boundary checks pass.
- The initial five-file focused run passes 58 tests; a duplicate `input` warning from the automatic merge was then corrected and the affected registry plus actual Bootstrap recipe test file rerun: 27 tests pass. An initially supplied docs test filter matched no file; only the actual collected files are counted.
- Full workspace TypeScript (`check:types:workspace`) passes.
- Prototype catalog, generated GPUI fixture check and all source-derived style preset checks pass.
- Locked dependencies were installed offline from the existing package store.
- A pure-native Chromium attribution probe could not open a page: the execution sandbox rejected Chromium's process-singleton socket. No runtime assertion was reached and no local browser result is claimed. The Actions-only fixture guard remains intact; no fake Actions environment or stale external URL is used as evidence.

Real exact-head Actions results and new screenshots remain pending. Prior-head screenshots remain historical evidence and must not be presented as the new source. This eight-part increment does not complete the Bootstrap Base family; remaining parts and Compiler/native coverage remain open.

## Measured event attribution and fixture repair

The exact-head `60e491d9` Actions run `37184204831` reproduced the same 11/15 browser result. Artifact `11296775285` binds to that SHA and Chromium `154.0.8037.57`. In WC, React, Vue and Vue 2, the initial Input fill produced one trusted native input and one matching outward request. The multiline Textarea fill produced three trusted native inputs, with `data` equal to `Changed`, `null`, and `Second line`; each reported the complete `Changed\nSecond line` value, `inputType: insertText`, and `composing: false`. The three outward requests matched those facts exactly and in order.

The first wrong expectation was the browser fixture's assumption that one Playwright `fill` operation must mean one native event. No duplicated or dropped outward delivery was observed. The governing native-order contract does not authorize coalescing this stream in Base or the Bootstrap projection.

The repaired fixture retains a strict one-request single-line fill for both physical editor kinds, zero additional requests during disabled/read-only transitions, the exact one-additional-request restoration delta, controlled request/owner acceptance, and physical editor identity. Before the disabled/read-only transitions, it fills the Textarea with the original multiline value and checks the literal DOM and protocol value plus exact native-to-outward payload sequence equality. It never dispatches a synthetic event or writes the editor value directly. Native event count is measured, not hardcoded to one browser release's fragmentation.

The same assertion helper is tested against the recorded sequence and rejects duplicate, dropped, reordered, coalesced, altered-value, altered-input-type, altered-composition, missing, and synthetic event evidence. The bounded workflow runs these adversarial tests beside the real four-runtime fixture and tracks both helper paths. New browser acceptance remains pending until the repaired exact head runs; this diagnosis does not relabel the failed baseline as passing.
