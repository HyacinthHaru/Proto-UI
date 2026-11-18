# Live Anatomy lists and shared Previewer removal observation

## Anatomy

The two subscriber registries mutate their lists in place until a list drains. The iterator keeps the live list across recipients and consults the registry again after it drains. A callback can then replace it. The existing creation-order cursor repair still handles removal or movement of the current owner.

The original steady control reads the subscriber registry 66 times for 32 order and target subscribers. The candidate reads it twice. Pinned Chromium confirms 66, 2, 2 and 66 in both standalone and integrated parent/candidate/candidate/parent controls. Reentrant cancellation and insertion still deliver 33 visits. Complete cancellation followed by registration under the same family delivers both the previous and replacement owners. A real DOM move still changes all 32 order versions.

In the separately observed Chinese S4 prefix, one emitted bundle records 5,963,776 subscriber visits and 60,343 registry lookups at page time 68.382 seconds, one lookup per recorded fanout. The original bilingual 1,268-preview tests still fail at 60 seconds, with their 150-second case limit. The integrated product tests and the later main merge's 58 exposed-callable tests are recorded separately. The merge adds release notes and tests, and the previously tested product inputs match.

## Website Previewer

The generic and projected clients share one removal observer for a body. Each client retains its own liveness predicate and cleanup. The clean main control registers two observers in the existing two-preview fixture. The exact candidate passes all 132 focused cases.

The separate native Chromium module witness starts one body observer for two previews. It retires the first while preserving a preview reinserted in the same turn. It disconnects the last registration, observes the replacement in the next mutation, and retains an owner error while letting a later owner finish its check. The fresh standalone product builds 47 packages and 683 public pages, passes workspace types and manifests, and passes all five native projection-scope cases.
