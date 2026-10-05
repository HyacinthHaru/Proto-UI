# Search module preparation on public Button intent

## Scope and ownership

This product candidate starts from `4a2320762ba5f4319dec1915ca4e138772dceb0c`. It changes only the Search service and its existing command composition, with additive tests and a separate source-matched measurement lane. It does not change SSR markup, native dialog behavior, Pagefind rendering, command activation, or the existing 1000 ms opener-readiness gate.

The command composition consumes `hovered` and `focusVisible` through `DemoRuntimeApi.getExposes()`. These are the existing draft `P-BASE-BUTTON` public facts (`P-BASE-BUTTON-POINTER-HOVER`, `P-BASE-BUTTON-FOCUSABLE`), read through draft `C-EXPOSE-STATE-0001`'s external state subscription. No lifecycle admission or new Prototype is proposed. The callback defers service work out of the state callback and checks both command lifetime and active projection ownership. Retired projections unsubscribe. No website-local pointer/focus detector or second interaction state machine is added.

The Search custom element retains one preparation promise for the HEAD index probe, runtime import, and default-UI import. Success remains reusable across command-runtime changes and close/reopen. A deliberate public intent begins only that module work; it neither opens the dialog nor constructs a Pagefind instance, changes failure UI, or focuses anything. There is no idle or unconditional startup preparation.

Actual open uses the same promise, then checks the current native-dialog open session before constructing Pagefind UI. Close invalidates pending UI continuations without discarding useful modules. Disposal aborts the probe and rejects pending imports' waits; an obsolete owner cannot construct or focus into a reconnected service. A failed preparation is handled silently, clears its own promise by identity, and does not schedule retries. A subsequent intent or actual open can retry; failure during actual open still exposes the normal explicit Retry command.

Shortcut and touch opens do not require prior preparation. This candidate makes no claim that no-lead opens, query work, reopening, or whole-page startup become faster.

## Executed local evidence

- Added the first five intent/lifetime tests before the product patch. Against the unchanged baseline product, all five failed and all 30 pre-existing tests passed. This is behavioral red evidence, not a module-resolution failure.
- After the patch and added failure/projection checks, the four Search test files pass 82/82: the actual command Buttons and adapters remain real; Pagefind/network/native dialog are controlled service doubles. Coverage includes both Shadcn/Brutalist across WC, React, Vue and Vue2, keyboard focus, deduplication, silent HEAD/runtime/UI failure, retry, close/reopen, retirement, and disconnect/reconnect.
- One pre-existing Retry-close assertion expected hidden Pagefind construction after closing. It now requires no construction until reopen, with the same prepared modules and one instance. This is the intended ownership change, not a relaxed readiness assertion.
- Projection-scope and homepage-runtime integration: 61/61 passed. Base Button lifetime/asButton and command-icon dependency checks: 18/18 passed.
- `check:types`: passed, 0 errors and 3 existing informational hints. The initial invocation stopped at the executor's unavailable default Astro configuration directory; the successful invocation used a writable configuration directory and disabled telemetry.
- `check:prototype-catalog`: passed. `git diff --check`: passed.

These tests establish controlled state transitions, not real browser latency or trusted input performance. The source-matched CI lane is separately required to check no-intent startup, intent lead, immediate open, semantic query/reopen, HEAD503/retry, and interrupted lifetimes. The original browser opener gate remains unchanged and independently required. Hosted screenshots and exact-head measurements remain pending; no old screenshot is used as this candidate's output.

## Bounded same-tree measurement lane

`.github/workflows/search-intent-ab.yml` builds the same candidate tree twice. The counterfactual replaces only `Search.astro` and `site-search-commands.ts` with pinned `4a232076` bytes. Before measurement it rejects unrelated tracked drift and unequal generated Pagefind/index/default-UI bytes. The 42 attempts cover immediate open, pointer/focus lead, no-intent startup, touch, HEAD503 retry, failed-intent recovery, pending close/disposal, query and reopen. `search-intent-ab-<run>-<attempt>` retains source/build boundaries, raw samples, screenshots, failures and descriptive distributions. The workflow retains the existing 35-minute diagnostic envelope and does not rerun historical application trees or alter acceptance budgets. Before any hosted execution, independent review caught and repaired three probe defects: missing CDP completion-clock mapping, inclusion of invalid finite sample metrics in natural distributions, and a DOM guard anchored to the command instead of actual native-dialog opening. Nineteen no-browser controls now cover those failures and the source/index/lifetime assertions. Hosted measurements have not yet run.

## Review and publication boundaries

A fresh-context independent local product review found no confirmed defect. Its 23 extra cold-keyboard, no-lead shortcut, import-timeout, late-resolution/rejection and repeated-intent cases were incorporated into the Search result above. Measurement-lane review and hosted validation remain separate. Formal GitHub comment/review/integration remains blocked while the governed CLI has no authenticated session. Source publication, if performed, uses the authorized contributor identity and exact source tree; it does not constitute approval or merge readiness. No historical measurement report is reproduced in this product record.
