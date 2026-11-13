# S4 React transitive dependency delivery

The detached a7952f1 diagnostic kept the complete S4 bilingual fixture and its original 60-second predicate and 150-second case deadlines. In the first observation the three optimized React entry requests completed, but the two shared dependencies chunk-2MALL255.js and chunk-EK7DFB6S.js showed only browser request events before the original case failed. A hash-bound local Vite graph identifies the shared imports and the already delivered common helper.

A separate same-host server/browser journal observed both dependencies. The dev server received and finished writing HTTP 200 within 0–4 ms for all four observed requests. In zh-cn, the browser response observation arrived about 77.3 seconds after the server finish. In en, neither browser response was observed for about 123 seconds between server finish and the original case error. Neither language reached an observed React import completion or root render. Both still recorded 18 inherited owned-decoration errors and failed the original 150-second case.

The remaining gap is after server write completion and before browser response observation. Server finish does not prove browser consumption, and the observer interval can include transport, browser processing and protocol delivery. Both trace-stream attempts reached EOF with explicit data loss and without the relevant React boundary marks. They cannot establish a module-evaluation or scheduler attribution. No change to product React loading or Shadow support was made.

[Demo Matrix tracking](https://github.com/Proto-UI/Proto-UI/issues/1178)
