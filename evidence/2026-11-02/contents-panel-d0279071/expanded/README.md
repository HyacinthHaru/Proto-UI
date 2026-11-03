# Readable Contents evidence for PR #1212

The 30 public UTF-8 members of the fixed evidence ZIP are mapped to `expanded/<original member path>.txt`. Each text copy uses the existing `source-map.json` `public_sha256`; the suffix changes only the filename. The previous archive, 144 PNG members, individually exposed PNGs and original manifest remain available at [ca12ee51](https://github.com/HyacinthHaru/Proto-UI/tree/ca12ee5135267059b941b05ca8706ad4f77d4d49/evidence/2026-11-02/contents-panel-d0279071).

Both supplemental versions recorded `d0279071fd80bd62bd6256fb40e77c3e69f25513`, tree `73e3640521cc5ad06b1116e3d623036fe25634c4`, and an empty tracked-status string in every one of their eight contexts. The probes read HEAD, tree and Git status at invocation and assert clean status. They contain no hard-coded expected-head check. Their sources expose the output-directory argument and browser executable environment interface. The archive contains the original test selection and resulting logs, but no complete standalone launcher argv/environment receipt.

The original Vitest case and its separate failure-only diagnostic each recorded one failure and eight filtered cases. In the latter run, the browser sample at 149.2 ms still placed the tree outside its sidebar home. The next sample, at 248.6 ms, first observed it back there. Both times are measured from the beginning of sampling after the original verdict. They do not measure Escape-to-return latency. The dirty-source block and its later successful supplemental retry are retained separately.

The first and settled screenshot probes each recorded 8/8 supplemental contexts on the historical product head. Expanding the original text adds no new execution, screenshot, merge-tree CI result, deployment or approval. The original immediate-return failure and remaining hosted checks keep their own outcomes.

## Direct readable entry points

- [Settled probe](probe.cjs.txt), [first probe](probe-v1.cjs.txt).
- [First summary](probe/summary.json.txt), [settled summary](settled/summary.json.txt). Individual context JSONs are adjacent to each summary.
- [Original failure](original.log.txt), [post-verdict failure](post-verdict.log.txt), [tree trace](post-verdict/post-verdict-tree-trace.json.txt).
- [Original test source](original-test.before.ts.txt), [failure-only diagnostic test](original-test.observed.ts.txt).
- [Dirty-source guard output](settled.log.txt), [subsequent supplemental retry](settled-retry.log.txt).

`source-index.json` maps all 30 original members to their exact existing public SHA-256 and the filename-suffixed text. Its expanded paths are relative to the historical evidence directory, not this subdirectory. Four members were already public derivatives with distinct historical raw hashes; these copies retain the existing public bytes, not a freshly sanitized or private raw version. The old ZIP, source map, root manifest, root README and PNG files remain pinned to the original commit. `SHA256SUMS.json` binds these new expanded files and explanatory metadata.

This additive format handoff addresses the maintainer's reader-side binary/UTF-8 tooling limit. It does not settle the immediate sidebar-handback contract, replace the old failure with the supplemental successes, certify a new main composition, or grant approval. AI assistance: Codex, human-assisted/current-user.
