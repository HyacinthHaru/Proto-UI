# S4 Vue 2 startup import observation

The original localized S4 journey ran on Chrome 156.0.8078.79 with one worker and all 1,268 previews. The three observation edits were applied to composition `1217fdb87ba08812d85b8461a02a6478eed97944` and are bound by SHA-256. The 60-second readiness assertion and 150-second outer test limit are unchanged. The English case was unselected.

- Vue 2 runtime wrapper fulfilled at page +10.373 s. The Adapter fulfilled at +21.663 s, immediately followed by the package factory. The original order waited 11.290 s after the wrapper was available.
- The exact first pending Vue 2 Base Accordion entered rendering with an empty host at +40.115 s. Its wrappers joined at +40.738 s, and the original readiness predicate saw the same owner and empty host at +42.289 s. The package fulfillment and first-child observations were absent.
- Chrome recorded a completion timestamp 3.614 ms after requesting the optimized Vue 2 asset. Its completion event reached Node roughly 117.74 s after that timestamp. The response event carries the later timestamp. The shared optimized chunk had completed earlier. These are distinct CDP and delivery observations. They leave the renderer's response processing and module evaluation unresolved.
- The original test exited at the 150-second outer limit before the interaction. Both page-error and console-error counters were zero. The post-verdict observation rejected because the original context had already closed.

The emitted dependency graph is the local Vite optimizer graph read from its generated files. The receipt binds browser network events by asset name and does not assert equality to bytes retrieved inside Chrome.
