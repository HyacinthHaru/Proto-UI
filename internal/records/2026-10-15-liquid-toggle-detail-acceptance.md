# Liquid Toggle: independently defined detail diagnostics

Agent: dot

ModelTrace: not measured — owner-authorized dot exemption (2026-10-06)

This role declaration is not authenticated model identity, permission, independent review, or acceptance.

## Scope and definition before implementation

These engineering thresholds were proposed and accepted before implementing this helper or inspecting any replacement tint candidate. The starting tree is `5d4de85fb42e72ac924f945d3cc04312607731d8`. They are not Apple numerical criteria, a psychophysical just-noticeable-difference model, or native/GPU equivalence evidence.

Apple's [WWDC25 session 219, 16:31–17:03](https://developer.apple.com/videos/play/wwdc2025/219/?time=991) describes background-responsive tinted glass and its connection to the environment. This motivates discriminating source response from a solid fill; it does not supply numerical thresholds. The governing Proto entities remain the draft `C-FEEDBACK-MATERIAL-0001`, `P-LIQUID-GLASS-TOGGLE`, `T-LIQUID-GLASS-TOGGLE-0001` and `T-WEB-LIQUID-OPTICAL-0001`. This dated record is supplemental diagnostic rationale, not a new normative source or an amendment to their existing gates.

Whole-image color count and any-nonzero-difference are insufficient: antialiased edges, unrelated highlights, random colors and single-code noise can pass them. A source-responsive result can also be too low amplitude to address a visibly flat selected state.

## Frozen engineering policy

- Analyze an explicitly supplied, opaque, text-free inner-content ROI. Exclude rounded/antialiased boundaries, text and contact shadows. Do not infer the ROI from color variation.
- Aggregate 4 × 4 raster-pixel cells, with at least 16 cells. Normalize diagnostic captures to one raster pixel per CSS pixel before analysis, or scale the ROI/cell size together. Never silently resize one operand to match another.
- Use coarse, balanced grayscale checker and band sources, initially 16 and 80 in 8-bit sRGB code values, with 16-pixel tiles. Repeat each with its equal-histogram spatial complement. These are independent authored challenges, not screenshots of candidate output. High-contrast and chromatic diagnostics remain useful but cannot substitute for the dark-detail challenge.
- Register the response reference to the output's geometry. An independently sampled source-to-surface mapping, or the same-source neutral optical control, can provide that reference. Account for blur, refraction, source-box offset and paint outset. Do not compare unregistered raw source pixels against refracted output. A retained source/reference/geometry record must identify which reference was used; using a neutral control tests relative retention, not independent proof of the neutral algorithm.
- Each rendered frame must retain a P90–P10 span of at least **8 code-value luma levels** after cell averaging. Code-value luma is `0.2126 R + 0.7152 G + 0.0722 B`, explicitly not linear-light WCAG luminance. Eight levels is a conservative engineering amplitude floor above 1-LSB artifacts on this controlled stimulus; it is not a claim of universal human perceptibility.
- Each frame must have source/reference versus output Pearson correlation at least **0.70**, plus horizontal/vertical neighboring-cell gradient cosine at least **0.60**. These require substantial registered spatial agreement while allowing nonlinear tonal mapping. They do not require exact colors, shader identity or pixel equality.
- For each equal-histogram reordered pair, require output-delta RMS at least **4 code-value luma levels**, reference-delta/output-delta Pearson correlation at least **0.70**, and at least **25%** of cells changing by at least **4 levels**. This rejects identical source-independent highlights, palette/histogram-only responses and small residual noise. Do not average away a failing checker or band pair.
- Require every inner-ROI output pixel to be opaque and the existing foreground contrast minimum **4.5**. Contrast uses linearized sRGB at native pixel resolution, not cell-average luma. Averages cannot hide a locally unreadable pixel.
- Compare the optical output with a same-source, same-geometry zero-refraction control and retain RMS, mean absolute difference and changed-cell fraction. This helper reports those measurements separately. It does not replace or weaken the existing optical/refraction assertions, nor invent a native optical threshold.

## Independent controls

Positive controls are simple first-party source-response operators with deliberate, visible amplitude, including blurred and geometrically displaced operators with matching registered references. They demonstrate that the metric can accept structured signal, not that any production renderer passed.

Mandatory negative controls are a flat fill; deterministic many-color noise; source-independent spatial highlight; a one-code source-correlated response; equal-code-luma chromatic noise; stale output after same-histogram source reorder; and the prior `0.68 + 0.32 * detail` safe-side linear-light tint envelope on the dark challenge. The latter is modeled independently of the production implementation and rejected for inadequate amplitude, not because of a hard-coded algorithm name. A low-contrast source-responsive positive operator must fail the separate 4.5 guard. Transparent/text/edge contamination must not create a pass.

The production pipeline must keep the original source, phase, theme, zero-refraction, interleaved-context, full-opacity, input, preference, fallback and four-runtime/public-page coverage. A passing pure TypeScript suite establishes only the arithmetic and discriminating power of these diagnostics. Real optical claims require exact-candidate GPU images, bound source bytes, registered geometry and independent visual review; native Apple visual and perceptual equivalence remain unestablished.
