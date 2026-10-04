# Consumer density and navigation reconciliation

This bounded website-consumer correction follows actual homepage/desktop navigation feedback. The first mobile natural-height revision is `ceb447d298c9aeacaf428ed375e147e0dc9ab8c4`; its 34-frame archive remains available for comparison. It is not a new Prototype identity, Base behavior change, or a claim that all design languages should have identical density.

## Existing owners and chosen inputs

- Sidebar and table-of-contents rows use the existing public family Surface/Text composition. Their surfaceStyle min-height now receives a shared 32px desktop / 44px compact layout variable, with 4px/8px padding. Shadcn row Text uses normal/medium (400/500); Brutalist keeps medium/semibold (500/600). Sidebar width, native links, hrefs, and page navigation ownership are unchanged.
- Starlight's `aria-current` remains the only strong current-section owner. `in-view` remains the original set of visible sections and provides only a quieter foreground cue, never a second set of accent backgrounds. No scrollspy setter, observer, visible-section event, or native hash navigation was replaced.
- The homepage slogan uses actual public Text inputs: desktop 4xl/36px, compact 2xl/24px. The homepage cards alone receive 20px Surface padding and 24px desktop / 20px compact between-card gaps. Card title/description, body, input, code, and the families' demonstrated Button sizes remain unchanged.
- Header Selects receive a distinct public surfaceStyle layout variable: 36px desktop, 44px compact. Existing 44px Header command/CTA targets remain independent.
- Shadcn outline Copy can contain alpha fills in dark/hover states. Its existing actual Button now has an existing Shadcn Surface (derived from Base Surface) as a passive opaque backplate in the same box, with no padding, border, added row, event, focus owner or reduction of code width. The opaque Brutalist Button does not receive an unnecessary new backing layer. Runtime/theme transaction and cleanup stay in the existing Copy scope.

## Evidence boundary

Focused native-link/family ownership, Typography state and four-runtime Copy/icon tests exercise these inputs and lifetimes. The exact-source visual-density job first captures the user's same desktop article with both sidebars, then 390/1440 Chinese/English light/dark homepage and docs views, plus bounded Brutalist checks. Measurements target the actual public Text/Surface leaves rather than wrapper font values. The mobile probe retains short/long source, true Copy, hover/focus frames and 320px/200% menu/source pressure coverage.

Screenshot capture is not visual acceptance. Every final frame must be inspected for density, a single Header close control, natural short-content sizing, overlays, readable labels and viewport bounds. The earlier duplicated Close and forced blank footer frames remain explicitly rejected historical evidence. Search's production one-second threshold and all existing required browser suites remain unchanged.
