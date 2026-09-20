# Issue 660: portable hook-coverage paths

This packet records native Windows execution of the existing CLI coverage suite. It is evidence for an internal test-comparison defect, not a claimed visible product failure.

Baseline: `424cc6405049fe74d5bf5f53d428017827c01632`. Candidate: `0fefe7433209992d2ec47e009d934bc5a925e83d`. Product diff: one line in `packages/cli/test/lowered-hook-coverage.test.ts`. Both native runs use Node 22.23.2, Corepack pnpm 10.32.1 and the frozen workspace lockfile on a GitHub-hosted Windows runner.

## First divergence and consequence

The gate traverses the same source files as the production extractor, reads each actual file using its native absolute path, and labels discovered hook/state records with `path.relative(REPO_ROOT, absolute)`. Its two-step binding witness compares the full record, including a slash-separated fixture filename.

| Observation | Native Windows value |
| --- | --- |
| `process.platform` | `win32` |
| `path.sep` | Backslash |
| Native relative path | `packages\prototypes\brutalist\src\textarea\root.proto.ts` |
| Expected fixture path | `packages/prototypes/brutalist/src/textarea/root.proto.ts` |
| Native path equals fixture | `false` |
| Actual scanner usages in the target source | `asTextareaRoot / focusVisible`, `asTextareaRoot / disabled` |
| Unresolved reads in that source | None |

The scanner has found the required hook/state pair; the full-record comparison still fails on the filename representation. The failure occurs at the existing `toContainEqual` assertion, before the later gate assertions can complete. The original diagnostic script measures native path/scanner facts independently; the assignment line is read from the actual checked-out test. It does not expose or modify the test's private `found` array.

The candidate applies `.split(path.sep).join('/')` to the existing repository-relative label before it enters the scanner/coverage records. The absolute filesystem reads, full file set, witness tuple, exposed-attribute check, unresolved-read check, missing-hook check and data-variant check are retained. Windows accepts the slash form for the same file/import context; the complete native suite verifies its existing import and scanner cases as well.

## Executed results

| Run | Exact source | Actual test exit | Passed / failed |
| --- | --- | --- | --- |
| [Native baseline](https://github.com/HyacinthHaru/Proto-UI/actions/runs/35514218383) | `424cc640` | 1 | 74 / 1 |
| [Native candidate](https://github.com/HyacinthHaru/Proto-UI/actions/runs/35514686874) | `0fefe743` | 0 | 75 / 0 |

The only baseline failure is `resolves every hook state a shipped rule condition reads`, with the expected deep-contain mismatch. The evidence workflow treats that specific red result as a successful reproduction; a green workflow icon on the baseline is not a claim that its tests passed. The candidate workflow requires zero failing tests.

The macOS path control records `/` as the native separator and an already matching fixture, explaining why that platform does not reproduce this failure. Candidate scanner/extractor focused tests pass all 158 cases. Full repository/types/browser validation is recorded separately in the final validation receipt.

Windows checkout bytes use CRLF. An initial cross-machine raw hash comparison against the local LF file failed. The recorded native hashes exactly match each immutable Git blob converted to CRLF, as detailed in `source-binding.json`; the test assertions and observations were not changed to address that evidence-format difference.

## Reproduction and limits

On native Windows, check out either exact source commit, use Node 22 and the declared Corepack pnpm, install the frozen lockfile, then run:

```sh
corepack pnpm@10.32.1 exec vitest run packages/cli/test/lowered-hook-coverage.test.ts --maxWorkers=1 --minWorkers=1 --no-file-parallelism
```

The signed evidence-only workflow commits are `2692e148f2730491d3da514e3c17d93ec84154e4` for baseline and `6440aef47b47e54208274b733ba8080b9df1950f` for candidate. Each checks out its declared product source SHA; it does not replace assertions, mock the path API, use WSL, or emulate Windows. The workflow source is retained on this branch at `.github/workflows/cli-hook-paths-evidence.yml`; the two historical commits preserve both invocations. Actions artifacts expire after 30 days, so raw receipts, observations and JSON results are copied here for durable review.

An inherited, unchanged RepoSteward workflow also reports a fork workflow failure with zero jobs. It did not execute this test and is not counted as a native result. This contribution does not change its workflow or upstream CI policy.

This internal defect has no claimed UI malfunction. The user's requested real-browser regression check uses the existing repository browser suite, and its actual component captures are a separate unchanged-product check, not a picture of this path mismatch. The evidence branch must never be merged into the product branch. No package API, Runtime/scanner semantics, spec schema or lifecycle is changed.
