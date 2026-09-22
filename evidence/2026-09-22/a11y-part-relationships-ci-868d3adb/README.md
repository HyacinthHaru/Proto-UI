# Trusted CI at 868d3adb

[Repository CI run 35691550964](https://github.com/Proto-UI/Proto-UI/actions/runs/35691550964) is terminal: **8 successful jobs and 1 failed job**. The failure occurs in the package-budget step; package building, manifest checks and tests passed. The overall run failed and does not establish merge acceptance.

The actual checkout is `daa2c683a76d39758214f39f8bb67d6a136de924`, merging candidate `868d3adbd22fae98b8e33ea58a9f3353158c506d` into base `9d9552bbe0bc747e9b7f2f1ff6f6db3414086424`. Its tree `1cd9e6e5201a77366bef0daf0f3b4e2634e7dc89` equals the candidate product tree exactly.

- Test job 106629432916 passed the workflow's actual default command and environment: main stage 492 files / 2,647 tests passed, with 3 existing skipped files and 34 TODO; independent serial browser phase 27 files / 137 tests passed. Real Chromium Scroll executes in the main stage. The local worker limits of max 2 / min 1 were not applied in this CI job.
- Package job 106629473832 built 44/44 public packages and checked 44 manifests. All 9 budget entries' gzip bytes, minified bytes and SHA-256 equal the earlier local fd9 measurement; fd9→868 changed only the Workspace browser fixture.
- Runtime 65,865/64,000, React 85,351/83,500 and Vue 85,093/83,500 fail. The other 6 entries pass. Actual measurement scripts use Node 22.23.2 / zlib 1.3.1-e00f703 / esbuild 0.25.12 on linux/x64. The checkout/setup action-runtime deprecation warning does not change that script environment.
- DCO and Poppy build 35691550932 pass. The Vercel status is separately an external fork-team authorization failure; no settings or permissions were changed.

The JSON receipt binds all 9 entries and the full job list. Logs are verbatim GitHub CLI/job API output compressed with fixed gzip timestamps; their decompressed SHA-256 is recorded in the receipt. Credential values remain masked as supplied by GitHub. `manifest.json` hashes published files and excludes itself.

This supplement adds machine evidence to the [original 191-file packet](https://github.com/HyacinthHaru/Proto-UI/tree/92d60ba32ae39579278fcd6127327a7c8fe1444a/evidence/2026-09-22/a11y-part-relationships), whose files remain unchanged. Its native feature executions remain fd9 runs reused through documented source equality. No new feature browser run occurred at 868. Independent budget treatment, maintainer acceptance, a green final required CI and actual merge remain pending.
