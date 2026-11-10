# Hosted React staging and image observer follow-up

The [diagnostic fork run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42816658553/job/129831485163) binds `89cc7bb014b6ee69658aaeb2ea103e796acdb18a`, a diagnostic-only child of `0df298c4b48c2e4805ec7ce81b5644c0f4e5aef5`. The original Shadcn React 1000ms assertion failed. The complete renderer trace has no reported data loss. The task and stage times use the renderer's trusted-click mark as zero.

| Stage | Observed relative time |
| --- | --- |
| Header, Contents command and panel attached inert staging | 882.76–883.43ms |
| React render returned to the three materializers | 1379.75–1385.03ms |
| Paint wait began and resumed | 1380.07–1385.35ms to 2024.75–2025.34ms |
| Activation and Contents publication callback | activation 2042.55–2043.52ms, Contents publication returned at 2062.96ms |

A 562.74ms renderer task overlapped the React render phase and sampled `renderDemoReact` and `flushSync`. A 649.84ms task overlapped the paint wait and sampled WC `refreshTree`, `projectEntry` and computed ancestor style reads. The task also contains 204 compiled documentation-image observer FunctionCall spans totaling 107.76ms. The samples attribute work in this diagnostic run. They do not measure a causal speedup or assert the same times on the product head. The diagnostic docs-type job reported TS2554 because its trace-helper declaration still accepts two arguments. The browser job completed capture despite that separate check.

The product image fix is based on an isolated red/green case. An HTML inline-style-only observer batch used to rescan the media inventory. The fix retains active preview geometry updates and inline SVG admission checks. The exact product `7339d17588918417708b558e2b69828d1b233032` includes current main `02c725bbfe77b33331b77a69e7acd9e9009ac3d7`. All seven CodeExamples, the original Contents and Dialog tests, the original one-second assertion and case deadlines remain unchanged.

- Local original Contents passed 24 closes. Shadcn React 668ms, Vue 919ms. Dialog passed 8/8. The image-focused tests passed 29/29 and two selected real Chromium image journeys passed. Full local types passed.
- [Exact product hosted Contents](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42820288316/job/129843950251) failed the original React 1000ms assertion. After three WC closes it still sampled WC at +1417.6ms and React at +1892.9ms, relative to the click-command return. Vue was not reached. The shard later exited 124.
- [Exact product hosted Dialog](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42820288316/job/129843950332) logged original 8/8. All 196 observations and 120 referenced PNG hashes were checked. The enclosing shard later exited 124.

The archive contains selected observation and receipt text. The complete original trace and ZIPs remain in the hosted artifacts identified in the summary. The screenshot is an unmodified post-verdict frame from the diagnostic sample.

AI assistance: Codex.
