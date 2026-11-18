# S4 stable WC parent reconnect census

The original Chinese S4 test runs on integrated 7a376034 with all 1,268 previews, the 60-second readiness limit, and the 150-second test limit. The English case is filtered. The emitted asset overlay counts existing branch decisions only. The original asset and the unchanged readiness predicate are byte-verified after the run. The test reaches the original readiness timeout.

At the last delivered checkpoint at or before 60 seconds on the page clock, 4,480 opt-in reconnect calls have been observed. Of those, 2,401 retain the current logical parent, 2,077 have no previous parent, and two take the existing changed-parent path. The checkpoint is at page 59.9209 seconds. The last delivered sample, from page 68.0656 seconds, records 2,628 matching parents out of 4,736 calls. Page-clock time and Node receipt time are separately recorded in measurements.

The counters quantify which branch ran in this specific integrated build. The source fixture in the separate PR evidence supplies the paired old and new ownership behavior. The census does not measure overall time saved.
