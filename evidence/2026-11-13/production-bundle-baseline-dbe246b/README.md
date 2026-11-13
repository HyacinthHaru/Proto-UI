# Exact production bundle baseline for dbe246b

The unchanged production command built all 673 static pages on clean main `35195a6e` and clean candidate `dbe246b`, using the same local Node and pnpm versions. The subsequent Website production bundle gate failed in both commands. All 53 diagnostics match as a multiset with zero added or removed. The common diagnostics retain the adapter and importer boundaries; no allowance or governance change was made.

The full build command exited 1 on both trees. A successful static output step is separate from its failing consumer-wall gate and from native browser acceptance.
