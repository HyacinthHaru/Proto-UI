# Owner-local source and evidence boundaries

The reviewed changes are bounded by existing draft `C-FIELD-0001-ASYNC` / `-OWNERSHIP`, draft `C-CONTEXT-0010-F/G/H`, draft `P-BASE-TOGGLE-GROUP-REQUEST-RETIREMENT` / `-NOTIFICATION-ORDER`, draft `C-LIFECYCLE-0007-C`, and active `C-LIFECYCLE-0008-C/E/F`. No lifecycle status was promoted. Implementation evidence is not an amendment to those definitions.

`packages/modules/context/src/center.ts` completes eligible queued transitions before surfacing a subscriber error. In the Field control, an early public Context subscriber calls `validate()` and a later subscriber throws. The pending transition is observed by both subscribers before the original Error reaches the outer caller. The request remains current and can be resolved. The baseline Field `publish()` success-only gate nevertheless discards `afterPublication`. The patch removes that success-only gate and calls the existing deferred closure in `finally`; that closure still checks captured owner and exact pending request. The control covers one Error identity, normal operation, exact emitted request ID and usable resolution. The exploratory raw-0 expectation failed on both versions and remains explicitly outside the accepted exception-policy claim.

For Toggle, never-mounted logical lifetime and terminal disposal are separate. The corrected fixture mounts Item and observer through public Runtime APIs, leaves Root alive but never mounted, then disposes it from Context publication. The final Root clears its existing run and advances its private epoch on `onBeforeDispose`; the normal never-mounted control continues to work. A separate nested Context/Error case proves an accepted nested proposal can survive an outer update's error. Moving the existing finite owner-local drain into `finally` retains that notification. Global ContextCenter, Runtime and Adapter behavior are unchanged.

The relevant final source files and catalog mappings are:

- `packages/prototypes/base/src/field/root.proto.ts`
- `packages/prototypes/base/src/toggle-group/root.proto.ts`
- `packages/prototypes/base/test/notification-retirement-lifecycle.test.ts`
- `spec/tests/T-FIELD-VALIDATION-INTERRUPTIONS-0001.yaml`
- `spec/tests/T-TOGGLE-GROUP-REQUEST-RETIREMENT-0001.yaml`

`records/final-d59131ee/independent-final-binding.json` binds each reviewed source hash to its commit and final Git blob, including the exact 96 → 99 → 101 test prefixes. `records/form-context/field-late-error/source-binding.json` and the per-run ledgers bind the private 395-input pairs; Root-owned final formal runs are separate records. Public snippets and drivers may have sanitized imports or paths and were not rerun as those derived bytes.

The Form public page's historical `base-field` provider errors are a different observation. This packet contains no first stack for them and does not connect them to the Field deferred-event fix. The new e036 official run and local React diagnostic have no such errors but still fail the color assertion. Likewise, the Collapsible timing report distinguishes deadline location, delayed completion, geometry failure and trace-quality failure. None is relabeled as a resolved lifecycle defect.
