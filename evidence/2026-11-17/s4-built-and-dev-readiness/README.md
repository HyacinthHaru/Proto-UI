# S4 on built Astro assets and the Vite developer server

Both comparisons used the original Chinese and English S4 test cases at signed local composition `e41c8673da766b9e6d08d7dd00091d2c5e80de6c`. The original 1,268-preview readiness assertion and 60-second readiness and 150-second case limits stayed intact. The browser was pinned to Chrome for Testing 156.0.8078.79. Both runs selected one worker and did not overlap.

The actual Astro site build produced 685 pages. For this private loopback preview only, the two internal Matrix MDX frontmatter flags were switched from draft to published inside the isolated worktree. Both flags were restored after execution. The previewed HTML matched its local build SHA-256 for both routes, and the compiled HTML contained 1,268 distinct previewer identifiers per locale.

| Asset mode | Locale | Last delivered first-missing observation | Original verdict |
| --- | --- | --- | --- |
| Built Astro | zh-cn | Empty React Base Accordion at page +16.558 s | 150-second outer case timeout |
| Built Astro | en | Empty React Base Accordion at page +13.275 s | 150-second outer case timeout |
| Vite dev | zh-cn | Empty WC Base Calendar at page +70.127 s | 150-second outer case timeout |
| Vite dev | en | Empty WC Base Calendar at page +66.558 s | 60-second readiness assertion timeout |

All four cases ended during startup. Page and console error counters were zero. The later outcome of an individual preview cannot be inferred from the preceding last-delivered sample.

Read-only OS process observations for the two dev renderers measured approximately 1.11 and 1.21 cores of cumulative CPU per elapsed second in the retained intervals. Peak RSS was about 3.42 GiB and 3.90 GiB. One native stack sample captured 161 framesets from the renderer main thread over two requested seconds. The stripped binary and generated-code addresses do not identify the JavaScript function responsible. The raw stack file remains local.
