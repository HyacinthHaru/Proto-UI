# S4 Vue 2 producer, browser and application timing

The original full Chinese S4 case ran with all 1,268 previewers, the original 60-second startup assertion and the 150-second outer test limit. English was unselected. The local composition included the React, Vue and Vue 2 loader ordering changes and the latest split decoration paint review. The receipt binds the temporary observation overlay and Node preload separately.

- Vite handled and finished the one matching Vue 2 package request within 7.953 ms. The same Vite optimizer version appears in both the server and Chrome records. Chrome recorded encoded completion about 0.25 ms after the Vite finish, within the approximation of the cross-process clock comparison. The CDP completion notification reached Node about 615 ms after Chrome's timestamp.
- Browser Resource Timing recorded response end at page +12.034 s. The import fulfilled at +14.737 s, about 2.703 s later. The original Vue 2 Accordion received its first child at +55.020 s and returned from mounting at +55.025 s.
- At the last original readiness sample (+59.609 s), the first missing preview was WC Base Calendar at index 20 with an empty host and pending startup. The original outer limit terminated the case before the Dialog interaction. Both page and console error counters were zero.
- Chrome's trace reported data loss and the collector retained a 32 MiB prefix. The receipt lists intact records for the named shared optimized chunk, including its renderer-module compile. The main Vue 2 asset's engine evaluation boundary remains unverified. This is one instrumented run, on a changed composition relative to the preceding timeout diagnostic. The measurements do not attribute the difference to one source edit.

## WC Base Calendar follow-up

A second run kept the same signed composition, Chrome and original Chinese case, with a lightweight Calendar overlay in place of engine tracing. WC Base Calendar entered its switch at +8.532 s. The demo import returned at +14.602 s and its surface preparation returned in the same sample. At +14.603 s it began awaiting its 18 Base Calendar, Base Select and Lucide prototype registrations. No return from that await or entry into rendering was observed. The same owner was still the first missing preview at +110.621 s, with an empty host and pending startup. The original 60-second readiness assertion failed, with zero page and console errors.

The six recorded Calendar-related HTTP requests all finished on both the Vite and CDP logs. This is partial module coverage. It does not identify which of the 18 prototype promises prevented the join from returning or whether its transitive dependency had arrived.
