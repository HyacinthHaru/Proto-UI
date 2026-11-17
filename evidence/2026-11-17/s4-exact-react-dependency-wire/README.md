# Exact built React dependency wire trace

This Chinese diagnostic uses the exact built `04c433c4` Matrix HTML with 1,268 previews, three local asset overlays and a test-only console/CDP observer. The original predicate, 60s readiness wait and 150s outer limit remain in force. Pinned Chrome 156 records no page or console errors. The case fails the 150s outer limit before Dialog.

Native JavaScript import dispatches for React, ReactDOM and ReactDOM client occur at page time 14.2925–14.2926s. All eight unique Vite-mapped dependency assets return HTTP 200 and have CDP loading completion records. The latest completion timestamp aligned to the page clock is 14.3073s. CDP delivery to Node occurs later and is reported separately. The captured browser stages contain no return marker for any of the three import promises. The paired WC Accordion publishes at 25.4485s.

The completion markers establish delivery of these assets. The trace has no direct observation of module evaluation, shared ESM initialization or the renderer tasks that precede promise settlement. Those are the next measurement boundaries.
