# Demo ref selector matching

A shared data-demo-ref condition now gates the same two owner markers. Initial collection retains the host query, document query, separately matched host, deduplication and last-wins publication order.

The pinned Chrome S4 same-page diagnostic sampled four selector forms with rotating order. At 1,536 delivered initial calls each form had 48 measured queries and 175 total returned candidates. There were zero node identity or order mismatches. The prior grouped selector took 27.5ms, the rightmost-ref group 30.9ms, the common-ref selector 17.1ms, and the split lookup 23.4ms. These are in-page query samples on one built Chinese route. The original selector results still drove publication in that diagnostic.

The exact source native probe used four fresh browser contexts, 400 owners, 16,000 noise nodes and 27 externally placed Portal candidates. It also verified detached hosts, data and class ownership, duplicate identity and order, ownership mutations before a read and exclusion of closed Shadow DOM. The measured fixture series was 94.4 / 18.2 / 18.1 / 95.2ms in parent/candidate/candidate/parent order. Whole-page readiness time was outside that measurement.

The integrated 8f0025d1 product has 295 focused passes over 13 unchanged test files. The independent 315c0a0d product used unchanged package outputs from the previous exact 47-package main-based build. Its focused group reproduced the previous main-based outcomes of 294 passes, the raw-props callback identity assertion failure, and the three Input Shell forbidden terminal calls. Both candidates build 685 Website pages, pass workspace types, and pass 15 selected original browser cases with nine filtered. Both Header geometry widths pass and the checked article retains nine of nine CodeExample blocks. The screenshot is from the exact main-based 315c0a0d product.

The integrated Chinese S4 result remains a 60-second readiness timeout using all 1,268 preview roots and the original 150-second case limit. The English case was filtered. The last delivered startup row is a sampled prefix. Final post-verdict collection expired.
