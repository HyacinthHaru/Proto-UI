# Homepage Search recovery in Chromium

[PR #1435](https://github.com/Proto-UI/Proto-UI/pull/1435) binds `5f2d845ce54666a167f06895033a616d8bfa3382` to the original Search browser file. The main baseline `98ac19762f08351684d801db8006ca7c71fb6f30` passed 10 of 78 cases. The candidate passed 60 of the same 78 cases, with all ten baseline passes retained. The Homepage cross-runtime open session, focus return, current Header controls, missing-index Retry and standalone no-addon geometry passed.

The original 1000ms readiness stage passed eight cases on both revisions. The browser observed all eight ready before the stage began after navigation. The report retains the actual timing origin. The remaining 18 failures cover 200 percent layout, nested scroll and Rhea menu geometry. Linux production Pagefind is tracked separately on the candidate workflow.

Four original local viewport images are included. The Homepage and Retry images can capture the opening transition. Their associated test receipts establish the interaction predicates. These images are development harness captures.

AI assistance: Codex.
