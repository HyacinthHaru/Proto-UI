# as-hook.v0.md (English)

> **Status**: Draft – v0 (contract-first) **Version**: v0
>
> This document defines the **Proto UI asHook contract**: asHook definition syntax, calling and dedupe rules, return shape, trace metadata, and merge strategy with module APIs.
>
> **Positioning (v0)**: an asHook is a "composable prototype form" used for logic reuse; it has no independent subjecthood, and its effects attach to the calling prototype.

---

## 0. Scope and Non-Goals

### 0.1 Scope (v0)

asHook in v0 provides:

- `defineAsHook(prototype)` to define an asHook prototype
- a unified input/output model for asHook callers
- dedupe rules
- a baseline return shape
- asHook trace metadata
- merge strategy between asHook effects and module APIs

### 0.2 Non-Goals (v0)

The following are **not** v0 goals:

- the concrete implementation architecture of asHook
- per-module dedupe/merge strategy details
- a unified token aggregation layer
- cross-language API design

---

## 1. Terms

- **asHook Prototype**: a prototype defined through `defineAsHook`.
- **Caller Prototype**: a prototype whose setup calls an asHook.
- **asHook Caller**: the function used to invoke an asHook.
- **Module Result**: a module-oriented field in an asHook return value.
- **disposer**: a function/handle that undoes a side effect.
- **handle**: a handle the caller may use.
- **asHook Trace**: readonly metadata describing applied asHooks.
- **Privileged asHook**: an official built-in asHook that may use internal APIs.

---

## 2. Definition and Naming

### 2.1 `defineAsHook(prototype)`

- Input: `prototype`, shaped like `definePrototype`.
- `setup` must return `RenderFn | void`.
- Output: an asHook prototype.
- Semantics:
  - asHook is still a prototype definition
  - its effects must attach to the calling prototype
  - it does not create an independent subject

### 2.1.1 Authored asHook configuration boundary

For ordinary authored asHooks in v0:

- `setup` receives only `def`
- `defineAsHook(...)` does not expose `mode`
- `defineAsHook(...)` does not expose `configure`
- the caller shape is no-arg

If an authored asHook needs setup-time configuration, the v0 direction is to expose a configuration API or handle through the first call's return value rather than passing options into repeated calls.

Parameterized authored asHooks remain future governed design space.

### 2.2 Naming Rule (v0, mandatory)

- `defineAsHook({ name })` records a prototype spec name and follows prototype naming rules, such as `as-dialog-content`.
- The author-facing caller binding should use the `asXxx` form, such as `asDialogContent`.
- Runtime cannot observe a JavaScript/TypeScript binding name, so caller-binding validation belongs to lint, CLI, generator, or TypeScript tooling rather than `defineAsHook({ name })` runtime validation.
- Violations must throw.

---

## 3. Caller and Invocation

### 3.1 Caller Shape (v0)

- asHook is invoked via a caller.
- The minimal form is:
  - `asX()`
- Named sub-callers are allowed:
  - `asX.mode()`

### 3.1.1 No-arg authored caller rule

Ordinary authored asHook callers are no-arg in v0:

- `asX()` is valid
- `asX(options)` is not part of the authored asHook contract

Privileged asHooks may define their own parameter and configuration shape in their own contracts.

### 3.2 Runtime Constraint

- an asHook caller may only be used during setup
- calling it during runtime must throw

---

## 4. Return Shape (`AsHookResult`)

### 4.1 Baseline Shape (v0)

`AsHookResult` is the runtime-synthesized result of the authored asHook setup frame, not the authored prototype setup result. It is also the default return value of the **asHook caller**.

This separates two return channels:

- the authored asHook `setup` keeps the same return channel as `definePrototype`: `RenderFn | void`
- `AsHookResult` is synthesized by the runtime after executing that setup and analyzing the setup frame
- the synthesized result may include categorized setup contributions, such as state handles, artifacts, cancellable setup effects and their disposers, and the setup render function when one was returned
- an authored asHook may declare `projectHandle(result)` to project that synthesized result into a custom caller handle

It must be an object and may contain:

- `props`
- `state`
- `context`
- `event`
- `feedback`
- `render`
- `asHooks`
- custom fields

Owned and Borrowed `state` contributions are projected as Borrowed views. An already Observed
view retains its read-only capabilities: capture must not add `setDefault` or `set`
(`C-STATE-0003-C`, `C-STATE-0009-D/E`, and the specific Focus fact boundary in
`C-AS-FOCUSABLE-0001-C`). Other Module handles retain their Module-owned capabilities.

### 4.1.1 Custom caller handle projection

- `projectHandle` is optional and does not alter the `setup` return channel
- it runs after capture and borrowed-state projection, and receives the synthesized `AsHookResult`
- its return value becomes the public caller result
- it runs only for the first once installation; repeated calls return the exact same projected handle
- runtime composition and diagnostic recording continue to use the synthesized artifacts, not the custom caller handle
- when the hook is nested, its child entry retains both `result` (the synthesized artifacts) and `handle` (the stable projected caller handle)

### 4.2 Module Result Constraints

- `state`
  - author-writable state handles introduced by asHook are projected as Borrowed handles
  - an Observed view stays Observed; capture is not a write-authority escalation
- other modules
  - should primarily return disposers
  - may also return module-specific handles/capabilities

### 4.3 Render Fragment

- if `render` exists, the caller may compose it into its render
- asHook does not directly trigger render commit
- current v0 coverage for consuming asHook render fragments is intentionally narrow; richer render-fragment composition remains a known fracture for future value-style prototypes

### 4.4 Child asHook Entries

- runtime records child asHook calls made directly inside the current asHook setup frame
- child entries are exposed through `asHooks` and may also be mirrored in `artifacts.asHooks`
- every child entry retains `result` as the runtime truth source and `handle` as the stable caller-facing projection; `getAsHookHandle(name)` retrieves the latter
- an authored asHook contract may declare an `asHooks` handle map so literal-name lookups infer the child handle type without a free generic assertion
- child state handles stay inside the child entry result; they are not flattened into the outer `stateHandles`
- an outer `projectHandle` may deliberately re-export selected child handles under a named field; the runtime does not automatically flatten, alias, or expose every nested capability
- prototype authors do not declare child entries through a `def` API

---

## 5. Merge Strategy

- all asHook-introduced module results attach to the caller prototype
- module-level conflict handling is owned by each module

---

## 6. Dedupe Rules

### 6.1 Default Rule

- within one call chain, repeated use of the same named asHook:
  - only the first application takes effect
  - later identical names are skipped
  - skipping must not throw

### 6.2 Exception: Configurable Privileged asHooks

v0 may define a class of **configurable privileged asHooks** (for example, a future focus system):

- installation is singleton-like
- repeated calls must not reinstall the same system capability
- repeated calls may still contribute setup-time configuration patches

For this class:

- runtime should reuse the same underlying handle / installation result
- newly supplied configuration should be merged deterministically according to the hook contract
- later configuration may override earlier configuration only for fields explicitly allowed to be late-configured
- unsafe conflicts must throw, or at minimum produce a clear warning

This exception does not apply to normal `defineAsHook(...)` products.

### 6.3 Authored configuration direction

Ordinary authored asHooks must not rely on repeated calls for configuration in v0. If configuration is needed, the first call should return a setup-only configuration API, handle, or equivalent hook-owned surface.

This keeps the repeat policy simple:

- install once
- reuse the first result
- make configuration explicit on the returned API

Future parameterized authored asHooks must define identity, mergeability, conflict diagnostics, result reuse, and setup/runtime phase rules in a separate contract before becoming stable.

---

## 7. Trace

- caller prototypes must retain readonly asHook trace metadata
- trace must contain at least:
  - asHook name
  - application order
  - privileged marker

---

## 8. Privileged asHooks

- privileged asHooks are not created by `defineAsHook`
- privileged asHooks may use internal APIs
- trace must mark them as privileged
- when a privileged asHook is configurable, its return handle should prefer exposing setup-only reconfiguration capability, or an equivalent configuration patch entry

---

## 9. Debt (v0 deferred)

- a unified token aggregation layer remains deferred
- v0 only requires disposers and handles
