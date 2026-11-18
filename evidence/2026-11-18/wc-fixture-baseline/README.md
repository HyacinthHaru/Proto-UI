# Restore WC preview and receipt fixtures

A main-based contribution to restore the original C-group test coverage. This candidate changes two test files. Its tested file bytes match the signed commit `606719fd0a34ade87941e88b177b98d49e2a87f9` on `0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53`.

The view-operation receipt verifier reads local files and imports a Node CLI module. The test previously failed to load under Happy DOM with “The URL must be of scheme file.” The existing Vitest Node environment directive lets all 20 original assertions run.

The Dropdown, Tabs and Dialog fixtures had hand-maintained prototype registration lists. The tests now collect the declared dependencies of each actual demo using the same collector as the Website. This restored Dropdown and Dialog immediately and exposed a Tabs style mismatch. The Website demo has opted into Rhea. The New York test retains the original list height and trigger radius checks, while the Rhea demo checks its own height and radius. Both run the original keyboard focus and selection assertions. The test uses Happy DOM for these cases.

| Same 159-file non-browser selection | Passing tests | Failing tests | File load errors |
| ----------------------------------- | ------------: | ------------: | ---------------: |
| Parent source and test bytes        |          1175 |             8 |                1 |
| Signed candidate test bytes         |          1199 |             5 |                0 |

The parent control temporarily restored the two original fixture blobs on the signed checkout, then restored the candidate files. All production files already matched main. The five shared failures concern the Shadow Split admission and motion fixtures. The focused final run passed 27 tests. These fixture checks run without a browser, and native behavior remains covered by its separate suites.

The JSON lists the actual failures, commands and report hashes, with machine paths removed. The affected catalog test definitions retain their draft status. No production code, deadline, CodeExample content or public profile is changed.
