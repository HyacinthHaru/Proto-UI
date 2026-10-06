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

## Exact-head native evidence and the failed cold-capture probe

At source/probe `9a1191a5c340a9e052087dbc696bf8146f2b92aa`, Header Select workflow 37455595414 passed its actual WC/React/Vue/Vue2, family and theme checks. Artifact 11409549700 was downloaded and its archive hash matched GitHub. Three original images were inspected and published only on `evidence/pr-858-site`, evidence commit `61b05d2180434dc24782b92ccbcbdac9a0643859`; all three public HTTP downloads matched the original byte hashes. The corresponding development comment is #858 issuecomment-6015132725. User-private references were not published.

Production workflow 37455595512 separately recorded:

- Baseline 48b80f8b8: the open dark menu's language/social scopes still held light background/foreground inputs; actual pixels reproduced missing language text and white community surfaces.
- Candidate 9a1191a5: the same scopes matched the page's current dark palette through repeated switches. The 2048/390/430/320 journeys passed. Its two-RAF screenshots include transient color interpolation, so they are not labeled settled final composition. The repaired probe retains immediate captures and adds animation-settled captures.
- Local Runtime label: baseline text width 94px and height 40px (two 20px lines), candidate width 142px and height 20px at 2048/390/430. The real screenshot matches the label correction.
- Both cold-load cases exposed probe defects: Playwright waited for fonts/document completion while modules were intentionally held, and the inferred Card path was a 404. The correct source/build route is `/zh-cn/ui-libraries/brutalist/components/card/`. Baseline 14-pass/2-fail and candidate 13-pass/3-fail remain recorded failures; none are classified as product cold-load evidence. The correction checks HTTP 200, page title, loaded styles, viewport/DPR and source identity, then captures raw compositor PNG via CDP without modifying fonts/DOM/CSS or waiting for scripts to finish. Complete first-screen background/type/preview measurements accompany the new captures.

The latest Vercel attempt hit its daily deployment quota; an earlier Ready preview is not evidence for the current head. No account, plan, deployment or security setting was changed.

## Native material finding and bounded correction

Both homepage and Shadcn Dialog documentation genuinely painted `blur(4px)` with black/50 in the normal profile. Under actual emulated reduced-transparency and forced-colors inputs the same mask retained blur and half-alpha fill. This is measured behavior, including screenshots, rather than inference from a token list.

The existing Shadcn DialogMask now starts opaque and enhances only when the existing live reducedTransparency/no-preference, forcedColors/none and backdropBlur4px/true facts affirm it. Unknown or lost facts remain opaque. Rules own this policy in the reusable Base-derived Mask; no page override, new material API or lifecycle promotion is introduced. The finite alphaFill fact describes secondary/80 and is deliberately not generalized to black/50. Existing draft P/T records describe this correction and keep their draft status. Normal→reduced/forced/unknown→normal tests use the real WC projection and retain content/focus; four cases failed before the fix. Final native preference captures remain required.

Review follow-up: the initial Runtime label is neutral until the stored preference is read; the existing runtime canvas minimum now belongs to the stable host and loading reservation alike; the production-only workflow covers its actual website/Adapter/Prototype/Module/style dependencies. A suspected closed-details CSS conflict remains a native-check question, not a claimed reproduced defect. Locale fallback links are available during failed scripts as well as no-JS. Two focus findings and no-JS perpetual loading were already corrected in the prior commit.

Third candidate validation: 196 tests across 25 files passed, including the complete Shadcn test directory and affected Header/homepage/Select/preference suites. The three newly added saved-runtime bridge cases failed with wc before initialization was corrected, then passed for react/vue/vue2. Final workspace/docs types passed (450 docs files, zero errors/warnings, four existing hints). Prototype catalog, generated style manifests, package budgets and version-aware spec-authoring checks passed. The first spec-authoring attempt correctly rejected unversioned dependencies from the 0.2 Mask into newer preference contracts; the repaired relations start at 0.3.0-alpha.1. The tsx CLI's local IPC socket was unavailable; the same script ran through node --import tsx without that optional CLI server. Native first-screen/cold-capture and material restoration acceptance remain pending on the upcoming exact head.

Additional initial-host controls now cover `backdropBlur4px=false` and unavailable support as opaque outcomes: all six material cases pass. The first run exposed a HappyDOM fixture problem (its CSS getter returns a fresh object, so spying on one object did not intercept the host's support read); spying on the CSS prototype correctly exercises false and unavailable inputs. Final focused reruns pass 198 tests across 25 files (173 plus 25), including these controls. The source-scan re-review updates only ten changed-source bindings, preserves all owner/disposition sets, and explicitly binds the shared preference-key helper to the existing runtime-selection owners. No stable consumer-wall status is inferred.

The production graph gate independently reproduced the baseline's three WC bridge support-path omissions. PR #857 at `27331cebfc30565fd70835c26a32c64f838c5ca6` supplies the separately reviewed exact-path/module-edge repair and portable coverage checks. This dependency is integrated by a normal merge, preserving its original commits and authors; it is not a blanket allowlist or fingerprint bypass.

After dependency integration, all 198 focused tests passed again in one 25-file invocation; workspace/docs types passed again (450 files, 0 errors/warnings, 4 hints). Catalog, preset generation parity and versioned spec-authoring checks passed. A concurrent production build was terminated with exit 137 while rendering chunks, so it is recorded as an execution failure; a lower-concurrency retry is required before claiming the production graph gate passed.

The production retry completed with 284 pages and 279 indexed pages; the fresh production graph gate passed with source-owned lazy runtime consumers and three isolated demonstration runtimes. An independent limited review re-ran the current Select bridge, Mask material and startup source contracts (29/29) and found no bounded static blocker; it does not replace native first-screen or material-paint acceptance.

Final integrated coverage gate passed both source matrices and the complete portable negative-control suite: 2,400 passed, 0 failed, 1 capability-labeled skip (2,401 total). The mandatory real-decoder Linux integration is a separate unconditional CI entry under the integrated #857 workflow, not a portable skip presented as decoder evidence. The earlier pre-integration portable run failed five host-toolchain controls; its failure remains distinct from this passing integrated run.
