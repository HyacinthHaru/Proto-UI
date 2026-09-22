# fd9 native evidence: unchanged tracked inputs at 868

The actual native executions remain bound to `fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2`. On 2026-09-22 at 05:14 UTC, a bounded read-only comparison checked their recorded tracked bundle inputs against signed commit `868d3adbd22fae98b8e33ea58a9f3353158c506d`, tree `1cd9e6e5201a77366bef0daf0f3b4e2634e7dc89`.

All **1,731 recorded tracked-input occurrences, representing 314 distinct source files, have identical Git blobs** at the actual execution head and comparison head. The exact committed delta is only `apps/workspace/test/lifecycle.browser.test.ts`, which is not an input to these bundles.

| Preserved actual fd9 run      | Tracked bundle inputs compared | Differences |
| ----------------------------- | -----------------------------: | ----------: |
| `final-fd9-wc`                |                            287 |           0 |
| `final-fd9-react`             |                            299 |           0 |
| `final-fd9-vue`               |                            299 |           0 |
| `final-fd9-vue2`              |                            299 |           0 |
| `final-fd9-generic-wc`        |                            280 |           0 |
| `ownership-native-fd9fc6b4-1` |                            267 |           0 |

[final-868-input-equivalence.json](final-868-input-equivalence.json) records every comparison, actual-run provenance SHA, original harness hashes, both commit identities, and explicit exclusions. Original results and provenance were not rewritten. No browser, build, or test was run for this comparison. External dependencies, environment, and the changed Workspace fixture were not revalidated here. The fd9 observations may be reused as unchanged-input evidence for 868; this is not a claim that those browser processes ran at 868 or that root's complete validation has finished.

The three temporary ownership baseline worktrees were then cleaned up through ordinary Git operations. Before any mutation, all three were confirmed at their exact expected detached HEADs, with clean tracked state and no ignored/unexpected untracked files. Each contained only the three recorded dependency symlinks. The nine links were rechecked by type, target, device and inode, then unlinked without following their targets. A full clean Git status was checked before each ordinary `git worktree remove` command. No force option was used.

The local-only `ownership-baseline-cleanup-receipt.json` records exact paths, heads, symlink targets, commands, exit codes, timestamps, registration state before/after, and file protection checks. It is intentionally not published because it inventories unrelated local worktree registrations; it is not a contract-conformance artifact. Exactly those three worktree registrations were removed, with no registrations added. The real dependency directories still exist at the same device/inode. All **1,690 pre-existing files outside those worktrees** retained their SHA-256 values. Evidence bundles, source/metafile hashes, historical red results, screenshots, AX, and archived harnesses remain available; only the disposable detached source checkouts and their own temporary symlinks were removed. Their Git objects remain in the shared repository for reproduction.
