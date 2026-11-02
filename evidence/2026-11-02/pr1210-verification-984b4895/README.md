# PR1210 verification and lifecycle fixture repair

Target product: PR1210 head984b4895480908dea99ff34b9ccaca177ddcab63. Test-only follow-up b27742508687629ce36ba98ea34e70472b54762f has that head as parent. No product source or original-owner commit rewritten.

## Actual validation

- Original five suites on984:122/123 pass, one compact recipe assertion fails and FOUR unhandled Rhea composition errors. The failure is compact `not border-transparent`, not proof of a bad desktop return.
- Only repairing the fixture to use real Surface/Viewport/ItemText:8/9 pass, same old paint assertion remains, no unhandled errors.
- Existing accepted Header control direction (`2026-10-29-header-shared-control-recipes.md`) chooses Rhea **default at both breakpoints**. Public recipe test pins both appearances to default. Native Rhea default owns `border-transparent bg-input/50`; no consumer ghost subtraction is permitted. Corrected lifecycle case retains original reparent/unique-owner checks, pins independent native paint tokens and requires identical full style facts through compact and desktop. It does not change product paint to satisfy obsolete ghost behavior.
- Candidate original five suites:123/123 pass,0 unhandled errors. Additional relevant controls/recipe/lifecycle suites36/36 pass (overlaps exist; do not sum into159 unique cases). Two-worker local setting is explicit. Test file formatted with repository Prettier; diff check passed.
- Full product website build on984 plus test-only candidate:655 pages. Complete candidate and sole-Root-control sites retained locally.
- REAL native WC consumers, Shadcn and Brutalist, desktop1440×960/DPR1: click visible Header Runtime Select; native ArrowDown focuses React while selected value remainswc; call public Root.requestOpen({open:true,focusReason:'keyboard',entry:'selected-or-first'}). Both returntrue and emit one openChange. Candidate retains exact focus/one active React/selectedwc; actual DOM/ARIA snapshots and screenshots retained.
- Sole-Root revert uses only d850 Root (one-line difference) in the otherwise same984 product source, rebuilt through the original command. Both families FAIL after requestOpen becausewc andreact become simultaneously active. Restore exact candidate Root and original candidate site: both PASS again. This is green→red→green real browser evidence, not just opening a Select normally. The method call is intentional public API input, not a trusted keyboard event. No focus/state injected to manufacture the result.

## Scope and provenance

Node24.21.0, pnpm10.32.1, Chromium155.0.8059.39/macOSarm64. Complete local production site served by Python ThreadingHTTPServer/backlog128. No physical-device/full-AT, React/Vue/Vue2 native repeated-open, controlled-open native, compiled consumer or whole-CI acceptance claim. Those controlled/boundary cases have unit evidence only. Rendered screenshots are actual capture frames; no final-animation geometry claim.

Native product bytes belong to984; local test-only repair does not change the website bundle. Baseline and positive/control/restored scripts/logs are preserved; public derivatives sanitize only machine paths and ANSI format. Raw/public file hashes are in source-map.json; PNG bytes unchanged. Four candidate before/after screenshots were viewed; sole-revert screenshots record actual failing state. No evidence is relabeled as current main or hosted run.

The inherited original assertion is retained in public history and original log. This follow-up reconciles a contradictory fixture premise rather than removing coverage or changing deadline. Existing Select/Header product fixes remain intact. Shared stopServer timer work belongs to its existing writer and is not changed here. Other failed CI checks, public upload/independent acceptance and integration remain separate. No APPROVE, merge or Issue closure claimed. AI assistance: Codex, user-directed verification and minimal test repair.
