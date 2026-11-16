# S4 resource completion and React import boundary

This separate local diagnostic uses `7780dba23e3fb14e0138ea4d24a1cbb8096c3cbf` plus the attached observation patch. It retains the two original S4 locales, both original startup and test limits, the actual demo matrix and the original journey assertions. The browser was Chrome for Testing 156.0.8078.79 on macOS arm64. Both original cases ended at the 150-second outer limit before the journey began.

The added Resource Timing observer records each tracked asset's browser `responseEnd` and observer callback time on the same page clock as the named import Promise callbacks. The CDP Network event delivery remains on the separate Node clock. The Vite cache import graph is recorded by basename and source hash. Browser response bodies were unavailable for exact byte comparison.

- Chinese observed CDP completion for every name in the three React package graphs. On Node the final tracked CDP completion arrived 107.515 seconds before the observed startup error. The page streamed browser resource completion for the three package entries and the shared helper. The two transitive chunks have no browser Resource Timing delivery receipt.
- English made the requests for those two chunks, with completion absent from the retained CDP events as well as the browser resource stream.
- Both cases showed the runtime and Adapter import callbacks before the named package factories. No final callback for any of those three package imports was observed. The page snapshots after the verdict were rejected because the context had closed. Both runs separately reported 18 owned-decoration errors.

The interval from browser dependency completion to package import settlement remains open. The receipts preserve engine-facing resource, Node transport and local module-graph facts independently.
