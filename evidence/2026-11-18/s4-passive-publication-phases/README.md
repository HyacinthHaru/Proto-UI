# S4 passive shell publication phase measurements

One native observation of the Chinese original S4 case on signed composition `9ed1270c88dcd55a93b9e06eadbbc117695f2ee3`. Chrome 156.0.8078.79 and one worker. The browser used the same built Matrix document with all 1,268 previews. The two emitted assets received timing wrappers around existing operations. A runner overlay forwarded their diagnostic messages. The application order, original assertion and 60/150-second limits were preserved. Both original asset hashes and the runner worktree were checked after restoration.

The final delivered checkpoint was 640 first-generation publications at page time 69.988 seconds. It is a prefix with an observed delivery time rather than the state exactly at the deadline.

| Synchronous call boundary        | Cumulative elapsed |
| -------------------------------- | -----------------: |
| Display declaration write        |             7.7 ms |
| Dependent appearance publication |             2.0 ms |
| Acquire Selection object         |             0.2 ms |
| Selection `anchorNode` getter    |        14,610.2 ms |
| Selection `focusNode` getter     |             0.8 ms |
| Physical move callback           |         2,533.4 ms |

The timings include any native work incurred inside each call. In this sample the first Selection endpoint read incurred most of the observed publication time. Its duration can include layout work invalidated by earlier writes. This timing partition alone cannot attribute the layout invalidation to one writer. The exhibit records the earliest ten slow publications and all delivered checkpoints, including moves that took hundreds of milliseconds.

The original selected case still fails readiness before Dialog. The English case was filtered for this probe. Browser evidence for the scoped Contents/Dialog/Runtime Tabs and Header controls is in the [current combination packet](https://github.com/HyacinthHaru/Proto-UI/tree/3480784e75ef2276f86eaa4d09375591fede5e51/evidence/2026-11-18/s4-current-nested-portal-profile). The hooks here are diagnostics only. A follow-up should distinguish the dirtying operation while preserving Selection and focus created by synchronous appearance and move callbacks.
