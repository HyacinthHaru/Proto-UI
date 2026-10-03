# Actual DOM optical-carrier experiment

Refs #793 and #792. This isolated experiment answers whether one measured Chromium version actually samples and spatially displaces its DOM backdrop through an SVG reference filter. It does not implement Liquid Glass, introduce a Prototype material API, or admit an Adapter/Compiler profile.

The source has ordinary non-periodic red and green DOM lines and mutable DOM text. There is no backdrop image, screen capture, canvas copy or cloned scene in the effect. The browser supplies `SourceGraphic`; `feFlood` supplies a known, owned constant displacement input. PNG decoding is **test observation only**, after rendering. It is never fed back into the displayed effect.

## Discriminating observations

Run `node experiments/material-optics/backdrop-probe.mjs` with `CHROME_PATH` and `OPTICAL_EVIDENCE_DIR`. The bounded workflow does this on the exact PR head, Ubuntu 24.04 and the installed Chrome, with read-only contents permission.

- No effect and zero scale agree on non-periodic marker centroids
- Positive and negative scale cause opposite 10px sampling displacement
- Sharp marker contrast survives displacement; blur alone spreads the marker without moving its centroid and cannot satisfy this oracle
- Foreground label pixels stay unchanged
- A 23px mutation of the actual DOM source moves the filtered and unfiltered marker, and the underlying DOM text changes
- Moving/resizing the surface preserves screen-space sampling positions
- Pixels outside the surface clip remain unchanged
- Returning to zero samples the current source; page errors remain empty

Each stage emits its actual pixels and measured centroids. The report includes source SHA, engine version, Node and scope, including a failed/unavailable result when an assertion fails. Local execution is unrun under the known browser process restriction. There is no passing claim until Actions artifacts have been inspected. A carrier failure is useful evidence, not grounds to weaken the displacement assertions or change the background to a fake copy.

## What remains after a carrier pass

A constant translation is not lensing. A later, separately reviewed slice must derive a spatially varying displacement and highlights from shape geometry, prove its rim profile and response to shape/light/interaction, then establish finite host-neutral intent and resource-lifetime contracts. A compiler must specialize that intent into each actual backend, not rename a runtime CSS interpreter as AOT. Material groups, morphing, adaptive legibility, host fallback quality and performance each require additional evidence.

No screenshot can establish cross-engine or native support. The current WebKit reference-filter work is still tracked upstream; Flutter shader image filters require Impeller; Qt needs an explicit scene texture; this repository's GPUI root Feedback and scene-sampling paths need their own evidence. Unsupported backends must remain explicit.

## Primary sources

- [Apple: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [CSSWG draft: actual Backdrop Root input and clipping](https://drafts.csswg.org/filter-effects-2/#BackdropFilterProperty)
- [W3C: displacement sampling and scale-zero behavior](https://www.w3.org/TR/filter-effects-1/#feDisplacementMapElement)
- [WebKit reference backdrop filter issue](https://bugs.webkit.org/show_bug.cgi?id=245510)

All optics in a future independent model are our model parameters, not Apple's private numeric values or proprietary shader. No Apple asset is included.

## Shape/liquid experimental scene

`heightfield.mjs` is an independent numeric model, not Apple's private optics. It derives both displacement and highlights from the same rounded-shape field. A smooth union combines approaching shapes before one backdrop sample, and press/menu state changes that same geometry and rim strength. `liquid-demo.html` displays the actual live DOM background, never its screenshot. Only the owned normal/highlight field is generated in a canvas.

`liquid-demo-evidence.mjs` records actual input-driven motion to WebM, with zero-displacement and reversed-light pixel controls and source-bound captures. Each requested capture records its **actual** state/frame: screenshot latency may skip a requested animation threshold, so five requested captures do not automatically establish five different intermediate states. Inspect both the video and recorded states before making a temporal conformance claim. The interrupted press chain retires after an unsuccessful animation generation; this is still an experiment, not complete production interruption semantics.

The original carrier proves horizontal marker displacement and no leakage beyond the outer rectangular clip. It does not by itself establish vertical sampling, rounded-corner pixels or a pixel-level assertion of updated backdrop text. The shape unit checks are mathematical evidence, not a substitute for observed browser fields. Adaptive contrast, accessibility policy, group ownership and portable Prototype/Compiler admission remain separate work.
