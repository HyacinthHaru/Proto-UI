# S4 renderer trace capture bounds

The original Chinese S4 case ran against the same static HTML as the [browser-side sampling run](https://github.com/HyacinthHaru/Proto-UI/tree/879005a12be039b65b58f6d18b0c3491b967f7d2/evidence/2026-11-17/s4-zi-deadline-sampling), with 1,268 previews and the original 60-second readiness and 150-second outer bounds. Both trace runs ended at the outer timeout before Dialog.

The continuous Chrome trace filled its buffer and reached the local download cap. The 294,422 complete prefix events contain an alignment mark at browser time 5.73 seconds. The latest aligned event ends at 8.72 seconds. See `full-trace-prefix.json`. The prefix does not cover the readiness deadline.

The bounded capture sent Tracing.start at 54.00 seconds after the readiness wait began. The first Chrome clock marker was acknowledged approximately 10.05 seconds after the request. Its five-second marker span therefore falls after the nominal readiness deadline. The trace payload completed with no reported loss and contains two named renderer-main tracks. Neither track includes a Matrix sampler marker or its known site asset callbacks. The trace does not bind a track to the Matrix renderer. See `late-trace-summary.json`.

Last browser-side samples in both runs show the initialized WC Base Accordion with an empty host. The threshold-time first missing owner and the Matrix renderer's execution breakdown remain unmeasured. Exact input hashes, limits and failure dispositions are in `source-and-verdict.json`. All test and asset overlays were restored.
