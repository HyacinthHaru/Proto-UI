# Native selection reads during preview startup

The signed product is `0774aa5009d62f20f3770e8fff3c6cecdc0371e9`. The original Chinese S4 document retained 1,268 previews, its 60-second readiness predicate and the 150-second case limit. All five executions in this investigation failed the original readiness assertion before Dialog. Each used Chromium 156.0.8078.79. Product source and emitted assets were restored after every observation.

## CPU attribution

The first profile attempt could not return its stop result within a five-second collection budget after the original verdict. That raw failed receipt is retained. A second capture started before navigation, requested 10-ms sampling, and requested stop 30 seconds later. It returned 3,263 samples covering 32.888 seconds. The largest directly attributed frame was the native content lease function, with 5,073.2 ms of sampled self time. Sampled self time includes native operations reached at that JavaScript frame. The profile identifies a path for further observation, not precise exclusive CPU consumption.

The source-bound read probe separated activeElement, Selection acquisition, both endpoint getters, source-boundary capture, the move and focus restoration. The first 384 captured moves all had empty selection, and the anchor getter alone accumulated 4,664.3 ms. activeElement and Selection object acquisition were below a millisecond in that delivered prefix.

## Controls

| Separate run at 576 observed moves         | Accumulated Selection read time | Empty selections |
| ------------------------------------------ | ------------------------------: | ---------------: |
| Original helper                            |                     10,959.4 ms |              576 |
| Read rangeCount before the endpoints       |                     10,715.3 ms |              576 |
| Lay out the staged shell before activation |                     10,558.4 ms |              576 |

The rangeCount guard moved the expensive read into the range-count branch. The staging control rendered the unpublished shell connected and transparent before activation. Neither control established a material reduction of selection read cost or passed the original readiness assertion. They remain experimental artifacts. The exact pinned Chromium source calls rangeCount from the primary range accessor; with no cached document range, rangeCount requests style and layout before deriving visible selection. This explains why the first endpoint getter and the count guard both incur that work. [Chromium 156.0.8078.79 DOM Selection implementation](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.79/third_party/blink/renderer/core/editing/dom_selection.cc)

The current source tests require fresh selection across synchronous owner moves, including a selection created by a connection callback and a range crossing a registered retired wrapper. This investigation preserved those boundaries. A local empty-endpoint test draft was archived without a product change. Next work should reduce layout invalidation around publication while retaining that fresh native state.
