# #549 native browser refresh at 17a2cff9

This packet contains **new execution evidence** at HEAD `17a2cff98080eb57f9070a6f45d89b58d3a72c3f`, tree `a46d21801fc0e32b1a3f807f9c567a44e1b08d63`, recorded **2026-09-29 15:10:41–15:11:21 UTC**. All **324/324 native-probe checks passed** with no fixture, page, console or source-binding mismatch. The native run is reported at its actual time; separate local validation, canonical CI and scoped independent inspection are included below. Independent maintainer approval and actual merge remain pending.

[packet.json](packet.json) is the root wrapper. [receipts/](receipts/README.md) describes the separately completed local/CI/independent receipts in `validation-records.tar.gz`; these do not constitute GitHub approval.

## Results and readable visuals

| Actual probe | Original full scope | Checks | PNG / AX captures reviewed |
| --- | --- | --: | --: |
| WC Tabs | retained control, lazy A→B→A, exact keys, missing, duplicate | 21/21 | 11 / 11 |
| React Tabs | same five scenarios | 21/21 | 11 / 11 |
| Vue 3 Tabs | same five scenarios | 21/21 | 11 / 11 |
| Vue 2 Tabs | same five scenarios | 21/21 | 11 / 11 |
| Generic actual WC family | both endpoint orders, source/target L1, live key/domain, authored ID/collision and terminal | 22/22 | 13 / 13 |
| Ownership | all 18 original cases | 218/218 | internal fixture / 75 |

All **57 PNGs were individually viewed**; all **132 AX captures** were reconciled with their DOM observations, with zero mismatches. The ownership count is 141 contract observations plus 77 fixture controls. See the [full image gallery](GALLERY.md), including the actual [React space-key selection](runs/react/collision-after-B.png) and [generic source-detach view](runs/generic-wc/hide-source.png).

The records contain **36 trusted browser clicks** (24 Tabs and 12 generic host-control clicks) plus **six WC semantic CustomEvent clicks**, counted separately. Generic buttons are app-authored host controls invoking public props or declared host operations. Ownership uses actual Web projection, Runtime State replay and WC capability-provider code under explicit host stimuli; it does not claim product-button, OS-input or full production Adapter journeys for its K checks.

Environment: **Node 22.23.2, zlib 1.3.1-e00f703, esbuild 0.25.12, Playwright 1.58.2, Chrome 153.0.8010.53, macOS arm64**; React/React DOM **19.2.6**, Vue **3.5.31**, Vue 2 **2.6.14**. These are actual source-bundle/framework runs, not installed-tarball evidence.

## Actual D/E/K observations

The new traces record controls withdrawal before explicit L1 removal, and reciprocal identity writes before the applicable reveal barrier:

| Tabs Adapter | Controls removal → L1 boundary | Restored ID/labelledBy/controls → reveal |
| --- | --- | --- |
| WC | `seq65#34` → detached `#37` | `seq118#60/61/62` → detached removal `#120` |
| React | `seq70#23` → physical removal `seq80#0` | `seq121#141/142/143` → pending removal `#213` |
| Vue 3 | `seq66#23` → physical removal `seq71#0` | `seq122#2/3/4` → pending removal `#79` |
| Vue 2 | `seq69#23` → physical removal `seq73#1` | `seq118#18/19/20` → pending removal `seq120#0` |

Indices are zero-based. Generic target/source L1 withdrawal precedes detached markers in `seq58`/`seq75`; opposite initial endpoint orders form their complete pairs at mounting `seq20`/`seq44` before commit starts `seq22`/`seq46`. Rematerialized pairs are present while still detached at mounting `seq66`/`seq83`. The raw records include synchronous phase/provider observations and ordered mutation batches; a final successful tick alone is not the evidence, and a hidden retained panel is not equated with L1 detach.

Ownership verifies pending ID reconciliation before detach/replacement, observer-first controls, genuinely detached authored-ID conflicts, actual State-before-MO replay, and same-epoch physical source/target replacement through the existing WC surface setter. **K remains internal WC host-contract evidence**, not a claim that every production framework replacement route was driven. Complete resource-count and exception/retry obligations retain their owning tests; these probes do not replace the seven T cases or six required paths.

## Archives and reproduction

- [native-records.tar.gz](native-records.tar.gz): **332 raw text records**: results, AX, serialized ownership DOM, other DOM fact snapshots, traces, metafiles, provenance, execution receipt, all 6,807 tracked source bindings, full report and analysis. Extract beside this README to align them with the direct `runs/` PNG paths.
- [execution-code.tar.gz](execution-code.tar.gz): **nine byte-identical executed code/config files**: the seven recovered original harness files and actual outer wrapper/config. The archive preserves their relative layout.
- [raw-public-sha-map.json](raw-public-sha-map.json): every original/public file and archive member SHA, byte identity, explicit path-redaction counts and excluded compiled-artifact hashes.
- [manifest.json](manifest.json): hashes every distributed file except itself.

```sh
tar -xzf execution-code.tar.gz
export SOURCE_ROOT=/absolute/path/to/clean-17a2cff9-checkout
export OUTPUT_ROOT=/absolute/path/to/fresh-output-outside-checkout
# Use Node 22 and the repository's frozen pnpm 10.32.1 dependencies.
# Set CHROME_PATH if the recorded standard macOS fallback is not applicable.
node execution-code/runner-17a2cff9/run-probes.mjs --prepare
node execution-code/runner-17a2cff9/run-probes.mjs --run
```

Use a **fresh** output directory; published records are historical inputs, not a preparation directory to overwrite or reuse. The wrapper enforces the pinned head/tree and original harness hashes, keeps full default scenarios, records actual new times and input graphs, and stops on a failure. The executed wrapper SHA is `ad74d2abefc904c6d68dc2e6c8002f2007b44a09e834887cf63116bfa71cbbb6`. No probe predicate, input order or time parameter was changed. The code archive retains standard executable literals, including the optional macOS Chrome fallback, because those are code rather than user-specific paths.

The six actual metafiles contain 315 distinct tracked inputs. Every probe newly includes `packages/adapters/base/src/platform/focus-order.ts`; seven or nine previous inputs changed. This packet records that new graph rather than asserting equivalence with fd9. [The immutable historical baseline/previous packet](https://github.com/HyacinthHaru/Proto-UI/blob/4f470d21e195283da3e56c3cc3a8cc7ba6cd3cb3/evidence/2026-09-22/a11y-part-relationships/README.md) retains b0ed0f55 Tabs failures and 820/83/349 ownership failures at their original dates and heads. Their pictures and results are not relabeled as this execution.

Only known machine paths/PATH were tokenized in public text copies. Captured states, source hashes, commit identities, timestamps, counts and verdicts remain unchanged. Relative machine-specific harness input IDs are tokenized consistently in provenance/metafiles; the SHA map records each transformation. Hash fields inside a raw record still identify its original local artifact; use the SHA map/manifest for the published copy's hash.

Compiled `fixture.js`, source maps, third-party dependency caches, `node_modules` trees and source worktrees are excluded. Serialized DOM may reference omitted bundles; rebuild with the exact source/code to execute it. The original running-evidence directory and code were not modified while preparing this packet. Packaging did not rerun the native probes or modify their captured records. Publication is an additive evidence-branch operation, separate from the product branch.

## Archive reference note

The archived raw report retains its original local-only `../browser-refresh-preparation/runner-17a2cff9/` adaptation-diff/receipt locator. That local audit directory is not distributed in this packet. The public, exact executed wrapper/config and seven unchanged harness files are in [execution-code.tar.gz](execution-code.tar.gz), under `execution-code/runner-17a2cff9/` and `execution-code/recovered-harness/`. The archived raw report is preserved rather than rewritten to conceal this distinction.

## Separate local and canonical validation

See [the validation supplement](receipts/README.md) and [source-bound receipts and raw logs](validation-records.tar.gz). The complete local retry and all 11 canonical repository jobs passed at `17a2cff9`. The first local full-run afterAll timeout and initial Spec timeouts are retained, with their controls and limitations. These checks do not constitute independent maintainer approval or actual merge.
