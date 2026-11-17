# Fixed preview theme reads and publication freshness

All observations used the local signed product tree `946793b2d22afa24a97d27d58ad84748ec0557c3`, its existing static site, and Chromium 156.0.8078.79. The emitted asset variants and console forwarding are diagnostic overlays. They were removed and their originals byte-checked. All five independent Chinese matrix executions kept the original 1,268 previews, 60-second readiness assertion and 150-second case limit. Each failed at the original readiness assertion.

| Variant at its last delivered 1,376-read checkpoint | Targeted reads | First property in that group | First property across recorded groups |
| --- | --: | --: | --: |
| Synchronous passive watched owners | 17 | 31.3 ms | 2,899.0 ms |
| Batched passive watched owners | 17 | less than clock resolution | 3,065.7 ms |
| Synchronous fixed first publication | 80 | 2,166.4 ms | 3,003.0 ms |
| Batched fixed first publication | 80 | less than clock resolution | 795.3 ms |

The initial census placed 2,261.4 ms in the first property access for 101 watcher reads. The group-level controls locate most of that work at the fixed family's first publication. The runtime durations above measure non-overlapping slices inside the observer, and the combined totals include each recorded phase. They are matched by count across separate runs. Checkpoint delivery can occur after the Node readiness timer, so the totals are not deadline, frame, or whole-page speedups.

The real Shadcn Card preview tested freshness separately. Setting its local background and radius after the early sample caused the unguarded batching variant to publish the old values. An ancestor-attribute observer allowed the unchanged sample through and reread the changed inline values. Inserting a rule into an already adopted stylesheet still escaped that guard. The synchronous control used the new values for both edit paths. These controls measured CSS values in commit preparation and after readiness. They did not sample pixels or certify other browsers.

No production change is included. The control demonstrates why an unguarded prepared theme, or one guarded only by observed attributes, cannot replace the last live read.
