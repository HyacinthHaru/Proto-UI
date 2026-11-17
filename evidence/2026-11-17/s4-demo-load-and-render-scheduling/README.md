# Demo resource, module execution and first-render scheduling

These measurements use signed product `58f38cdca1657b6a17eb4ae48856462b4a3d6628` and its previously built public preview. Three separate runs of the original Chinese S4 test served byte-identical HTML with 1,268 previews and used the same Chromium 156.0.8078.79. Runtime probes were applied only to emitted JavaScript and the test's console forwarding. Every run exceeded the original 60-second readiness assertion before Dialog. The 150-second case limit remained unchanged. The signed product source and the built JavaScript were restored after the probes.

## Observed recipe acquisition

| Recipe | Mapped response end to module body start | Own body duration | Longest validation |
| --- | --: | --: | --: |
| Bootstrap Calendar | 12,380.2 ms | 0.2 ms | 0.2 ms |
| Bootstrap Drawer | 2,602.9 ms | Below clock resolution | 0.1 ms |
| Shadcn Tree | 16,086.3 ms | 0.2 ms | Below clock resolution |

Each recipe had four callers, one actual preload wrapper invocation, one inner import and one entry execution. The existing demo registry already shares its acquisition. The shared Calendar and Tree modules had run before the target recipe requests. The measured response-to-body gaps include browser scheduling and module preparation. They do not identify a single browser task or the exact state at the timeout.

## Scheduling controls

The lookahead called the existing loader for distinct demo IDs in the next eager group, limited to 32 owners and excluding adapter panels. Compared with the separate observed control, Calendar's response ended at 33.591 s instead of 35.785 s and Tree's at 28.109 s instead of 29.872 s. Their entry bodies started later, at 52.546 s and 50.309 s instead of 48.165 s and 45.958 s. The original readiness assertion still timed out.

The render-yield variant granted eight initial generic render starts per timer task after prototype acquisition, only during the large eager startup path. All three measured recipe bodies ran before 21 s. Twelve targeted owners reached the render queue, and none of their render starts appeared in the delivered probe prefix. The original predicate still timed out. It last streamed the empty Base Tooltip host at index 216, compared with the empty Bootstrap Checkbox Group host at index 608 in the observed control. Those are delivered snapshots from separate timings. Neither variant is included in the product, and no startup success or improvement is claimed.
