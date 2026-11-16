# S4 early Vue runtime control

The [React-early baseline](https://github.com/HyacinthHaru/Proto-UI/tree/b3ec268428068e6d4bf0eac464d5aa5b140dd122/evidence/2026-11-17/s4-static-vue-runtime-delivery) and this arm have identical served Chinese HTML, diagnostics on three compiled assets, runtime target lists, and the Network observer. Both use one worker and the same pinned Chrome and Node versions. The only test delta adds an early native module that calls the existing compiled `loadVue()` export. The original 1,268-preview check retains 60 seconds and the original test retains 150 seconds.

The Vue package now returned at 15.12 seconds and its previously waiting Base Accordion published at 71.03 seconds after navigation. The React runtime returned at 42.78 seconds and its observed Accordion published at 73.50 seconds. The previous arm's React runtime returned at 22.80 seconds. These are same-attempt markers in two observations of fully loaded pages and give no general throughput estimate.

The original readiness predicate failed at its 60-second wait and the diagnostic post-verdict query reached its own collection limit. There was no delivered first-missing row in this arm. No page or console errors were collected, and the Dialog interaction did not start. Generated assets and the test sources were restored.
