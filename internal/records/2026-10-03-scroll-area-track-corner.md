# Scroll Area track intersection

This is an engineering record, not a new portable guarantee. The styled entities remain draft.

## Requested presentation refinement

The maintainer reported that horizontal and vertical Scroll Area tracks overlap at their lower-right intersection and requested dedicated treatment. At baseline `42aaca0`, both Brutalist and Shadcn explicitly project full-length absolute tracks. Their draft presentation criteria also require those full-length tokens; this is a requested refinement of those criteria, not a claim that the old implementation violated an already cataloged corner guarantee.

## Bounded implementation

- Retain Root, Viewport, Scrollbar and Thumb. Do not add a Corner identity, focus target, Event control, scroll state, or author-facing geometry API.
- The existing Web composed host measures the outer cross-axis thickness of the other rendered track and projects a host-local `--proto-ui-scroll-track-end-inset` CSS sink onto each control. Styled tracks subtract it from their long dimension before the existing Thumb geometry and drag travel are measured.
- Both tracks stop before the lower-right intersection. That region exposes the existing Viewport surface, contains neither track nor Thumb, and is not a new interaction target.
- A missing or `display:none` opposite track contributes zero. No-overflow behavior is unchanged: authored track surfaces remain, while their Thumbs hide. Empty Thumbs therefore do not independently release the corner.
- Insets are idempotent and restored with their original inline value and priority on replacement, system projection and disposal. Measurement remains within the current family attachment, without global DOM lookup or Context geometry.
- Physical right/bottom placement is unchanged. Horizontal RTL normalization remains deferred; neither the inset nor these tests claim to implement it. Non-Web hosts retain their existing projection and may ignore this CSS sink.

## Evidence and limits

The new host-unit suite failed against the unmodified host in three cases: absent expected `12px` reservation and an authored `3px` value remaining where the single-track projection expects `0px`. After the repair, the focused Scroll module and three Prototype-family suites passed 147 tests. The fixture deliberately injects track extents; it does not prove browser layout or hit testing.

The CSS renderer test asserts that both dimensions lower into valid `calc(100% - var(...))` syntax. Generated preset closures are regenerated from source, not hand-edited.

`scroll-area-corner.browser.test.ts` exercises both actual documented families in Web Components, React, Vue and Vue 2: corner geometry/hit testing, shortened-track pointer drag endpoints, focus bounds, hidden single-axis tracks, fractional thickness changes, and disappearing/reappearing content. A dedicated read-only Actions job captures the public baseline and candidate, binds PNG/JSON evidence to the production SHA and harness SHA, and keeps baseline capture-only distinct from candidate acceptance. The baseline job transplants only the test harness, not implementation or styles.

Local browser launch is unavailable in this execution environment; no browser security policy is changed. Real-browser execution, screenshot inspection, independent review, and exact-head CI remain pending until their actual results are recorded in the PR. No screenshot from the user's private report is published.

OpenAI Dots assisted source tracing, implementation, tests and evidence preparation. No third-party implementation or assets were copied. Existing upstream provenance for the Shadcn family is unchanged.
