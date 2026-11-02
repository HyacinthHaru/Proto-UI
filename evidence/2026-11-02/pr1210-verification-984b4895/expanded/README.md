# Static-readable archive expansion

This is an additive transmission copy of the existing evidence.zip, not new execution. Every member is verified against the original source-map.json public_sha256. Text has .txt appended so repository format hooks cannot rewrite its bytes; PNG filenames/bytes are unchanged. bindings.json.txt maps original archive paths to expanded paths and hashes.

Product evidence remains984b4895480908dea99ff34b9ccaca177ddcab63; the test-only repair isb277425. It is not retagged as6202aabd integration validation. The original ZIP, README, manifest and source-map are preserved unchanged.

## Reading entry points

- [Executed native script](native-repeat-executed.cjs.txt), [later parameterized script](native-repeat.cjs.txt)
- [Original baseline result](baseline.json.txt), [baseline log](baseline.log.txt)
- [Fixture-only original paint failure](fixture-control.log.txt), [repaired result](repaired.json.txt), [repaired log](repaired.log.txt)
- [Native candidate summary](native/summary.json.txt), [sole-Root-control summary](native-control/summary.json.txt), [restored summary](native-restored/summary.json.txt)
- Per-family native JSON files alongside those summaries contain actual DOM/ARIA/state snapshots; per-run logs and raw source versions are directly readable here.

No new tests, screenshots, approval or acceptance claimed. Machine-path/ANSI sanitization remains exactly the previously published public derivative; this expansion adds no further transformation. Own source/log attribution and limitations remain in the parent README.
