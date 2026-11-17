# React Base Accordion runtime join and shell render

This local Chrome trace uses the same 1,268-preview Chinese Matrix HTML from `5d4f9113` as the scheduling controls. It retains the original readiness predicate, 60s wait and 150s outer limit. The renderer records native React imports and the first owner render without changing the two-frame wait. This is an instrumented static artifact.

For owner `pp-715ggtjnivc`, prototype loading returns at page time 52.000s, followed by the first runtime join. The three native React imports return around 56.146s and the early caller's runtime promise returns at 56.146s. The owner join returns at 69.126s, 12.979s after that early runtime return. The exact interval inside the owner's join still needs attribution. The saved CDP asset rows carry request, data and finish records separately from JS promise markers.

The first root is created in 0.1ms and synchronous render takes 93.1ms, during which host children increase from zero to one. The two animation-frame wait takes another 4.776s. A second render starts under the same owner after the first render returns. The trace records owner and host child count. Host element identity across those render calls is unverified.

No owner appearance or publication marker is delivered. The original complete-page readiness check times out. At the last separate sparse publication sample, WC Base Accordion is the first incomplete host. Nothing here identifies the first incomplete owner at expiry or reaches Dialog.
