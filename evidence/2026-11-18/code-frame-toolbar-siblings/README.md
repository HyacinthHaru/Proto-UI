# Code frame toolbar siblings

The code padding now follows the existing sibling order in Expressive Code frames. A frame keeps 56px of inline-end space for a corner Copy command. A toolbar before the source restores the 12px inset. The renderer leaves Copy construction and its payload intact.

The published candidate uses Chrome for Testing 156.0.8078.79 in a rendered Astro preview. The 390px screenshots show WC with light Shadcn and React with dark Brutalist. The same main-based revision passed 50 focused tests and 21 selected native cases. Those cases include the original Contents, Dialog, CodeExample, Copy and scroll-chain assertions. Header geometry passed at 320px and 390px. All nine authored CodeExamples were present on the checked Shadcn Button route.

Across 703 emitted HTML files there are 324 Expressive Code frames. The corpus has 70 direct toolbars before the source and 254 plain frames. The first local approach added a frame attribute. It missed 54 cached Markdown frames, and Chrome measured 12px of padding on the cached Prototype API page at 390px and 1440px. The sibling approach restored 56px on both widths. It kept the Collapsible fixture's original 56px corner inset and 12px toolbar inset. The archived marker variant was local.

On the 1,268-preview Matrix, the original selector appeared in 54 invalidation rows during 12 matching Selection reads. The candidate trace sampled 14 such reads with zero rows for the removed selector. Both complete traces covered separate startup runs. The original integrated Chinese S4 readiness still timed out after 60 seconds and retained its 150-second case limit. The English case was filtered in this check. These traces establish the selector removal and sampled invalidation counts.

The inventory regression uses the actual browser-suite list. The previous verifier saw both the registration and its separate duration weight. The fixed verifier passed on the actual inventory and rejected a deliberately duplicated list entry.
