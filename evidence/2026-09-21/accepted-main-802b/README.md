# Accepted-main integration evidence for #672 and #680

Agent’s sanitized request paraphrase: after the independent budget prerequisite is accepted and merged, synchronize both bounded repairs with main, preserve their product diffs and validate the resulting exact commits before requesting review.

[PR #673](https://github.com/Proto-UI/Proto-UI/pull/673) was independently [approved by guangliang2019 at c9917312](https://github.com/Proto-UI/Proto-UI/pull/673#pullrequestreview-5265617643) and actually merged as `802b3c2cde64d8c8ff6728930097789fefa98eec` on 2026-09-21 at 10:38:26 UTC. Its only changes are the accepted Adapter budget script and dated attribution record.

| Product | Previous validated head | Current signed merge | Relative to accepted main |
| --- | --- | --- | --- |
| #672 / #660 | `b6e260ed3c8e42668b68b3e76a6ea04743178382` | `6b4a6c7f21cc6018b2412b5c0f4a1467ed3b6e82` | One existing test line normalizes path separators |
| #680 / #648 | `488f70cdd86bef0109eb3faab8fc4cfe0e86f95c` | `0f9bb761b0de92fd0b78dc0730727ca39202651e` | The same three Text Control implementation/test/catalog files |

`integration-binding.json` and `review.md` record the exact old/new source objects and independent inspection. Both merge deltas are identical to accepted main’s delta. No application, test, spec or lockfile changed within either branch. The evidence branches remain separate from both products.

## Fresh verification

- CLI: 158 focused tests pass on `6b4a6c7f`; Text Control and affected integrations: 74 tests pass on `0f9bb761`. Searchable logs are adjacent; local checkout paths were replaced with `<checkout>`.
- [Native Windows run 35591179151](https://github.com/HyacinthHaru/Proto-UI/actions/runs/35591179151) tests exact source `6b4a6c7f`: 75 passed, zero failed, exit 0. The workflow revision is a distinct evidence-only commit `741d93287fe1ccdfdb96caf82fc6c25e3a92fdfb`. Raw observations, receipt, test results and log are in `windows-run-35591179151.tar.gz`; `windows-source-binding.json` strictly reconciles Windows CRLF bytes with the committed LF blob.
- All nine package budgets pass locally on each new head. Both trusted CI package jobs also pass: [#672 job 106305751564](https://github.com/Proto-UI/Proto-UI/actions/runs/35591135538/job/106305751564), [#680 job 106305733206](https://github.com/Proto-UI/Proto-UI/actions/runs/35591180882/job/106305733206). Each CI checkout tree equals its product head, and all nine minified sizes/SHA-256/gzip values equal the local measurements; see `ci-package-binding.json`.
- Full new-head CI: [#672 run 35591135538](https://github.com/Proto-UI/Proto-UI/actions/runs/35591135538), [#680 run 35591180882](https://github.com/Proto-UI/Proto-UI/actions/runs/35591180882). These runs and independent exact-head maintainer acceptance are separate from the focused evidence above.

## Reused evidence and limits

The existing [CLI b6e260ed packet](https://github.com/HyacinthHaru/Proto-UI/tree/3791f73db99ef6945f45ade96d1dceb55761cd94/evidence/2026-09-20/cli-hook-paths/merged-main-b6e260ed) retains its original full/type/browser runs and actual component captures. The Windows verification is refreshed above.

The [Text Control 488f70cd packet](https://github.com/HyacinthHaru/Proto-UI/tree/17de37147d07095e56e561b2629ebea5fe3a5517/evidence/2026-09-21/text-control-composition-lease) retains its original six-case / 109-assertion Chromium comparison, eight inspected actual component images and reproducible fixture. `text-browser-source-binding.json` verifies all 47 repository bundle inputs against `0f9bb761`, plus the original fixture input. The original failing baseline also remains source-equivalent to accepted main. No screenshot caption was rewritten and no old run is represented as a new-head execution.

The code binding is complete for this integration increment. Text Control browser input remains synthetic (`isTrusted=false`), with test-driven Module lifecycle; OS IME and complete Adapter interrupted-replacement journeys are not claimed. No scope, API, lifecycle or budget decision beyond the independently accepted prerequisite was added.

The work uses existing Proto UI MIT source. Codex assisted integration and evidence preparation; independent agent inspection is local and no maintainer approval is implied by it.
