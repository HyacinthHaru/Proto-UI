# Brutalist rendered-contrast audit review repair

This is an engineering observation, not a new contract or accessibility verdict. It continues #469 / PR #775 from `2bf3403e` against main `d05d1a00`.

## Bounded review findings

- `discussion_r4175013220`: native Playwright visibility accepts opacity-zero popups. The audit now uses the same composed-ancestor, clipping and opacity model as its recorded frame facts for the exact trigger-controlled popup. Unsupported paint models remain unaccepted. Keyboard item lookup is confined to that popup, excluding reader-toolbar Select controls.
- `discussion_r4175013221`: add native hover and held-pointer captures for the authored default/destructive Dropdown rows and selected/unselected Select rows. The other row receives initial keyboard focus. Exact physical identity, selection before release, both source-theme colors, visible paint and native pointer state are checked. Mouseup remains in `finally`. These observations follow the draft item interaction criteria; they do not promote them.
- `discussion_r4175013226`: replace cumulative whole-report snapshots with create-only frame start/result records and changed-case/error checkpoints. PNG and measured facts remain separate immutable files. Schema 3 changes `frames` to compact records with `frameFile` references. During capture, `report.json` is an atomic current manifest; finalization writes the complete compact report once. `readContrastReportJournal(output)` recovers committed deltas and incomplete attempts without treating them as success.

## Verification and debt

Local Node 24.19.0 / pnpm 10.32.1: 33 projection manifest/composition tests and 52 public-docs/provenance/journal tests passed. Narrow runner/probe/calibration TypeScript and formatting/diff checks passed. The journal regression measures retained bytes including PNG, facts and final/current reports, and distinguishes linear growth from the original repeated whole-report snapshot strategy.

Local Chromium could not start because its local socket was blocked. The escalated execution route failed before process launch; no browser result is claimed. The full workspace type check was killed with exit 137, so it is not a pass. The normal PR-triggered, read-only `Brutalist contrast audit evidence` job runs the instrument negatives and the two popup families across all four Web runtimes in both themes, retains raw failures and exact-head source provenance, and uploads only the public test evidence. Its actual terminal result and the regular full CI remain required. New captures and independent review are pending.

No component palette, production behavior, stable lifecycle, credentials, repository protection, deployment setting or review disposition is changed.

## Current-source review reconciliation from `f5ba3b76`

The next bounded audit-only repair addresses six additional current findings. It changes no production component behavior or draft semantics:

- `discussion_r4179131332` / `discussion_r4178853195`: every shared physical target uses the probe's own supported painted-visibility model, with retained native focus/hover/held facts. Tooltip and Hover Card open observations require that exact owned content to satisfy it. Derived Tabs, popup focus and already-active Toggle predicates retain the same paint requirement; a capture-level primary-target guard covers the specialized Textarea and Scroll journeys.
- `discussion_r4178933231`: discover each source-bound documentation preview's `data-runtimes` before freezing the case matrix. Retain the exact declaration and absent adapter identities. Recheck the declaration with recipe/family/runtime/lease identity for every frame. Missing or invalid discovery creates an unresolved family case. Tooltip's three-runtime route does not imply Vue 2 support or evidence.
- `discussion_r4179009924`: hold the exact authored checked Switch, checked Checkbox, mixed Checkbox, and checked-and-indeterminate Checkbox. Require the same physical control, the expected ARIA state and native `:active` through PNG/facts, and always release the mouse in `finally`. A test compares these targets to the actual demo recipes. The two mixed controls remain separate authored cases.
- `discussion_r4179009926`: placeholder `-webkit-text-fill-color` and `text-shadow` overrides withhold numerical placeholder ratios just as the ordinary/native-value paths do. Native calibration fixtures retain an ordinary painted positive control.
- `discussion_r4178933236`: remove the incomplete PR path filter, so changes to any direct or indirect rendered input trigger the read-only evidence job. This does not add workflow dispatch, permissions or deployment.

The 17 other unresolved historical discussions are already represented in current source, including Dialog trigger/mask, surface Button journeys, passive recipe multiplicities, selected Tabs hold, Checkbox catalog entry, Spinner's reduced-motion/passive scope, exact keyboard inversions, source provenance, transformed paint, inactive descendants and unsupported fill boundaries. Source presence does not certify their entire native runtime/theme matrix.

`discussion_r4173047767` remains open: interactive always-authored anatomy multiplicities need recipe-derived, state-aware checks, including conditional portal subtrees and omission controls. This candidate does not disguise that missing evidence as completion. The report records the gap explicitly.

Candidate validation on Node 24.19.0 / pnpm 10.32.1: 59 public-docs/planning/provenance/journal/serialization tests and 33 projection manifest/composition tests passed; narrow runner/probe/calibration TypeScript passed. An initial synthetic visibility fixture omitted computed `perspective: none` and therefore correctly received unsupported-transform classification; its fixture was corrected and rerun. An initial TypeScript failure for the new string-keyed manifest lookup was repaired using the existing manifest interface. No assertion was weakened.

Native Chromium is not launched locally because of the verified environment restriction. The new native calibration cases, actual non-popup family journeys and full workspace checks remain pending. The existing native run on `f5ba3b76` observed only Dropdown Menu and Select (192 matched frames, 192 target predicates, 16 cases); it is not new-candidate evidence or a full-family audit. The unchanged CI observation command remains scoped to those two popup families unless a separate reviewed extension broadens it. An interruption during runtime discovery creates no successful report or frames; the immutable journal begins only after the discovered matrix is frozen.
