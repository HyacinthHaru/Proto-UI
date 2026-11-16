# S4 Matrix renderer thread before readiness expiry

The original Chinese S4 case reran against the same byte-checked local HTML and early React/Vue controls as the [prior probes](https://github.com/HyacinthHaru/Proto-UI/tree/167507962cc363cc8ad251b3f7f8d90732065c6e/evidence/2026-11-17/s4-renderer-trace-boundaries). It retained all 1,268 previews and the 60-second readiness and 150-second outer bounds. The original readiness wait timed out before Dialog.

A pre-navigation continuous trace recorded only top-level tasks and user-timing marks. All three browser sampler marks, at 5.24, 11.85 and 25.46 seconds after navigation, identify the same renderer thread. Their clock alignment offsets span 0.099 ms. The captured prefix reaches 70.67 seconds on that thread. Chrome reported no trace loss, but the local 90 MB read cap truncated the stream. The last saved Matrix event therefore precedes the approximate readiness verdict at 72.39 seconds.

A complete task on the identified Matrix thread starts at 61.12 seconds and ends at 70.17 seconds. Chrome labels the initiating task `ScheduledActionSendBeginMainFrame`. Its wall duration is 9.052 seconds and its renderer-thread CPU duration is 9.046 seconds. That event does not attribute the time to an individual layout, style, or scripting operation. The initialized but empty WC Base Accordion is the first missing preview at the last delivered sampler mark. The actual first missing owner at timeout remains unknown.

The parsed prefix, input hashes and test verdict are retained. Browser and asset overlays were restored.
