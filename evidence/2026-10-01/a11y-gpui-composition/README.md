# #688 / current-main GPUI composition observation

The approved #688 head `17a2cff98080eb57f9070a6f45d89b58d3a72c3f` has green CI against its earlier base. Later accepted main `f5bae261491368b586959f1d8b353cf372775221` includes #711's Rust host hub/tests and #712's T0 transport. This packet records a **new, bounded integration failure**, not a failure of the historical CI run or a claim that the entire combined feature tree was executed.

## Actual control and failure

On 2026-10-01, the original main test was run twice from a disposable existing checkout. Only `native/gpui/fixtures/base-button-session.json` differed between these two runs. Neither the assertion, Rust host source, nor timeout was changed.

| Source | Selected test result | Process exit |
| --- | --- | --: |
| main `f5bae261`, its original fixture `f03013386b7ad5134527ac71ffe2d078b08f0fc2` | 1 pass | 0 |
| same main, exact #688 fixture `5b4b97c82c5eded004576a879975230d089f09e5` | 1 fail at `host_hub.rs:247`, `hub.notes().is_empty()` | 101 |

Both commands explicitly selected one test; 14 other tests were filtered out. Baseline ran 10:27:42–10:29:03 UTC and candidate 10:29:03–10:29:04 UTC. Rust/Cargo 1.96.1, macOS, `--locked`, build jobs 2 and a separate Cargo target directory were used. The existing `block` dependency future-incompatibility warning is retained in both logs. Build success is not substituted for the failing assertion.

```sh
# Use a clean disposable checkout of f5bae261, with its committed lockfile.
cargo test --manifest-path native/gpui/Cargo.toml --locked -p proto-ui-gpui \
  --test host_hub the_recorded_install_is_acknowledged_with_the_surfaces_it_needs \
  -- --exact --nocapture
# Replace only the fixture with its exact Git blob from 17a2cff9, then run the same command.
git show 17a2cff98080eb57f9070a6f45d89b58d3a72c3f:native/gpui/fixtures/base-button-session.json \
  > native/gpui/fixtures/base-button-session.json
```

## Observed state and source-derived cause

The new fixture adds one `a11y.snapshot(viewEpoch: 0)` before `projection.install` in each enabled/disabled session. Removing just those two envelopes yields JSON identical to main, including the install transaction and all other messages. The selected test reads the enabled session in its original order.

A separate diagnostic run at 10:32:35–10:32:39 UTC captured the same single `hub.notes()` read in a local variable, printed Debug output, then evaluated the same emptiness predicate. It also failed and actually printed:

```text
COMPOSITION_NOTES=[SnapshotRefused { session_id: "button-enabled", view_epoch: 0, installed: None }]
```

The exact diagnostic test source and SHA are archived. This instrumented run is separate from the original unmodified red test; it is not relabeled as the original execution.

The [source read/replay](https://github.com/Proto-UI/Proto-UI/blob/f5bae261491368b586959f1d8b353cf372775221/native/gpui/crates/proto-ui-gpui/tests/host_hub.rs#L26-L37) deserializes the full recorded sequence. The [host branch](https://github.com/Proto-UI/Proto-UI/blob/f5bae261491368b586959f1d8b353cf372775221/native/gpui/crates/proto-ui-gpui/src/hub.rs#L302-L309) rejects a snapshot without a matching installed epoch; the [original test](https://github.com/Proto-UI/Proto-UI/blob/f5bae261491368b586959f1d8b353cf372775221/native/gpui/crates/proto-ui-gpui/tests/host_hub.rs#L228-L248) later observes the retained diagnostic. Numeric zero is accepted by the wire schema; the observed mismatch is `installed: None`, not a claim that zero is universally invalid.

This is internal protocol/host-harness evidence, with an executed state observation and causal walkthrough. No new browser screenshot, user-input journey, full GPUI integration pass or normative protocol change is claimed. The old Web/browser results do not cover this newly introduced Rust consumer. The two original PR approvals remain attached to their exact historical source head; they do not prove this later combination passes.

## Files and scope

[reproduction-records.tar.gz](reproduction-records.tar.gz) contains both original logs, receipts, diagnostic log and exact executed diagnostic Rust source, plus the independent source/fixture comparison. Its internal manifest and raw/public SHA map distinguish path redaction from verbatim data. The report's local references use explicit tokens and are not promised as public URLs. No dependency bundles, Cargo cache, private worktree files or simulated screenshots are distributed.

The temporary checkout was restored to its original detached commit, clean; product head `17a2cff9` and the user's primary worktree were not changed. This packet reports the failure before a fix. Choosing the smallest governed owning-layer repair, validating it, and obtaining any resulting-head review remain separate steps. Local source inspection is partial/ABSTAIN, not a GitHub Review disposition. The evidence-only branch must never merge into product.
