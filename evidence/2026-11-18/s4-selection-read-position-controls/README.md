# S4 Selection read-position controls

Two separate native observations at signed source `9ed1270c88dcd55a93b9e06eadbbc117695f2ee3`. Same pinned Chrome 156.0.8078.79 and same built Chinese Matrix with all 1,268 preview roots. Both original cases failed at the 60-second readiness wait and retained the 150-second case limit. English was filtered for each probe. The only changes were diagnostic emitted-asset wrappers and runner console forwarding. The original fresh getter and the order of activation, display, appearance and physical move remained in place. All asset bytes were verified after restoration.

Within each run, first-generation publications were interleaved among three arms by runtime. The control added no getter. The other two arms added one live anchor getter at the stated checkpoint. The rows below are the last delivered 640-publication checkpoints. They count both getters, with no subtraction for the shifted read. Milliseconds are inclusive. These checkpoints are delivered observations rather than totals at the deadline.

| Run | Arm | Calls | Extra getter total ms | Original getter total ms | Both getters mean ms/call |
| --- | --- | --: | --: | --: | --: |
| display | ordinary | 214 | 0.0 | 4959.9 | 23.18 |
| display | beforeDisplay | 213 | 4940.2 | 37.6 | 23.37 |
| display | beforeAppearance | 213 | 4669.5 | 0.3 | 21.92 |
| activation | ordinary | 214 | 0.0 | 4848.1 | 22.65 |
| activation | beforeActivation | 213 | 4844.5 | 61.3 | 23.03 |
| activation | afterActivation | 213 | 4670.1 | 33.4 | 22.08 |

Most of the cost moved to the extra getter even when it ran before the candidate host was unhidden. Adding the early getter did not eliminate the expensive work. The original reads observed empty Selection in these prefixes. Real focus and nonempty Selection written by callbacks are separate correctness gates. The diagnostic can perturb scheduling, and its totals do not establish a speedup or identify a specific earlier write that invalidated layout. It narrows the next investigation to the work before activation, including candidate materialization and earlier publications. There is no production patch in either probe.
