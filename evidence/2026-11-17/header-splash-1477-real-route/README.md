# Header and splash geometry on real routes

The test-only #1477 update removes the source-format and utility-class oracles from the earlier contributor patch. The native suite opens the real English and Chinese no-TOC Matrix draft routes with the page-title fragment as its no-JavaScript control. It measures the Header and title boxes and the effective scroll clearance. Both titles are 40 CSS px below the Header. These shots are native no-JavaScript observations. Runtime startup is covered separately.

At 390 px in both languages, the real reading route starts its main pane and prose at the outer canvas content edge. Each measured left coordinate is 16 CSS px and the page has no horizontal overflow.

The whole-suite run before the TOC selector correction reproduced four desktop width failures. Exact upstream main reproduces the same four. The measured right-side Starlight container includes a hidden mobile TOC as well as desktop links. The final test measures desktop links inside the existing desktop TOC owner. Its width threshold stays in force for every desktop link, including any measuring zero. The receipt records the hidden mobile link widths separately.

The final signed current-main candidate passes all nine native layout cases and all 46 scoped units. No product CSS or route sources changed. Exact source, negative observations and geometry are in `route-geometry.json`.
