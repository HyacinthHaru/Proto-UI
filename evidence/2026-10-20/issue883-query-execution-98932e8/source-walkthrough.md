# Source and variable walkthrough

The exact source is the [98932 Homepage test](https://github.com/Proto-UI/Proto-UI/blob/98932e8132ae4f3e1dacb9bf5967ebac481953ab/apps/www/src/content/docs/zh-cn/homepage-dogfood.browser.test.ts) and its [query helper](https://github.com/Proto-UI/Proto-UI/blob/98932e8132ae4f3e1dacb9bf5967ebac481953ab/apps/www/src/content/docs/zh-cn/family-query-observer.ts). The saved Git blobs and raw SHA256 are included; this walkthrough is explanatory, not an execution transcript.

1. The existing family-control `aria-controls` read precedes installation. The helper opens a public CDP session, enables Runtime context events, reads the actual main frame, and selects the one observed utility context matching the pinned Playwright naming convention. It does not create a new world or invent a context ID.
2. Installation captures the original utility-realm `Element.prototype.getAttribute` descriptor. Only the captured Homepage root's `data-family` calls are logged. The native function is forwarded once with the original receiver/arguments, preserving its return or throw.
3. A per-preparation owner token binds the controller. A second busy observer cannot collect or remove another observer. Collection can still recover its own successful installation when the acknowledgment was lost. Descriptor restoration requires the installed wrapper's identity.
4. The original locator expression supplies the original query Promise. The timed matcher and its deadline are unchanged. The Node ledger retains actual Promise references; displayed rows have a cap, but the retained references do not. Node return times and utility getter times are different observations.
5. The original verdict and rejection snapshot are frozen first. This commit then awaits registered original Promises before utility collection/restoration. In the official failure there was one pending reference and it actually settled after the verdict; all three references were drained. The rejected original matcher remains the result.
6. An indefinitely unsettled Promise is the still-open robustness gap in this commit. There is no separate bounded-drain implementation in these source blobs or this packet. Later work must be assessed under its own source and execution binding.

| Recorded field | What it supports | What it does not establish |
| --- | --- | --- |
| Native writer before/after | The intercepted dataset write call | Whole transaction completion |
| MO delivery | When the callback was delivered | Exact mutation instant |
| Utility `beforeMs` / `afterMs` | Wrapped getter execution ticks | A unique protocol request identity or zero duration |
| Node `returnedMs` | Promise settlement observation in Node | Getter execution time by itself |
| `pendingAtVerdict` | Frozen original Promise bookkeeping | A revised success criterion |
| Owner/root/origin/drop/error/restore fields | Conditions for usable capture | Zero instrumentation effect or full platform acceptance |

The five writer/MO clock brackets remain one calculation. The seven-bracket report is a separate same-run calculation. Both rely on the stated common-document and approximately stable relative clock assumptions. The record does not isolate the physical cause of the pre-getter interval or replace the older2189 evidence.

The original mobile predicates are dynamically bound to lines776 and886 in the saved98932 source. This report does not infer those lines from a later mutable worktree. The later Header/Select fixes and bounded-drain candidate are excluded from all current-source and pass claims in this packet.
