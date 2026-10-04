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
