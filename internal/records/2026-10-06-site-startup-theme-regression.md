# Website startup and open-menu theme regression

Issue: #856. Baseline: 48b80f8b8 (2026-10-06). Human-assisted bounded repair.

## Request and scope

Sanitized maintainer request: fix the compressed example Runtime Select, incomplete cold-load header, controls disappearing while changing theme with navigation open, and relevant Shadcn presentation/material inconsistencies. The private 2048×1237 references were inspected but are not published. Documentation prose is unchanged.

The website owns loading/disclosure composition and theme inputs. Actual controls remain Base-derived Shadcn/Brutalist Select, Button, Surface and Text through installed adapters. P-BASE-SURFACE / P-SHADCN-SURFACE are draft, explicitly passive and exclude material semantics. P-SHADCN-SELECT-TRIGGER is draft and distinguishes current styling from pinned-upstream parity. This repair introduces no stable guarantee or page-specific Prototype.

## Actual correction

- A nested homepage language/social group read its Shadcn input from within the old header Surface theme copy. On a light-to-dark transition it retained light foreground/background while the parent received dark colors. Each participant now receives one snapshot from the page header input, with the same mounted generation and native links. Theme refresh is not a remount.
- The example AdapterSelect imposed a 9rem width, while its full label plus chevron/padding requires more space. Its layout budget is now min(12rem,100%); existing wrapping remains available only when constrained/enlarged rather than squeezing ordinary 390/430/desktop reading. The server-rendered value contains the actual initial label until upgrade.
- Before client initialization, the header exposed all preferences in normal flow. A native closed details/summary now owns the initial fallback. It works during slow scripts, failed scripts and no JavaScript. Enhancement adopts an already-open native state before handing control to the real Proto Button and existing disclosure; destroy restores native ownership.
- Preview loading names its state and reserves a visible area rather than showing an unexplained sparse label. Loaded examples are not hidden behind a whole-page opacity gate.

## Red/green and limits

The theme coordinator regression failed with the old #fff/#111 nested palette instead of #111/#fff; 24 existing tests passed. The native disclosure adoption test failed because upgrade hid an already-open panel; 26 existing tests passed. After correction, all 78 selected homepage/header/Select tests pass (Node 24.19.0, pnpm 10.32.1, Vitest 2.1.9, Happy DOM). This is coordinator/host-unit evidence, not browser paint.

Local Chromium launch, including one reviewed retry, failed before page execution because the execution sandbox rejects the browser socket. No local browser pass is claimed. The new read-only GitHub Actions lane builds the actual production site, tests the exact baseline and PR head with the same probe, delays script delivery (without changing DOM/CSS), captures initial/loaded states, repeated open-menu theme cycles, Escape/reopen/focus, and Runtime labels at 2048×1237, 390, 430 and 320 stress widths. Its report includes source SHA, browser, image hashes and observed state. Native evidence remains pending until that lane runs and its images are inspected.

Workspace type checking passed; the first docs stage stopped before diagnostics on Astro's unavailable default telemetry configuration directory. The task-local configuration retry passed: 448 files, 0 errors, 0 warnings, 4 hints. The expanded six-file suite passed 107 tests; prototype catalog validation passed. Final checks, native image inspection, independent review, commit-bound public captures, and remaining Shadcn/material visual review stay open.

## Reference and provenance

The official Shadcn Select and semantic theme documentation were inspected as visual/ownership references, not copied implementation: https://ui.shadcn.com/docs/components/base/select and https://ui.shadcn.com/docs/theming (2026-10-06). Existing project Prototypes remain the implementation. No third-party source/dependency was added.

Co-author by OpenAI Dots

## Outstanding visual acceptance in this same request

- Inspect exact-head production screenshots for header/group spacing, foreground/background pairs, borders, corner/depth consistency and Select label/chevron geometry against official Shadcn references.
- Verify the existing Shadcn DialogMask's blur actually paints on the homepage dialog and the corresponding document example. Its current explicit Prototype token is backdrop-blur-xs; a token-only assertion does not establish backdrop pixels.
- Select and nonmodal navigation popups use readable opaque surfaces in the current official reference. Do not smear their text or apply blanket blur to every overlay. If the header is made translucent, choose a reusable appearance owner and verify readable fallback under reduced transparency, forced colors and unavailable support rather than using a page-only decorative patch.
- Native CI is pending, including no-script/cold-load behavior, open-theme-close-reopen and mobile screenshot inspection. No full Shadcn parity claim is made from the current three bounded repairs.

## Initial navigation focus and no-script completion

A second pass found two upgrade-boundary gaps, each demonstrated by a new failing test before correction: a focused native summary became hidden instead of transferring to the real menu Button; and a focused native homepage language link stayed in the hidden fallback rather than transferring to its same destination in the first real generation. The latter test runs the actual WC materializer and public Surface/Text composition. Both now pass; the three directly affected suites pass 67 tests. The expanded six-file suite passed 109 tests, and final docs types passed again across 448 files with 0 errors and 0 warnings (4 hints).

No-script documentation exposes native locale links, and previews show the truthful JavaScript requirement instead of an endless loading label. The production probe now uses native touch taps at phone widths, keeps a focused open fallback through script release, explicitly tests no-script 390px navigation, and captures real homepage/document DialogMask rendering with default, reduced-transparency and forced-colors inputs. Preference captures are observations pending visual assessment, not a fallback-success claim.

Production build of the candidate completed: 284 pages, 279 Pagefind-indexed pages. Exact-head CI for the first published head was still queued as of 2026-10-06 11:15 UTC; no browser screenshot or hosted pass existed yet.

Pinned upstream inspection confirmed SelectContent uses opaque popover tokens and the site header uses opaque background; adding blur to those merely for purported upstream parity would be incorrect. The upstream DialogOverlay is black/50 without blur; Proto UI's blur is an existing project extension, whose actual rendering remains subject to the added evidence.
