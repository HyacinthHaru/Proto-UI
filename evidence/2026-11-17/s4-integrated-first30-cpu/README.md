# Current S4 candidate startup CPU attribution

Agent request paraphrase: continue the authorized S4 startup investigation on the actual combined source, preserving complete content, original assertions and deadlines; use new same-run evidence to choose the next source-level action.

Source `b6bfa4f0b978275dd2a2f0769fee19741c197459`, tree `dc207e9bf518274ced9aca313f6eff5095524a90`. The [combination and failed visibility controls](https://github.com/HyacinthHaru/Proto-UI/tree/b5cc572f347960ea39bbb25d0d2586cebe641587/evidence/2026-11-17/s4-selection-review-integration) remain separate. This run changes only the observing test runner, with no emitted CSS/app-JS overlay; it restores the exact tracked files afterward.

Chrome156.0.8078.79, Node24.21.0 and pnpm10.32.1 on macOS arm64. V8 sampling requested10,000us before navigation, with a Node stop request scheduled30s later. The request is actually issued at Node31,341.088ms and capture returns at37,668.858ms. The actual profile spans **36.293376s**,3512 samples/9271 nodes. A requested30s stop is not a30s completed profile or a browser/Node clock equivalence claim.

The original single selected Chinese S4 case still fails its60s readiness wait before Dialog; the English case is filtered, not passed. Full1268 roots and150s case limit remain. CPU collection completes and the original failure is retained. The raw profile stays locally retained with its SHA; the published analyses normalize frame URLs to asset basenames and independently verify the actual emitted-JS hashes.

The largest sampled application frame is the native-content-lease function, about6,066ms sampled self. Its source has native Selection getter calls, so attribution includes native work while that JS frame is active; this is not6,066ms of exclusive JavaScript instructions. The required-token map in projection-theme is another large sampled entry across preparation/watch and initial-read paths. Same-function aggregation and the actual call chains are included, rather than treating separate node IDs as different functions.

The mapped projection-theme location calls getPropertyValue/trim and validates the required --pui palette before building the closed snapshot. Existing code deliberately resamples at publication/watch boundaries. This profile alone does not prove those reads redundant, permit a stale shared cache, or quantify a page speedup. Next inspect actual preparation, seeded watcher and source-input/reentry boundaries, then use a bounded causal control if a removable repeated operation is established.

`profiler-overlay.py.txt` is the actual runner-overlay generator, using an externally supplied PUI_S4_CPU_OUT path. It preserves the original acceptance and schedules early collection; it is not a production patch. `analysis.json` retains sampled call chains,10s windows and emitted asset bindings. `profile-summary.json` retains request/response observations, aggregate frames, scope and original verdict. Unbound inline/native frames remain explicitly unbound.

Evidence disposition: partial technical attribution, unassessed human-assisted partial/ABSTAIN. No benchmark ratio, exclusive engine-time attribution, full S4 pass, hosted CI, independent maintainer approval, upstream integration or release acceptance is claimed.
