# Selection style runtime budget transaction

This non-normative record retains the failure and the bounded numeric decision for PR #747. The existing whole-entry measurement policy from #654 remains unchanged.

## Measured change and decision

The current author-syntax proposal adds a static `selection:` target, its payload validation and semantic-merge grouping inside the existing Core closure. It adds no new eager Runtime module. The current main Runtime entry measures 66,620 gzip bytes; the PR measures 66,880, a 260-byte increase. The previous 66,800 ceiling had only 180 bytes of headroom, so the PR correctly failed by 80 bytes.

This transaction changes only the Runtime root ceiling from **66,800 to 67,100** (+300), leaving **220 bytes of measured headroom** for this candidate. The added grammar is retained without rewriting the reviewed lexer to meet an incidental combined ceiling. Every other whole-entry threshold, measurement setting, external-dependency rule and diagnostic consumer profile is unchanged. This is an explicit capability-cost decision, not a repaired functional defect or a removed check. The prototype and style-contract lifecycle remain draft; no native selection rendering guarantee is added.

## Reproducible evidence

Both local measurements ran the unchanged `node scripts/analysis/package-budgets.mjs --json` with Node v24.19.0, zlib 1.3.2.1-motley-3246f1b, esbuild 0.25.12, Linux x64. The script bundles the complete `packages/runtime/src/index.ts` entry as minified, tree-shaken browser ESM targeting es2020 and uses gzip level 9.

| Source | Minified bytes | Gzip bytes | Minified SHA-256 |
| --- | --: | --: | --- |
| main36 | 263424 | 66620 | `ffaed50da1f7cc53a7f3e341eeb9d89e12a5f84b2615a871064f7fb9e9600ffe` |
| PR #747 at 50d822ec | 264131 | 66880 | `1d892078f17ed84c547a1c0e974a54a3bec16a9fbb9c0e8d2fa6bc9c6e96e446` |

Exact source revisions are main `36b43ac4a81b7ac8f17586f32bf6fcd468594c49` and PR `50d822ecbb4fc43c9f555925825d7961d0a74acf`. The PR's [failing Linux CI measurement](https://github.com/Proto-UI/Proto-UI/actions/runs/37144745799/job/111266292112) used Node v24.21.0, zlib 1.3.2.1-motley-8002e91 and esbuild 0.25.12. It reported the identical 264,131-byte artifact hash and 66,880 gzip bytes. The old 66,800 failure remains part of the evidence; the two toolchain versions are not presented as identical.

The other measured package cases pass their existing limits. In particular React is 87,425/87,500 and Vue is 87,147/87,200 gzip bytes; their limited remaining headroom is retained rather than silently reset. Future growth requires its own attributable review.

The separate browser-suite registration repair addresses the main test runner's omission of the already-authored Shadcn Input browser test. It does not justify or alter this byte ceiling. A fresh exact-head CI run must confirm both the unchanged bundle measurement and the newly included browser suite before merge.

Co-author by OpenAI Dots
