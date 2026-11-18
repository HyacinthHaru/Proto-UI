# Live Anatomy order reads

Exact source 34ea3c64c713d367118d077383c1df3e226e4b6f on 534caf4a241f7f7ef49b7b073662ad982e938c91. The same Runtime fixtures on main read the shared logical ancestor 24 times per unchanged notification. They also advance a later subscriber's version twice after a host observer attaches and moves that subscriber. This change shares ancestry by getter within one synchronous notification and clears reads at observer rebinding and author dispatch.

The separately bound combined Chrome 156 source probe records 24, 1, 1 and 24 ancestor reads in before, after, after and before order. Each arm delivers the real DOM reorder to all twelve subscribers. Removing only the observer boundary invalidation in the combined implementation reproduces the duplicate-version failure.

The standalone candidate passes 487 focused tests and 34 selected packed browser cases. Header first-frame checks pass at 320 and 390 pixels. The original combined S4 still reaches the 60-second readiness limit in both locales with 1,268 previews each. The two English profile windows are independent and do not show a whole-page timing gain.
