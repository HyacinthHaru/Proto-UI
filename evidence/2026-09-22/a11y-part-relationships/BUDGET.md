# Candidate package measurement

The accepted base is `9d9552bbe0bc747e9b7f2f1ff6f6db3414086424`. Candidate measurements actually ran on `fd9fc6b4aa46b2ad18b4ffd685448d36d2ba9ea2`; `868d3adbd22fae98b8e33ea58a9f3353158c506d` changes only the Workspace browser test and preserves every measured package input, lockfile and budget-script byte.

Both runs used Node `22.23.2`, zlib `1.3.1-e00f703`, esbuild `0.25.12`, darwin/arm64, the existing whole-entry bundling cases and gzip level 9. Raw minified byte counts and SHA-256 are in [main](validation/budget-main9d.json) and [candidate](validation/budget-fd9-final.json). Diagnostic consumer profiles are additional observations, not substitutes for the nine gates.

| Entry         | Main gzip | Candidate gzip |  Delta | Existing limit | Candidate |
| ------------- | --------: | -------------: | -----: | -------------: | --------- |
| Runtime       |    63,228 |         65,865 | +2,637 |         64,000 | fail      |
| React Adapter |    82,758 |         85,351 | +2,593 |         83,500 | fail      |
| Vue Adapter   |    82,480 |         85,093 | +2,613 |         83,500 | fail      |
| WC Adapter    |    85,908 |         88,554 | +2,646 |         97,000 | pass      |

The other five entries also pass: lucide icon, lucide root, Core, Base Button and shadcn Button. Main passes all nine. The structured matcher, logical relationship lifecycle, Web ownership/observer reconciliation and Adapter binding integration add to the existing eager Runtime/Adapter closure. Tests, catalog and documentation do not explain that executable growth.

The limits independently accepted for Table in #675 are preserved. This candidate does not change a limit, adopt an unmerged budget, or attribute its own growth to main. An independent maintainer must determine whether to accept an explicitly attributed ceiling adjustment or request a bounded implementation revision before required CI and merge can succeed. No budget or semantic approval is implied by local functional test results.
