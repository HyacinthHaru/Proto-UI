# Hosted Brutalist dispatch and compact Header measurements

## Same-failure hosted evidence

[Owned fork run 43169302472](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43169302472) kept the original 12-suite selection in each of shards 1/8 and 3/8, the Ubuntu runner, locked dependencies, verified CJK cache, shared Astro server and runner deadlines. The trace-only ref `09ea34042e625a2e9ba171c59fe505dec2cd3bc0` carries a workflow for those two original shards and three test/diagnostic files over product `26418fe1`. Shard 1 enabled the trace around the original Brutalist click and poll with no CPU throttling. Shard 3 ran with trace disabled. No Search native lane was selected.

The original 1000ms family check rejected at +1001.363ms with its fourth `Runtime.callFunctionOn` outstanding. The matching Chrome CDP id is 14634. Trace, page and Node clocks were reconciled using the trusted click marker and same-root clock calibration.

| Stage                              | Time after original Node poll started |
| ---------------------------------- | ------------------------------------: |
| Original Node query started        |                            +368.655ms |
| Node pipe writes returned          |             +370.394ms and +370.419ms |
| Chrome browser command handler     |                    +369.561–371.269ms |
| Chrome forwarded to renderer       |                    +369.570–371.278ms |
| Original rejection                 |                           +1001.363ms |
| Actual family write                |                  +1256.666–1258.374ms |
| Renderer began protocol dispatch   |                  +2025.371–2027.079ms |
| Matching getter returned Brutalist |                  +2026.466–2028.174ms |
| Node original query returned       |                           +2029.979ms |

Chrome took 0.009ms from command handler to forwarding. Its exact trace clock measures 1655.801ms from forwarding to renderer dispatch, of which 1655.768ms overlaps renderer tasks. Dispatch took 1.503ms. The selector reached the getter in 0.700ms and getter entry/return share the same page-clock tick. The cross-clock receipt interval overlaps the Node pipe write return. The 14,138,085-byte trace is complete with no reported data loss. Context, stream and tracing session were closed.

| Renderer queue interval | Duration | Style-tree updates | Layout | Selected sampled work |
| --- | --: | --: | --: | --- |
| Forwarding to family write | 887.096ms | 222.231ms | 25.739ms | Canonical motion palette property reads 93.728ms; Typography `preserveSelection` leaf 99.908ms |
| Family write to dispatch | 768.705ms | 151.910ms | 24.845ms | Header `positionPanel` geometry reads 119.685ms; canonical motion palette property reads 47.883ms |

The longest clipped renderer tasks occupy 650.303ms before and 768.454ms after the family write. CPU sample weights can overlap the traced style/layout intervals. They describe the code seen in this failure. The geometry samples identify `positionPanel` as caller and do not distinguish its individual rect reads. [Dispatch receipt](dispatch.json) · [Renderer task and stack analysis](performance.json) · [Hosted evidence after the original verdict](hosted-after-original-verdict.png)

The Contents/mobile shell cases passed all eight switches and 24 ordered handbacks. Dialog passed 8/8 with 196 observations and 120 images. Both containing shard jobs hit the existing 900s limit and returned exit 124. [Shard 1 and trace](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43169302472/job/131018453079) · [Shard 3](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43169302472/job/131018452800) · [Exact artifacts and selection](hosted-run.json)

## C-group compact Header correction

Product `f58c7af3350cee5c6fe456e0dc7b92e790a8c288` keeps the compact panel at the physical viewport left edge. Its placement does not use the panel width or the root's direction. The correction avoids reading both in compact layout, including the width read after setting the panel dimensions. Desktop LTR/RTL anchor alignment continues to measure the panel. The exact diff is limited to the Header source and its regression file.

The original 390px and 430px geometry cases retained their prior assertions. With the added read-count check, both failed before the change with three panel width reads and three root style reads each, and both passed with zero after. The clean exact candidate passed 118 focused checks, two compact 200%/RTL browser cases, two Contents/mobile cases with all eight switches and 24 ordered handbacks, and all eight Dialog browser cases with 196 observations and 120 captures. Workspace and Astro types passed with 0 errors, 0 warnings and 30 hints across 1,215 Astro files.

The extra exact Brutalist reconnect passed the original family commit check at +652.534ms. It later failed the original narrow WC focus-ring shadow assertion, with native focus-visible true, 2px width and 2px offset. The combined command therefore exited 1 with 10 passed and one failed. The hosted trace uses the pre-fix product tree. The new compact geometry change establishes that two unneeded reads were removed, with no hosted latency result yet on the repaired product.

[Exact regression receipt](fix-validation.json) · [Contents](shadcn-react-public-popover-open.png) · [Dialog](brutalist-react-long-font200.png) · [WC focus-ring capture](brutalist-wc-runtime-narrow-focus-ring.png)

#1435 remains at `3139922b` with five open inline threads. The [prepared #848 props.ts experiment](https://github.com/HyacinthHaru/Proto-UI/blob/a24a8bb367ca9dc907b281c4b4b2be7156c54715/evidence/2026-11-12/brutalist-family-dispatch-26418fe1/search-848-props-ab-plan.md) is unchanged and was not executed.
