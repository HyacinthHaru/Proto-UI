# Separate budget proposal for Issue #549 / PR #688

Proposal head: `d0977f03c1d8e5c6a31552ecd4ae8c8ce39ec508`, tree `6ae154f327697df17c91a41f7ed1199ec330fffd`, based on accepted main `9d9552bbe0bc747e9b7f2f1ff6f6db3414086424`. Only the budget script and one new attribution record change. The feature branch remains unchanged at `868d3adbd22fae98b8e33ea58a9f3353158c506d`.

[Maintainer review 5274632674](https://github.com/Proto-UI/Proto-UI/pull/688#pullrequestreview-5274632674) is **CHANGES_REQUESTED**. It reports no separate source correctness blocker, but requires size reduction or a separately reviewed budget transaction before main synchronization, full exact-head CI, Ready status and re-review. The proposal below is not an already accepted limit or permission to bypass that sequence.

## Canonical measurements and proposed limits

| Entry | Accepted main | Feature candidate | Growth | Old limit | Proposed limit | Feature headroom |
| --- | --: | --: | --: | --: | --: | --: |
| Runtime | 63,228 | 65,865 | +2,637 | 64,000 | 66,500 | 635 |
| React | 82,758 | 85,351 | +2,593 | 83,500 | 86,000 | 649 |
| Vue | 82,480 | 85,093 | +2,613 | 83,500 | 86,000 | 907 |

Values are gzip bytes from the existing fixed whole-entry gate, not application-route download costs. The other six ceilings, measurement algorithm, external boundary, failure exit and two non-blocking consumer diagnostics remain unchanged. The proposed margins use 500-byte rounding with at least 500 bytes of headroom and fit the approximate 0.5–1.5 KB precedent used by the accepted Table transaction. This does not introduce an automatic policy for later increases.

- [Main canonical job 106604782868](https://github.com/Proto-UI/Proto-UI/actions/runs/35683310407/job/106604782868): exact main `9d9552bb`, all nine budgets pass.
- [Feature canonical job 106629473832](https://github.com/Proto-UI/Proto-UI/actions/runs/35691550964/job/106629473832): exact source tree of `868d3adb`, all 44 public packages built and manifests checked, then the three budgets fail. The complete feature CI has eight successful jobs and this one failure.
- Both canonical measurements use Node 22.23.2, zlib 1.3.1-e00f703 and esbuild 0.25.12 on linux/x64. Same-version local diagnostics reproduce all nine artifact sizes and hashes; no toolchain/compression drift is used to justify a limit change.

The two binding JSON files contain every minified size, SHA-256 and gzip value. The main log is included here. The [feature CI supplement](https://github.com/HyacinthHaru/Proto-UI/tree/90b929d8b4f5ecf50abf2d395f98bd66fab3b8f5/evidence/2026-09-22/a11y-part-relationships-ci-868d3adb) retains its full log and default test results.

## Growth audit

The [closure audit archive](closure-audit.tar.gz) contains a readable report, exact executed parameterized runner, source bindings and twelve metafiles. Extract it and follow its README with `MAIN_ROOT`, `FEATURE_ROOT` and a fresh `OUTPUT_DIR`. Both expected heads are pinned. The original hardcoded runner was preserved locally; the parameterized runner was actually rerun, with identical artifact sizes, hashes, metafile bytes and source blobs.

In the audited categories there are no duplicated physical input IDs, src/dist copies, alternate-checkout inputs, new external dependencies or unrelated newly included modules. Each affected closure adds only `a11y/src/part-relationships.ts`. A11y create, Web projection and the new registry account for 95.5%–98.1% of the minified growth. These are minified-output contributions, not additive per-file gzip values.

The new Anatomy workspace dependency is not an entire newly included implementation: `AnatomyPort` is type-only, standalone A11y has no Anatomy inputs on either head, and Runtime/Adapter already include the same seven Anatomy files. The two capability guards account for 46 minified bytes. The audit does not prove a global size optimum and does not grant budget approval.

## Proposal validation

- Applying the proposal script to otherwise unchanged main produces nine passing entries with all output sizes and hashes identical to canonical main.
- A disposable local composition of feature `868d3adb` plus proposal `d0977f03` has tree `a6abc811b7d3655e92b8df003107f609ae530078`. Only the two proposal paths differ from the feature tree. Its nine entries pass the proposed limits, while every artifact size and hash remains identical to the canonical feature result. This is a local conditional experiment, not a new trusted CI run or adoption into #688. The temporary worktree was removed without force; the public feature branch was not modified.
- Restoring the three proposed numbers and removing comments yields executable script code identical to main. The remaining six ceilings and all measurement/exit logic are unchanged.
- Agent operations checks pass 64 tests; the local Agent documentation projection is current. The affected-package plan selects zero packages because this proposal changes only analysis configuration and a record. Any later CI skips must be reported as skips, not as executed package validation.
- Full proposal-head test results are in `validation-receipt.json` and the retained test log. This packet does not substitute the feature's existing test results for the budget branch's own validation.

The staged proposal was independently reviewed against canonical data and the actual two-file diff, with no concrete finding. Its reviewed blobs match the signed proposal commit. That local report remains unassessed human-assisted **partial / ABSTAIN**, not a GitHub review or accepted budget decision.

## Scope and artifact handling

This purely internal numeric transaction is evidenced by actual sizes, hashes, source graphs and gate outcomes. It has no new visible component to illustrate. The related feature's [real component/browser evidence](https://github.com/HyacinthHaru/Proto-UI/tree/92d60ba32ae39579278fcd6127327a7c8fe1444a/evidence/2026-09-22/a11y-part-relationships) remains separate and unchanged; no log screenshot or invented UI is offered as proof of this budget change.

Machine paths in top-level receipts/logs are redacted, with original and redacted hashes in `publication-map.json`. Top-level JSON/Markdown may receive repository whitespace formatting; `manifest.json` binds final published bytes and excludes itself. The closure archive preserves its complete prepared public files and own manifest without reformatting those captured metafiles. No compiled third-party bundles or private prompts are included.

Independent acceptance and actual merge of this separate proposal must precede synchronizing #688. The resulting feature head still needs complete required CI and independent re-review before its own merge. This proposal does not close #549, promote draft entities, implement another family, or cover unmerged #652 growth.
