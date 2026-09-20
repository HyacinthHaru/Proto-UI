# Coverage path verification after syncing main

The one-line Windows path correction remains the only product diff at `b6e260ed3c8e42668b68b3e76a6ea04743178382`, after a signed merge of accepted `main@c473eae3fe6b66354f5e689fcc1d01241946ed7f`. This packet supplements the original `0fefe743` evidence; it does not relabel the older execution as a test of the new head.

**Request paraphrase:** normalize the existing shipped-rule coverage gate’s repository-relative filename across Windows separators while preserving its assertions and scanner behavior.

On native Windows, `path.relative` produces a backslash filename. The assertion fixture uses `/`. The correction applies `.split(path.sep).join('/')` to the recorded relative label; the absolute source-file read and hook/state checks remain unchanged. [Observations](observations.json) retain the actual native label, canonical label and scanner results. [Source comparison](test-source-comparison.json) verifies that the uncorrected test is identical at the old and new main baselines, and the corrected test is identical at `0fefe743` and this head.

[Native Windows run 35520174449](https://github.com/HyacinthHaru/Proto-UI/actions/runs/35520174449) checked out the exact new source head and passed all 75 assertions. [Receipt](receipt.json), [test results](result.json) and [source binding](source-binding.json) are included. The native CRLF source hash equals the committed LF blob after the platform’s line-ending transformation.

[Local validation](validation.json) passed the 158 focused tests, type checks with zero diagnostics, and the complete repository test command. Vitest’s first stage passed 2,551 tests with 34 existing TODOs; its dedicated browser stage passed 136 tests across 26 files. The first stage also executes the new real-Chromium Scroll end-follow cases, so it is not described as entirely non-browser.

Four original captures from the current real-Chromium theme conformance suite were opened and visually inspected: [WC checked/dark](visual-regression/wc-checked-dark.png), [React/light](visual-regression/react-light.png), [Vue portal](visual-regression/vue-portal.png), and [Vue 2/dark](visual-regression/vue2-dark.png). The [inspection record](visual-regression/inspection.json) binds their hashes and limits. These are unchanged-product visual regression samples; the internal filename defect is explained by the executed source/path trace above.

The integration gate remains open: [CI 35520133770](https://github.com/Proto-UI/Proto-UI/actions/runs/35520133770) reports the same canonical Adapter budget failure as current main. Runtime/Adapter output hashes are identical, and the separate maintainer transaction [#673](https://github.com/Proto-UI/Proto-UI/pull/673) still needs independent review and merge. This packet does not claim approval or merge readiness.
