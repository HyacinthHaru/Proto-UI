# Native built-preview probe for Issue 663

Run with Node 22 after the ordinary `apps/www` build and preview server are already ready. This script starts no server and changes no repository files or dependencies.

```sh
node probe-built-preview.mjs SOURCE_ROOT BASE_URL OUTPUT_DIR
```

`SOURCE_ROOT` is the exact checkout that produced `apps/www/dist`. The runner resolves its installed `playwright-core` from `apps/www/package.json`, uses the repository browser harness's Chrome/Chromium search locations, and honors `CHROME_PATH`. Windows example:

```powershell
node evidence/validation/www-source-paths/probe-built-preview.mjs "$PWD" http://127.0.0.1:4321 "$PWD/evidence-output"
```

The required route is `/en/ui-libraries/base/dialog/`. Served HTML must exactly match the local production HTML bytes; a dev server or a different build cannot count as success. Run the same script without modifications on baseline and candidate, using distinct output directories. Exit code 0 means all recorded checks/actions passed; 1 preserves failing observations; 2 is invalid CLI usage.

The primary case uses the initial WC demo. It records initial, after-open-input, open, after-close-input, and closed facts, with initial/open/closed viewport PNGs of the actual page. Portal Content/Mask are read from the real document; no iframe is assumed. Native Open Dialog/Cancel clicks drive the journey. Readiness waits observe actual entered/closed/detached states and body overflow, with an 8-second bound and no arbitrary sleep or forced transition completion. Failed waits and failed clicks retain screenshots and subsequent assertions.

Supplementary fresh pages exercise the existing View code Shadcn Button, then use the public Shadcn Select to request React and Vue and run the same Dialog assertions when the requested host is actually mounted. A failed runtime switch produces `runtime-unavailable` evidence; it does not count the remaining WC DOM as another host. Vue 2, other browsers, complete focus/accessibility/keyboard behavior, and development dependency optimization are outside this probe. Focus is observed, not treated as a full focus-conformance verdict.

Output:

- `report.json`: revision, source/runner/build hashes, environment, checks, actions, measured DOM/computed geometry/focus/body overflow, request/HTTP errors, scope and summary.
- `page-errors.json`, `console-errors.json`: all observed errors without filtering.
- `native-inputs.json`: passive event observations including `isTrusted`, event type and target; the listener never stops or changes input.
- `wc-initial.png`, `wc-open.png`, `wc-closed.png`: primary actual-component captures. React/Vue get matching state images when reached. Failed startup/runtime selection and the Button control have named diagnostic images.

Inspect every PNG before publication. Source paths or tool stack traces may require sanitization before upload; raw artifacts are local evidence, not automatically public material. Binding this probe to a genuine native Windows runner remains required to call its result Windows evidence.

The unchanged runner passed a POSIX normal control at clean `9eb93e9ba96fe1f88e9dade194fa838fbdc2c18f` on 2026-09-21 23:19 UTC: Node 22.23.2, macOS arm64, Chrome 153.0.8010.53, Playwright 1.58.2, 1440×1000. All 58 checks passed with zero page/console errors, and WC/React/Vue actually mounted and completed native open/Cancel. All ten resulting PNGs were visually inspected. Raw results and scope are in `posix-baseline/`; this control does not establish the Windows defect or its repair.

## Separate build-graph diagnostic

The native baseline run uses the ordinary production build and browser probe. A subsequent `PUI_CAPTURE=graph` run skips that browser journey and inspects the unchanged source in a separate diagnostic build. `build-observed.mjs` uses Astro's public build API with the normal discovered config and one read-only Vite observer; it records SSR and client graphs separately, precise Core internal IDs, physical files, importers and retained module lengths. Separate SSR/client instances are not duplicate client context stores.

`snapshot-assets.mjs` preserves emitted JS/CSS bytes, while `compare-assets.mjs` compares exact asset paths, sizes and hashes. A mismatch remains in its receipt and the output is described as a diagnostic variant. POSIX controls showed seven chunks can differ even between two ordinary builds through minified export alias ordering; one observed build matched a subsequent ordinary build across all 1,945 assets. This does not establish universal deterministic equality. Full ordinary browser evidence remains required for a candidate.
