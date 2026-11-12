# Hosted Brutalist comparison and narrow Header focus-ring sampling

## Hosted before and after compact Header measurements

The trace-only checkouts `09ea3404` and `416f8cb7` carry product `26418fe1` and `f58c7af3`, respectively. They selected the same original 12 suites per shard in 1/8 and 3/8. The Ubuntu runner image/version, Node, Chrome, pinned CJK font, shared Astro server, trace configuration and deadlines match. Trace was enabled only in shard 1 around the original Brutalist family click and poll. Both runs used the default CPU rate and excluded the held Search native lanes.

Times are relative to the original Node poll start, except the two explicitly named Chrome-clock intervals. The same-root clock calibration is refined by the exact matching CDP command. Node's pre-send hook precedes Chrome's command handler, and Chrome's matching response dispatch precedes the Node pipe ingress. Raw calibration bounds are retained alongside the refinement.

| Observation | Before `26418fe1` | After `f58c7af3` |
| --- | --: | --: |
| Original 1000ms check rejected | +1001.363ms | +1000.579ms |
| Family write, causally refined range | +1257.381–1258.374ms | +1334.346–1335.152ms |
| Chrome forward to renderer dispatch | 1655.801ms | 1678.390ms |
| Family write to renderer dispatch | 768.705ms | 746.119ms |
| Matching original Node query returned | +2029.979ms | +2084.207ms |
| Sample weight for the retained Button anchor rect read | 119.685ms | 111.658ms |

The fourth original query was outstanding at both verdicts. Chrome handled and forwarded each request in 0.009ms. Its forward-to-dispatch interval overlapped renderer tasks for 1655.768ms and 1678.346ms, respectively. The second trace is complete without reported data loss. Context, stream and CDP session were closed. The V8 sample positions in both traces are generated line 84, column 27. The Vite 6.4.1 reconstruction from the exact Git blobs maps this to `const anchor = button.getBoundingClientRect();` at authored line 130. The compact-layout fix removed the panel-width and root-direction reads. Its deterministic 390px and 430px tests reduced each removed read from three to zero. The hosted weights describe the retained anchor and provide no isolated speedup estimate for those removals.

Before the family write, motion-palette property-read samples were 93.728ms and 99.756ms, and Typography `preserveSelection` leaf samples were 99.908ms and 82.519ms. The sample pair still misses the original family deadline. Named Contents/mobile and Dialog cases passed in both hosted runs. Both containing shards in each run exited 124 at their original 900-second limit. [Before run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43169302472) · [After run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43198607525) · [Exact comparison](hosted-comparison.json) · [After dispatch](dispatch.json) · [After renderer profile](performance.json)

## Narrow WC focus-ring assertion

A test-only observer on the exact `f58c7af3` product reproduced the original WC shadow rejection. At the original sample the same Trigger had native focus, `:focus-visible`, a 2px ring width and 2px offset. Its box-shadow still matched the unfocused sample. The observer kept the verdict and sampled subsequent animation frames without further input. Its first observed changed shadow was 46.9ms after the last focus event, with a running 150ms box-shadow transition and the same focused node. The last sampled frame had no running transition and retained the painted ring. The observed first changed frame is a sampling bound. [Original sample](wc-ring-original-sample.png) · [Same-failure facts](ring-baseline-receipt.json)

The draft `P-BRUTALIST-SELECT-TRIGGER-MOTION` retains the elevated Trigger's 150ms CSS transition. Exact head `a0536a7b7d2b24e469a9baa76a0422803baba0df` changes one browser test. The original token poll for the Brutalist runtime Trigger now requires both the token and a changed shadow on the focused element. It uses the existing 1000ms poll window. The existing shadow, numeric ring, geometry, clipping, focus, ownership, Contents and family assertions remain. Product code, CSS and all CodeExamples remain intact.

The clean exact head passed 14 selected Chromium tests, with four other Homepage tests filtered. These include the two Contents/mobile cases, two compact 200%/RTL cases, both reconnect journeys and all eight Dialog cases. It retained eight Contents switches and 24 ordered sidebar returns. The local original Brutalist family check passed at 603.154ms. WC, React, Vue and Vue 2 each showed a changed shadow, 2px width, 2px offset and an unclipped ring in the narrow viewport. Workspace and Astro type checks passed, with 1,215 Astro files, 0 errors, 0 warnings and 30 hints. [Exact validation](final-validation.json) · [Painted WC sample](wc-ring-painted-sample.png) · [Contents](shadcn-react-public-popover-open.png) · [Dialog](brutalist-react-long-font200.png)

PR #1435 remains at `3139922b` with five unresolved inline threads. The existing #848 A/B patch still applies cleanly to that exact source. The plan and hold on new native execution remain in effect.
