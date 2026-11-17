# Same-owner React runtime outer join boundary

The Chinese Matrix uses the same static HTML from `5d4f9113`, 1,268 previews, original 60s readiness predicate and 150s outer limit. The asset overlay records the existing owner's wrapper continuation, the internal React dependency join and native host identity.

For React Base Accordion `pp-715ggtjnivc`, wrapper readiness is observed at 58.760s. This owner's `loadReact()` has all three dependencies and returns at 61.800s. Its outer join returns at 75.012s, 13.212s later. Both records bind to host 1, which is still the current live host in this trace. The Node observer receives the outer-join marker in context close after readiness timeout. The renderer begins its first synchronous render while closing. No render completion, second host, or publication is observed in this run.

Twenty slow CSSOM or geometry getter samples end in that interval, with 547.4ms summed sampled call time. These thresholded samples indicate concurrent renderer work and do not account for the full interval. The exact outer Promise join and scheduler reason remains unresolved. At the latest sparse publication sample WC Base Accordion is still the first incomplete host. The full Matrix gate fails before Dialog.
