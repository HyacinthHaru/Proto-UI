# Responsive gutters and splash fragment clearance

The signed #1477 follow-up measures rendered content without depending on the spelling of Astro expressions or utility tokens. It addresses the two review findings on the previous exact head using the real English reading page, homepage and ordinary splash route at 390 and 900 CSS px.

The reading canvas has outer padding 16 and 18 CSS px with zero added pane padding. Both splash variants have 16 CSS px outer padding. The pane contributes 4 CSS px at 390 and 24 CSS px at 900. In each route the pane stays within its measured canvas content edges.

Both locale no-JavaScript splash fragment controls measure 88 CSS px of effective scroll clearance and 72 CSS px of Header reserve. Their difference is exactly one computed root rem of 16 CSS px. The no-JavaScript title remains 40 CSS px below the static Header. The images are byte-identical to the [previous reviewed native screenshots](https://github.com/HyacinthHaru/Proto-UI/tree/f682d1ce0135be3833b81e0abe322d32879cfecd/evidence/2026-11-17/header-splash-1477-real-route).

All ten native layout cases and 46 scoped unit cases pass on the exact signed head. The follow-up changes the browser test only.
