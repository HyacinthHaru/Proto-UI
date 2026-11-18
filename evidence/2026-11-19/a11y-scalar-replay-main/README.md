# Stable A11y scalar replay

Exact source 649b6a3bfe31e32de3458925b3665bb9375b5cc4 on 534caf4a241f7f7ef49b7b073662ad982e938c91. Three tests reproduce redundant writes on unmodified main. The candidate passes 212 focused tests and 34 selected packed browser cases, including Table, Accordion and Field. Header first-frame checks pass at 320 and 390 pixels.

The Chrome 156 source probe follows the same host through caption target replacement, physical target replacement, an author role rewrite and terminal cleanup. In before, after, after and before order, equivalent scalar replays perform 6, 0, 0 and 6 DOM attribute mutations. Each arm still changes the direct label relation and restores the last host-owned attributes on disposal.

The native source probe measures actual DOM mutation records for this replay. The packed checks exercise product routes. Full Matrix readiness is tracked separately.
