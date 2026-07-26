# Avatar-Onward Full Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every failed component added from Avatar onward with protocol-complete Base atoms and Library compositions, each delivered through spec-first vertical slices.

**Architecture:** Base owns reusable semantics and adapter contracts; Brutalist/Shadcn only project visual feedback. Library components compose Base atoms for ChatUI semantics. Every family lands with P/T entities, focused tests, package exports, generated CSS validation, real demos, bilingual docs, browser evidence, commit, and a concise PR note.

**Tech Stack:** TypeScript, Proto UI core/runtime/modules, Base prototypes, Brutalist/Shadcn styled prototypes, Vitest, Astro/Starlight docs, PrototypePreviewer, generated CLI style CSS.

**Design record:** `internal/records/2026-07-26-avatar-onward-full-rewrite-design.zh-CN.md`

---

## Global execution rules

- Work only in `/home/ezra/Documents/Proto-UI/.worktrees/brutalist-design-system` on `feat/brutalist-design-system`.
- Do not preserve failed APIs from the broken Avatar-onward implementation as compatibility targets.
- No shims, aliases, deprecated exports, or empty placeholder spec entities.
- No `unsupported Proto UI style tokens` comments for any family being rewritten.
- No family is complete until all gates in its completion command pass.
- Commit after each task; post one concise PR comment after each family batch. No emoji, no dramatized status.

### Family completion command

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test packages/prototypes/brutalist/test packages/prototypes/shadcn/test packages/adapters/web-component/test \
  && corepack pnpm@10.32.1 check:styles:preset
```

Expected: exit 0. The pre-existing `packages/web-conformance/test/shadcn-dialog.journey.test.ts` React/Vue dependency failure may appear during full-suite runs; document it as pre-existing only if the focused command above passes.

### Browser evidence gate

For every family with a demo page: reuse the Hub `pr323-dev` process, open the route at `http://localhost:4321` via the Browser tool, and verify page title is not `Error`, no `[Preview Error]` text exists, expected interactive host elements exist (`input`, `textarea`, real button, real scroll container), and expected computed styles are present (2px border and hard shadow for Brutalist). Record exact URL and observed DOM/style evidence in the batch PR note.

---

## File structure

### Protocol implementation

- Base family sources: `packages/prototypes/base/src/<family>/`
- Brutalist projections: `packages/prototypes/brutalist/src/<family>/`
- Shadcn projections where in scope: `packages/prototypes/shadcn/src/<family>/`
- Package exports: each library's `package.json` `exports` map plus `src/index.ts`

### Tests

- Base behavior tests: `packages/prototypes/base/test/<family>.test.ts`
- Styled projection tests: `packages/prototypes/{brutalist,shadcn}/test/<family>.test.ts`
- Demo/adapter integration: `packages/adapters/web-component/test/`

### Spec and docs

- P entities: `spec/prototypes/P-{BASE,BRUTALIST,SHADCN}-*.yaml`
- T entities: `spec/tests/T-*-0001.yaml`
- Debt baseline: `internal/baselines/prototype-catalog-debt.json`
- Docs: `apps/www/src/content/docs/{en,zh-cn}/ui-libraries/<library>/components/<family>.mdx`
- Demos: `apps/www/src/content/docs/zh-cn/demo-<library>-<family>.demo.ts`
- Previewer: `apps/www/src/components/PrototypePreviewer/prototype-modules.ts`
- Sidebar: `apps/www/astro.config.mjs`

---

## Task 0: Native Control host protocol prerequisite

**Why this prerequisite exists:** `C-TEMPLATE-0001` keeps the adapter-owned Root Node outside template output, while `C-TEMPLATE-0002` and `C-TEMPLATE-0003` keep Template v0 structural and style-only. A real Input therefore cannot project native control properties or editing events through `TemplateProps`. The approved solution is a business-neutral host capability; Template v0 remains unchanged.

**Phase 1 scope:**

- A static, typed, unique module declaration on `Prototype` lets adapters select the physical control before the first render. The declaration is authored once and reused by concrete styled prototypes; applications never configure Input through adapter `rootTag` options.
- The Native Control module owns adapter-independent patches, normalized `input`/`change`/composition events, deferred controlled-value reconciliation, uncontrolled dirty-value retention, and mount-epoch host leases.
- React and Vue map the declared control to their native Root Node. Web Component retains its custom-element Root Node and creates one adapter-owned inner native control outside Template children.
- Focus, a11y, and style projection target the physical native control. The custom-element shell remains the component and event ownership root.
- Phase 1 supports `value`, `defaultValue`, `disabled`, `readOnly`, `required`, `fieldName`, `controlType`, `placeholder`, `autoComplete`, `minLength`, `maxLength`, `rows`, and `wrap`.

**Explicit non-goals:** ElementInternals form association, form submission/validation/reset/restore, delegated labels, FileList/multiple/accept, and Form-family coordination belong to a separate `C-FORM-ASSOCIATED-CONTROL-*` slice. Phase 1 must not claim Web Component form participation.

**Protocol entities:**

- Create: `spec/contracts/C-NATIVE-CONTROL-0001.yaml`
- Create: `spec/host-caps/HC-NATIVE-CONTROL-0001.yaml`
- Create: `spec/modules/M-NATIVE-CONTROL-0001.yaml`
- Create: `spec/tests/T-NATIVE-CONTROL-0001.yaml`

**Core/runtime files:**

- Modify: `packages/core/src/prototype.ts`
- Modify: `packages/core/src/module/types.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/src/native-control.ts`
- Modify: `packages/runtime/src/orchestrator/module-orchestrator/runtime-module-orchestrator.ts`
- Modify: `packages/runtime/src/instance/instance.ts`
- Modify: `packages/runtime/package.json`
- Test: `packages/core/test/contract/prototype.module-declarations.v0.contract.test.ts`
- Test: `packages/runtime/test/contract/native-control.v0.contract.test.ts`

**Native Control module and hook:**

- Create: `packages/modules/native-control/package.json`
- Create: `packages/modules/native-control/src/{index,caps,types,create,impl,web}.ts`
- Test: `packages/modules/native-control/test/impl-spec.test.ts`
- Create: `packages/hooks/src/as-native-control.ts`
- Modify: `packages/hooks/src/index.ts`
- Modify: `packages/hooks/package.json`

**Adapter files:**

- Modify: `packages/adapters/{react,vue,web-component}/src/adapt.ts`
- Modify: `packages/adapters/{react,vue,web-component}/src/runtime/modules.ts`
- Modify: `packages/adapters/web-component/src/runtime/session.ts` only where needed to preserve adapter-owned control infrastructure across template commits.
- Modify: `packages/adapters/{react,vue,web-component}/package.json`
- Test: `packages/adapters/{react,vue,web-component}/test/native-control.integration.test.ts`

- [ ] **Step 1: RED — write module declaration and Native Control behavior tests**

Cover fail-fast duplicate declaration IDs, immutable lookup, setup-only singleton declaration, callback-only synchronization, absent host-cap retention, lease replacement/disposal, controlled proposal then deferred restore, uncontrolled dirty-value retention across view epochs, IME-safe reconciliation, distinct change delivery, and terminal cleanup.

- [ ] **Step 2: RED — write adapter integration tests**

Prove React/Vue materialize the declared native root; Web Component keeps the custom-element Root Node and owns exactly one inner native target; all adapters project Phase 1 properties and normalize each native event once; focus/a11y/style point to the physical target; teardown revokes listeners. Keep all existing Template contract tests unchanged.

- [ ] **Step 3: Verify RED**

```bash
corepack pnpm@10.32.1 exec vitest run \
  packages/core/test/contract/prototype.module-declarations.v0.contract.test.ts \
  packages/modules/native-control/test/impl-spec.test.ts \
  packages/runtime/test/contract/native-control.v0.contract.test.ts \
  packages/adapters/react/test/native-control.integration.test.ts \
  packages/adapters/vue/test/native-control.integration.test.ts \
  packages/adapters/web-component/test/native-control.integration.test.ts
```

Expected: FAIL because static module declarations, the Native Control module/capability, and adapter bridges do not exist.

- [ ] **Step 4: Implement static module declarations**

Add separate `ModuleDeclarationToken<T>` and `PrototypeModuleDeclaration<T>` types rather than reusing dynamic `CapToken`. Core exports `moduleDeclaration(tokenId)`, `declareModule(token, config)`, and `getModuleDeclaration(prototype, token)`. `definePrototype()` must freeze declarations and reject duplicate token IDs. Runtime copies the immutable declaration view into `ModuleInit`; adapters use the same lookup helper before the first render.

- [ ] **Step 5: Implement the Native Control module and hook**

The module retains the latest logical patch, value mode, uncontrolled dirty value, listener registrations, and composition state. Adapter caps lease only physical targets/listeners. Controlled restoration runs after the outermost callback and waits for `compositionend`; equal value writes do not disturb selection. `asNativeControl()` is privileged and fails when the matching static declaration is absent.

- [ ] **Step 6: Implement adapter bridges**

React/Vue derive their physical root from the prototype declaration and reject conflicting `rootTag`. Web Component creates the native target as adapter-owned host infrastructure, never as a Template Node. Inner native events must not leak and then re-emit as duplicates. No adapter spreads arbitrary prototype props onto DOM nodes.

- [ ] **Step 7: GREEN — run focused tests and catalog validation**

```bash
corepack pnpm@10.32.1 exec vitest run \
  packages/core/test/contract/prototype.module-declarations.v0.contract.test.ts \
  packages/modules/native-control/test/impl-spec.test.ts \
  packages/runtime/test/contract/native-control.v0.contract.test.ts \
  packages/adapters/react/test/native-control.integration.test.ts \
  packages/adapters/vue/test/native-control.integration.test.ts \
  packages/adapters/web-component/test/native-control.integration.test.ts \
  packages/core/test/contract/template.authoring-fixture.v0.contract.test.ts \
  packages/core/test/contract/template.renderer-primitives.v0.contract.test.ts \
  packages/adapters/web-component/test/commit.test.ts \
  && corepack pnpm@10.32.1 check:prototype-catalog
```

Expected: exit 0. The unchanged Template tests prove the prerequisite did not widen Template v0.

- [ ] **Step 8: Commit and push**

```bash
git add packages/core packages/modules/native-control packages/hooks packages/runtime packages/adapters spec pnpm-lock.yaml docs/superpowers/plans/2026-07-26-avatar-onward-full-rewrite.md
git commit -m "feat: add native control host protocol"
git push
```

---

## Task 1: Input Base protocol

**Files:**

- Create: `spec/prototypes/P-BASE-INPUT.yaml`
- Create: `spec/tests/T-BASE-INPUT-0001.yaml`
- Modify: `packages/prototypes/base/src/input/types.ts`
- Modify: `packages/prototypes/base/src/input/root.proto.ts`
- Modify: `packages/prototypes/base/src/input/index.ts`
- Test: `packages/prototypes/base/test/input.test.ts`

- [ ] **Step 1: Write the failing Base behavior test**

Replace `packages/prototypes/base/test/input.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import inputRoot from '../src/input';

AdaptToWebComponent(inputRoot as any);

describe('prototypes/base: input', () => {
  it('edits value through a real input host and emits input/change events', async () => {
    const el = document.createElement('base-input-root') as any;
    const seen: Array<{ type: string; value: string }> = [];
    el.addEventListener('input', (e: Event) =>
      seen.push({ type: 'input', value: (e as CustomEvent).detail?.value })
    );
    el.addEventListener('change', (e: Event) =>
      seen.push({ type: 'change', value: (e as CustomEvent).detail?.value })
    );
    setElementProps(el, { defaultValue: 'initial', placeholder: 'Search' });
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();

    const host = el.querySelector('input') as HTMLInputElement;
    expect(host).not.toBeNull();
    expect(host.value).toBe('initial');
    expect(host.placeholder).toBe('Search');

    host.value = 'rewritten';
    host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    host.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    expect(el.getExposes().value.get()).toBe('rewritten');
    expect(seen.some((s) => s.type === 'input' && s.value === 'rewritten')).toBe(true);
    el.remove();
  });

  it('does not overwrite a controlled value internally', async () => {
    const el = document.createElement('base-input-root') as any;
    setElementProps(el, { value: 'controlled' });
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();

    const host = el.querySelector('input') as HTMLInputElement;
    host.value = 'attempt';
    host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    await Promise.resolve();

    expect(el.getExposes().value.get()).toBe('controlled');
    expect(host.value).toBe('controlled');
    el.remove();
  });

  it('projects disabled, readOnly, required, name, and type onto the host', async () => {
    const el = document.createElement('base-input-root') as any;
    setElementProps(el, {
      disabled: true,
      readOnly: true,
      required: true,
      name: 'q',
      type: 'search',
    });
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();

    const host = el.querySelector('input') as HTMLInputElement;
    expect(host.disabled).toBe(true);
    expect(host.readOnly).toBe(true);
    expect(host.required).toBe(true);
    expect(host.name).toBe('q');
    expect(host.type).toBe('search');
    el.remove();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/input.test.ts
```

Expected: FAIL — current protocol lacks real-host editing, controlled semantics, and full host projection.

- [ ] **Step 3: Write protocol entities**

Create `spec/prototypes/P-BASE-INPUT.yaml`:

```yaml
id: P-BASE-INPUT
type: prototype
title: Base Input protocol
status: draft
since: 0.2.0-rc.5
summary: Base Input defines the single-line editable text protocol.
statement:
  en: Base Input owns single-line editing semantics, real host translation, controlled value rules, focus, disabled, readOnly, and input/change events.
  zh-CN: Base Input 拥有单行编辑语义、真实 host 翻译、受控 value 规则、focus、disabled、readOnly 与 input/change 事件。
criteria:
  - id: P-BASE-INPUT-REAL-HOST-EDITING
    text:
      en: The adapter maps Input Root to a real input host and preserves native text editing behavior.
      zh-CN: Adapter 将 Input Root 映射为真实 input host，并保留原生文本编辑行为。
  - id: P-BASE-INPUT-CONTROLLED-VALUE
    text:
      en: Controlled value changes emit events without being overwritten internally.
      zh-CN: 受控 value 变更只发出事件，不被内部状态覆盖。
  - id: P-BASE-INPUT-HOST-PROJECTION
    text:
      en: disabled, readOnly, required, name, type, placeholder, and autocomplete project through the host contract.
      zh-CN: disabled、readOnly、required、name、type、placeholder 与 autocomplete 通过 host contract 投影。
sources:
  - path: packages/prototypes/base/src/input/root.proto.ts
revisions:
  - version: 0.2.0-rc.5
    change: rewritten
    summary: Rewrote Base Input as a real single-line editing protocol.
tags:
  - prototype
  - base
verifies:
  tests:
    - T-BASE-INPUT-0001
```

Create `spec/tests/T-BASE-INPUT-0001.yaml` linking `packages/prototypes/base/test/input.test.ts` and exercising `P-BASE-INPUT`, following the schema of `spec/tests/T-BASE-MESSAGE-0001.yaml`.

- [ ] **Step 4: Rewrite Base Input implementation**

Update `types.ts`:

```ts
import type { ExposeState, State } from '@proto.ui/core';

export interface InputRootProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
}

export type InputRootStateHandles = {
  value: State<string>;
  disabled: State<boolean>;
  readOnly: State<boolean>;
  focusVisible: State<boolean>;
};

export type InputRootExposes = {
  value: ExposeState<string>;
  disabled: ExposeState<boolean>;
  readOnly: ExposeState<boolean>;
  focusVisible: ExposeState<boolean>;
  focus: () => void;
  blur: () => void;
};

export type InputRootAsHookContract = {
  state: InputRootStateHandles;
};
```

Rewrite `root.proto.ts` following the Base Button/Checkbox patterns: `asFocusable()`, `def.props.define`, controlled/uncontrolled value ownership with `run.expose.emit('input', { value })` / `run.expose.emit('change', { value })`, `def.a11y.state('disabled', ...)`, and host attribute projection through the adapter's host contract. Study `packages/prototypes/base/src/button/button.proto.ts` and `packages/prototypes/base/src/checkbox/root.proto.ts` for exact DefHandle API usage before writing.

- [ ] **Step 5: Run focused checks**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/input.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add spec/prototypes/P-BASE-INPUT.yaml spec/tests/T-BASE-INPUT-0001.yaml packages/prototypes/base/src/input packages/prototypes/base/test/input.test.ts
git commit -m "feat(base): rewrite input protocol"
```

---

## Task 2: Textarea Base protocol

**Files:**

- Create: `spec/prototypes/P-BASE-TEXTAREA.yaml`
- Create: `spec/tests/T-BASE-TEXTAREA-0001.yaml`
- Modify: `packages/prototypes/base/src/textarea/types.ts`
- Modify: `packages/prototypes/base/src/textarea/root.proto.ts`
- Modify: `packages/prototypes/base/src/textarea/index.ts`
- Test: `packages/prototypes/base/test/textarea.test.ts`

- [ ] **Step 1: Write failing tests**

Cover: real textarea host, multi-line value, Enter produces newline (no submit), `rows`/`wrap` host projection, controlled/uncontrolled, disabled/readOnly, input/change events, IME composition not interrupted.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/textarea.test.ts
```

- [ ] **Step 3: Write P/T entities**

Same complete schema as Task 1. Criteria: real host editing, controlled value, multi-line keyboard behavior, rows/wrap projection, resize exclusion from Base (styled/host policy only).

- [ ] **Step 4: Rewrite Base Textarea**

Mirror Task 1's Input protocol with a real textarea host mapping. Include `rows` and `wrap` props. Do not put resize behavior in Base.

- [ ] **Step 5: Run focused checks**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/textarea.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
```

- [ ] **Step 6: Commit**

```bash
git add spec/prototypes/P-BASE-TEXTAREA.yaml spec/tests/T-BASE-TEXTAREA-0001.yaml packages/prototypes/base/src/textarea packages/prototypes/base/test/textarea.test.ts
git commit -m "feat(base): rewrite textarea protocol"
```

---

## Task 3: Separator and Skeleton Base protocols

**Files:**

- Create: `spec/prototypes/P-BASE-SEPARATOR.yaml`, `spec/prototypes/P-BASE-SKELETON.yaml`
- Create: `spec/tests/T-BASE-SEPARATOR-0001.yaml`, `spec/tests/T-BASE-SKELETON-0001.yaml`
- Modify: `packages/prototypes/base/src/separator/{types,root.proto,index}.ts`
- Modify: `packages/prototypes/base/src/skeleton/{types,root.proto,index}.ts`
- Test: `packages/prototypes/base/test/{separator,skeleton}.test.ts`

- [ ] **Step 1: Write failing tests**

Separator: decorative mode absent from the accessibility tree; semantic mode exposes separator role with correct `aria-orientation`; no focus/event. Skeleton: `aria-hidden=true`, no interactive state, no fake loading announcement.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/separator.test.ts packages/prototypes/base/test/skeleton.test.ts
```

- [ ] **Step 3: Write P/T entities**

Separator criteria: orientation, decorative a11y behavior, no interaction. Skeleton criteria: aria-hidden default, no state/events, reduced-motion belongs to styled policy.

- [ ] **Step 4: Implement minimal protocols**

Separator: `orientation` prop, `decorative` prop (default true), `def.a11y` only for semantic mode. Skeleton: anatomy claim only, `aria-hidden=true`, no props/state/events.

- [ ] **Step 5: Run checks**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/separator.test.ts packages/prototypes/base/test/skeleton.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
```

- [ ] **Step 6: Commit**

```bash
git add spec/prototypes spec/tests packages/prototypes/base/src/separator packages/prototypes/base/src/skeleton packages/prototypes/base/test/separator.test.ts packages/prototypes/base/test/skeleton.test.ts
git commit -m "feat(base): rewrite separator and skeleton protocols"
```

---

## Task 4: Brutalist projections for Tasks 1–3, package surfaces, styled entities

**Files:**

- Modify: `packages/prototypes/brutalist/src/{input,textarea,separator,skeleton}/*`
- Create: `spec/prototypes/P-BRUTALIST-{INPUT,TEXTAREA,SEPARATOR,SKELETON}.yaml` + matching T entities
- Modify: `packages/prototypes/base/package.json`, `packages/prototypes/brutalist/package.json`
- Test: `packages/prototypes/brutalist/test/{input,textarea,separator,skeleton}.test.ts`

- [ ] **Step 1: Rewrite Brutalist tests**

Each test must use the real adapted host: typeable input/textarea, correct orientation separator, inert skeleton; plus Brutalist style assertions via `styleContains` for tokens that have generated CSS support.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/input.test.ts packages/prototypes/brutalist/test/textarea.test.ts packages/prototypes/brutalist/test/separator.test.ts packages/prototypes/brutalist/test/skeleton.test.ts
```

- [ ] **Step 3: Implement styled projections**

Each projection calls the corresponding Base hook and applies Brutalist visual tokens only: square geometry, 2px ink border, paper/canvas surface, focus ring, disabled/readOnly feedback, hard shadow. Every authored token must exist in `packages/cli/src/services/proto-style-css.ts` `staticUtilities` or the token compiler; add missing entries there if needed.

- [ ] **Step 4: Add family subpath exports**

Ensure `exports` maps in both manifests expose `./input`, `./textarea`, `./separator`, `./skeleton`, and `src/index.ts` files export the families. Remove old broken export shapes.

- [ ] **Step 5: Run family completion command**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test packages/prototypes/brutalist/test \
  && corepack pnpm@10.32.1 check:styles:preset
```

- [ ] **Step 6: Commit**

```bash
git add packages/prototypes spec
git commit -m "feat(prototypes): rewrite base and brutalist field atoms"
```

---

## Task 5: Field atom demos, docs, and browser evidence

**Files:**

- Modify: `apps/www/src/content/docs/zh-cn/demo-brutalist-{input,textarea,separator,skeleton}.demo.ts`
- Modify: `apps/www/src/components/PrototypePreviewer/prototype-modules.ts`
- Modify: `apps/www/src/content/docs/{en,zh-cn}/ui-libraries/brutalist/components/{input,textarea,separator,skeleton}.mdx`
- Modify: `apps/www/src/content/docs/{en,zh-cn}/ui-libraries/brutalist/components/index.mdx`
- Test: `packages/adapters/web-component/test/previewer.demo-renderer.test.ts`

- [ ] **Step 1: Extend demo integration tests**

Assert each demo spec passes `assertDemoSpec` and each prototype ID used resolves via `loadPrototype`.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/adapters/web-component/test/previewer.demo-renderer.test.ts
```

- [ ] **Step 3: Rewrite demos**

Input/Textarea demos typeable with real hosts. Separator demo: horizontal plus a real vertical orientation inside a flex row. Skeleton demo: normal and reduced-motion-safe presentation. Plain string text nodes only.

- [ ] **Step 4: Rewrite bilingual docs**

Document only implemented semantics. No claims about labels, validation groups, or loading announcements. zh-cn copy in Chinese.

- [ ] **Step 5: Browser evidence**

Hub `pr323-dev`; Browser tool; verify all 4 components in both locales: non-Error title, no `[Preview Error]`, expected host elements, 2px border/hard-shadow computed styles where applicable.

- [ ] **Step 6: Commit and PR note**

```bash
git add apps/www packages/adapters/web-component/test
git commit -m "docs(brutalist): rewrite field atom demos and docs"
gh pr comment 323 --body "Field atom batch: Input, Textarea, Separator, Skeleton. Protocol entities, focused tests, package exports, real demos, bilingual docs, browser evidence. Verification: check:prototype-catalog OK; focused Vitest passes with zero failures; styles:preset OK; browser routes verified for en/zh-cn."
```

---

## Task 6: Avatar Base protocol

**Files:**

- Create: `spec/prototypes/P-BASE-AVATAR*.yaml` and matching T entities
- Modify: `packages/prototypes/base/src/avatar/*`
- Test: `packages/prototypes/base/test/avatar.test.ts`

- [ ] **Step 1: Write failing tests**

Cover load → loaded, load → error, fallback materialization, `src` change reset, delayed fallback cleanup, and non-duplicated accessible identity.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/avatar.test.ts
```

- [ ] **Step 3: Write root/image/fallback P/T entities**

Criteria must define Root context ownership, Image load/error events, Fallback materialization/delay, src reset, alt ownership, and timer cleanup. Do not add presence, click, menu, or user-status semantics.

- [ ] **Step 4: Implement Base Avatar**

Root owns `idle | loading | loaded | error` state and context; Image projects real image props and reports host load/error; Fallback consumes context and manages optional delay with teardown cleanup.

- [ ] **Step 5: Run checks**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/avatar.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
```

- [ ] **Step 6: Commit**

```bash
git add spec/prototypes/P-BASE-AVATAR*.yaml spec/tests/T-BASE-AVATAR*.yaml packages/prototypes/base/src/avatar packages/prototypes/base/test/avatar.test.ts
git commit -m "feat(base): rewrite avatar protocol"
```

---

## Task 7: Badge and Card Base protocols

**Files:**

- Create: `spec/prototypes/P-BASE-BADGE.yaml`, `spec/prototypes/P-BASE-CARD*.yaml`
- Create: matching T entities
- Modify: `packages/prototypes/base/src/{badge,card}/*`
- Test: `packages/prototypes/base/test/{badge,card}.test.ts`

- [ ] **Step 1: Write failing tests**

Badge: non-interactive tone semantics, no accidental live region. Card: root/header/title/description/action/content/footer anatomy, stable title/description associations, no false interactive role, real Button composition inside Action.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/badge.test.ts packages/prototypes/base/test/card.test.ts
```

- [ ] **Step 3: Write complete P/T entities**

Badge Base accepts `tone: neutral | info | success | warning | critical`; visual variants remain Library-only. Card has a P entity per part and criteria prohibiting implicit click/open/selection.

- [ ] **Step 4: Implement protocols**

Keep both behavior-minimal and semantically exact. Card establishes anatomy/domain and stable relationships; Action is only a region for composed interactive protocols.

- [ ] **Step 5: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/badge.test.ts packages/prototypes/base/test/card.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
git add spec/prototypes spec/tests packages/prototypes/base/src/badge packages/prototypes/base/src/card packages/prototypes/base/test/badge.test.ts packages/prototypes/base/test/card.test.ts
git commit -m "feat(base): rewrite badge and card protocols"
```

---

## Task 8: Brutalist Avatar/Badge/Card, package surfaces, demos, docs

**Files:**

- Modify: `packages/prototypes/brutalist/src/{avatar,badge,card}/*`
- Create/update: styled P/T entities
- Modify: Base/Brutalist package exports and root indexes
- Modify: corresponding demos, bilingual docs, component index, preview registrations
- Test: Base/Brutalist focused tests and previewer integration

- [ ] **Step 1: Write failing projection tests**

Avatar: switch success/error visibly. Badge: tone styling without button affordance. Card: structured layout and Action containing a real Base/Brutalist Button.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/avatar.test.ts packages/prototypes/brutalist/test/badge.test.ts packages/prototypes/brutalist/test/card.test.ts
```

- [ ] **Step 3: Implement projections and generated CSS support**

Use square crop/surface, 2px ink border, hard shadows, semantic tone colors, and responsive Card layout. Every token must compile; extend `packages/cli/src/services/proto-style-css.ts` and its tests only for genuinely reusable tokens.

- [ ] **Step 4: Rewrite demos and bilingual docs**

Real image success/failure, non-interactive tone labels, Card action Button. Chinese demo copy in Chinese. Add all three to component indexes.

- [ ] **Step 5: Browser evidence**

Verify both locales, dark/light, long Card content, narrow viewport, and computed styles. No wrapper CSS may fake the component border/shadow.

- [ ] **Step 6: Completion command, commit, PR note**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/avatar.test.ts packages/prototypes/base/test/badge.test.ts packages/prototypes/base/test/card.test.ts packages/prototypes/brutalist/test/avatar.test.ts packages/prototypes/brutalist/test/badge.test.ts packages/prototypes/brutalist/test/card.test.ts packages/adapters/web-component/test/previewer.demo-renderer.test.ts \
  && corepack pnpm@10.32.1 check:styles:preset
git add packages spec apps/www internal/baselines/prototype-catalog-debt.json
git commit -m "feat(prototypes): rewrite media and content surface atoms"
gh pr comment 323 --body "Media/content atom batch: Avatar, Badge, Card. Protocol entities, tests, package exports, generated CSS, demos, bilingual docs, browser evidence. Verification: paste the exact command outputs and browser observations from this batch."
```

---

## Task 9: ScrollArea Base protocol

**Files:**

- Create: `spec/prototypes/P-BASE-SCROLL-AREA*.yaml` and T entities
- Modify: `packages/prototypes/base/src/scroll-area/*`
- Test: `packages/prototypes/base/test/scroll-area.test.ts`

- [ ] **Step 1: Write failing tests**

Cover real viewport scrolling, thumb drag synchronization, track click, Arrow/Page/Home/End keyboard controls, resize, horizontal/vertical/dual-axis, RTL, visibility modes, and observer/pointer cleanup.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/scroll-area.test.ts
```

- [ ] **Step 3: Write root/viewport/scrollbar/thumb/corner P/T entities**

Criteria must define context relation, native-scroll preservation, normalized offsets, accessible scrollbar values, and materialization rules.

- [ ] **Step 4: Implement Base ScrollArea**

Use anatomy/context, real host scroll events, resize observation, pointer capture, and RTL normalization. Do not simulate a scroll container with state-only boxes.

- [ ] **Step 5: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/scroll-area.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
git add spec/prototypes/P-BASE-SCROLL-AREA*.yaml spec/tests/T-BASE-SCROLL-AREA*.yaml packages/prototypes/base/src/scroll-area packages/prototypes/base/test/scroll-area.test.ts
git commit -m "feat(base): rewrite scroll area protocol"
```

---

## Task 10: Tooltip and Disclosure Base protocols

**Files:**

- Create: `spec/prototypes/P-BASE-TOOLTIP*.yaml`, `spec/prototypes/P-BASE-DISCLOSURE*.yaml`, matching T entities
- Modify: `packages/prototypes/base/src/tooltip/*`
- Create: `packages/prototypes/base/src/disclosure/*`
- Test: `packages/prototypes/base/test/{tooltip,disclosure}.test.ts`

- [ ] **Step 1: Write failing tests**

Tooltip: pointer delay, focus, blur, Escape, controlled/uncontrolled, trigger→content hover bridge, touch safety, `aria-describedby` lifecycle, timer cleanup. Disclosure: trigger/content relations, controlled/uncontrolled, Space/Enter, `openChange`, teardown.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/tooltip.test.ts packages/prototypes/base/test/disclosure.test.ts
```

- [ ] **Step 3: Write P/T entities**

Tooltip explicitly excludes interactive content/focus trap. Disclosure stays business-neutral and contains no Reasoning/Tool semantics.

- [ ] **Step 4: Implement protocols**

Use existing trigger, focus, context, overlay positioning, transition, and a11y patterns from Dialog/HoverCard/Dropdown. Clean all timers/listeners.

- [ ] **Step 5: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/tooltip.test.ts packages/prototypes/base/test/disclosure.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
git add spec/prototypes spec/tests packages/prototypes/base/src/tooltip packages/prototypes/base/src/disclosure packages/prototypes/base/test/tooltip.test.ts packages/prototypes/base/test/disclosure.test.ts
git commit -m "feat(base): rewrite tooltip and add disclosure protocol"
```

---

## Task 11: Brutalist interaction containers, demos, docs

**Files:**

- Modify: `packages/prototypes/brutalist/src/{scroll-area,tooltip}/*`
- Create: `packages/prototypes/brutalist/src/disclosure/*`
- Create/update: styled P/T entities, package exports/indexes
- Modify: corresponding demos/docs/index/preview registrations
- Test: focused Brutalist and previewer tests

- [ ] **Step 1: Write failing projection tests**

ScrollArea drag/keyboard evidence must use real viewport/scrollbar state. Tooltip opens on focus/hover and closes on Escape. Disclosure reflects expanded state with real trigger semantics.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/scroll-area.test.ts packages/prototypes/brutalist/test/tooltip.test.ts packages/prototypes/brutalist/test/disclosure.test.ts
```

- [ ] **Step 3: Implement projections and package surfaces**

Track/thumb/corner, Tooltip surface/arrow, Disclosure feedback. Zero unsupported tokens.

- [ ] **Step 4: Rewrite demos/docs; browser evidence**

Long overflowing content and working thumb; focusable Tooltip trigger; Disclosure with open/closed content; bilingual copy; dark/light and collision checks.

- [ ] **Step 5: Completion command, commit, PR note**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/scroll-area.test.ts packages/prototypes/base/test/tooltip.test.ts packages/prototypes/base/test/disclosure.test.ts packages/prototypes/brutalist/test/scroll-area.test.ts packages/prototypes/brutalist/test/tooltip.test.ts packages/prototypes/brutalist/test/disclosure.test.ts packages/adapters/web-component/test/previewer.demo-renderer.test.ts \
  && corepack pnpm@10.32.1 check:styles:preset
git add packages spec apps/www internal/baselines/prototype-catalog-debt.json
git commit -m "feat(prototypes): rewrite interaction container atoms"
gh pr comment 323 --body "Interaction container batch: ScrollArea, Tooltip, Disclosure. Protocol entities, tests, exports, generated CSS, demos, docs, browser evidence. Verification: paste the exact command outputs and browser observations from this batch."
```

---

## Task 12: CopyButton and Attachment Base protocols

**Files:**

- Create: `spec/prototypes/P-BASE-COPY-BUTTON*.yaml`, `spec/prototypes/P-BASE-ATTACHMENT*.yaml`, matching T entities
- Create: `packages/prototypes/base/src/copy-button/*`
- Create: `packages/prototypes/base/src/attachment/*`
- Test: `packages/prototypes/base/test/{copy-button,attachment}.test.ts`

- [ ] **Step 1: Write failing tests**

CopyButton: real trigger, accessible name, `copyRequest { text }`, external `idle | copied | failed` state, no direct Clipboard API call. Attachment: collection/item/preview/info/remove, media metadata, real remove trigger, no upload ownership, object URL cleanup.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/copy-button.test.ts packages/prototypes/base/test/attachment.test.ts
```

- [ ] **Step 3: Write P/T entities**

Copy execution is a capability/request boundary. Attachment is display/remove only; acquisition belongs to AttachmentInput.

- [ ] **Step 4: Implement protocols**

Compose established Button/trigger semantics. CopyButton emits request; adapter/consumer performs clipboard work. Attachment remove emits `{ id }`; preview URLs are revoked on update/unmount.

- [ ] **Step 5: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/copy-button.test.ts packages/prototypes/base/test/attachment.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
git add spec/prototypes spec/tests packages/prototypes/base/src/copy-button packages/prototypes/base/src/attachment packages/prototypes/base/test/copy-button.test.ts packages/prototypes/base/test/attachment.test.ts
git commit -m "feat(base): add copy button and attachment protocols"
```

---

## Task 13: AttachmentInput Base protocol and host capabilities

**Files:**

- Create: `spec/prototypes/P-BASE-ATTACHMENT-INPUT*.yaml`, matching T entities
- Create: `spec/host-caps/HC-ATTACHMENT-INPUT-*.yaml` when the capability is uncataloged
- Create: `packages/prototypes/base/src/attachment-input/*`
- Test: `packages/prototypes/base/test/attachment-input.test.ts`
- Test: adapter integration under `packages/adapters/web-component/test/`

- [ ] **Step 1: Write failing tests**

Cover native file selection, multiple files, `accept`, `maxFiles`, `maxFileSize`, drop, paste, global-drop opt-in, screenshot/camera capability present/absent, rejection payloads, preview URL cleanup, document listener cleanup.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/attachment-input.test.ts packages/adapters/web-component/test/attachment-input.test.ts
```

- [ ] **Step 3: Write P/T/HC entities**

Document File API, DataTransfer, paste, screenshot/camera capture, object URL, and global document drop boundaries. Unsupported capability must be observable, never silently successful.

- [ ] **Step 4: Implement protocol and adapter mapping**

Root context owns selected files and constraints; native file input is the acquisition host. Use event payloads with stable IDs and metadata, not opaque framework FileList ownership. Clean listeners and URLs on teardown.

- [ ] **Step 5: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/attachment-input.test.ts packages/adapters/web-component/test/attachment-input.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
git add spec packages/prototypes/base/src/attachment-input packages/prototypes/base/test/attachment-input.test.ts packages/adapters/web-component/test/attachment-input.test.ts
git commit -m "feat(base): add attachment input protocol"
```

---

## Task 14: CodeBlock and CodeHighlight protocols

**Files:**

- Create: `spec/prototypes/P-BASE-CODE-BLOCK*.yaml`, `spec/prototypes/P-BASE-CODE-HIGHLIGHT*.yaml`, matching T entities
- Rewrite: `packages/prototypes/base/src/code-block/*`
- Create: `packages/prototypes/base/src/code-highlight/*`
- Test: `packages/prototypes/base/test/{code-block,code-highlight}.test.ts`
- Create: a replaceable Shiki renderer outside core runtime, under the closest existing renderer/adapter package selected after repository pattern inspection

- [ ] **Step 1: Write failing tests**

CodeBlock: explicit `code`, opaque `language`, optional `filename`, lineNumbers/startLine/wrapMode, real `<pre><code>`, whitespace/selection, line numbers excluded from copy, copy disabled while incomplete/streaming. CodeHighlight: plain synchronous fallback, `pending | ready | error`, async callback, cancellation, language/theme update, streaming code update, renderer error fallback.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/code-block.test.ts packages/prototypes/base/test/code-highlight.test.ts
```

- [ ] **Step 3: Write P/T entities and capability contract**

Portable Base owns code/language/filename/lineNumbers/startLine/wrapMode/streaming/incomplete/copy intent. Renderer owns language aliases, highlighter load/cache/cancel/error, Shiki/Prism/plain implementation, and theme mapping. Do not expose Shiki `BundledLanguage`, token shapes, engines, or cache internals in Base.

- [ ] **Step 4: Implement Base protocols**

CodeBlock anatomy: root/header/title/filename/actions/container/content/lineNumbers/copy/languageAction. Copy composes CopyButton. Raw code is source of truth; rendered `textContent` is not. CodeHighlight accepts a replaceable renderer interface equivalent to `highlight(options, callback) => result | null` plus cancellation/error surfaces.

- [ ] **Step 5: Implement Shiki renderer**

Use raw tokens immediately, async highlighted replacement, explicit cancellation, bounded caches keyed by full-content hash + language + themes, plain fallback on unknown language/error, and no core runtime dependency on Shiki. Avoid upstream sampled cache-key collision and unbounded cache caveats.

- [ ] **Step 6: Run checks and commit**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/code-block.test.ts packages/prototypes/base/test/code-highlight.test.ts
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 check:types
git add spec packages/prototypes/base/src/code-block packages/prototypes/base/src/code-highlight packages/prototypes/base/test
git commit -m "feat(base): rewrite code block and add highlighting protocol"
```

---

## Task 15: Brutalist capability atoms, demos, docs

**Files:**

- Create/modify: `packages/prototypes/brutalist/src/{copy-button,attachment,attachment-input,code-block,code-highlight}/*`
- Create/update: styled P/T entities and tests
- Modify: package exports/indexes, token renderer/tests
- Modify: demos, bilingual docs, component index, preview registrations/sidebar

- [ ] **Step 1: Write failing projection tests**

Real copy trigger/request state, removable attachments with image/generic preview, native file input/drop validation, CodeBlock long-line overflow, line numbers, highlighted/plain/error states.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/copy-button.test.ts packages/prototypes/brutalist/test/attachment.test.ts packages/prototypes/brutalist/test/attachment-input.test.ts packages/prototypes/brutalist/test/code-block.test.ts
```

- [ ] **Step 3: Implement projections and package surfaces**

Use 2px ink borders, hard shadow, canvas code surface, canary header, real overflow, accessible copy feedback. Every token compiles.

- [ ] **Step 4: Rewrite demos/docs; browser evidence**

Upload image/file, reject oversized file, remove attachment, copy code, switch highlighted language/theme, show long-code scroll and renderer fallback. Localize zh-cn demo copy.

- [ ] **Step 5: Completion command, commit, PR note**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/copy-button.test.ts packages/prototypes/base/test/attachment.test.ts packages/prototypes/base/test/attachment-input.test.ts packages/prototypes/base/test/code-block.test.ts packages/prototypes/base/test/code-highlight.test.ts packages/prototypes/brutalist/test packages/adapters/web-component/test \
  && corepack pnpm@10.32.1 check:styles:preset
git add packages spec apps/www internal/baselines/prototype-catalog-debt.json
git commit -m "feat(prototypes): add capability atoms and code rendering"
gh pr comment 323 --body "Capability atom batch: CopyButton, Attachment, AttachmentInput, CodeBlock, CodeHighlight. Protocol entities, tests, exports, generated CSS, demos, docs, browser evidence. Verification: paste the exact command outputs and browser observations from this batch."
```

---

## Task 16: Library-level Message/Response/Reasoning/ToolCall compositions

**Files:**

- Create: Library-specific composition sources in `packages/prototypes/brutalist/src/` and `packages/prototypes/shadcn/src/` after choosing family names consistent with existing package conventions
- Remove/replace: failed Base `message/*` and corresponding debt entries; do not recreate business Message in Base
- Create: Library P/T entities documenting composition and Base dependencies
- Test: focused Library tests

- [ ] **Step 1: Write failing composition tests**

Message: self/other/system layout at Library layer; Avatar/header/content/actions composition. Response: plain text plus optional Markdown renderer capability. Reasoning: Disclosure composition with streaming auto-open/complete policy. ToolCall: Disclosure + header/input/output/error, external tool state only, no execution.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/message.test.ts packages/prototypes/brutalist/test/reasoning.test.ts packages/prototypes/brutalist/test/tool-call.test.ts packages/prototypes/shadcn/test/message.test.ts packages/prototypes/shadcn/test/reasoning.test.ts packages/prototypes/shadcn/test/tool-call.test.ts
```

- [ ] **Step 3: Write Library P/T entities**

Entities must state that role/origin/reasoning/tool states are Library composition semantics, not Base atoms. They must relate to Avatar, Card, Disclosure, CodeBlock, Attachment, Badge, Button, Tooltip, and Response renderer entities.

- [ ] **Step 4: Implement compositions**

No AI SDK `UIMessage` types in protocol surfaces. Accept application-owned data through plain JSON-like props/events. ToolCall only presents `input-streaming | input-available | output-available | output-error`; it never executes the tool.

- [ ] **Step 5: Demos/docs/browser**

Demo content must include user/assistant/system, reasoning streaming→complete, tool input/output/error, attachments, CodeBlock, and real actions. Computed styles must distinguish origins/states. zh-cn copy localized.

- [ ] **Step 6: Completion command, commit**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test packages/prototypes/shadcn/test packages/adapters/web-component/test \
  && corepack pnpm@10.32.1 check:styles:preset
git add packages spec apps/www internal/baselines/prototype-catalog-debt.json
git commit -m "feat(libraries): compose message reasoning and tool call"
```

---

## Task 17: Library-level Sources/Citations, ModelSelector, Composer, Conversation

**Files:**

- Create: Library composition sources for sources/citations, model selector, composer/prompt-input, and conversation
- Remove/replace: failed Base `composer/*` and its debt entries; do not recreate business Composer in Base
- Create: Library P/T entities and focused tests
- Modify: demos/docs/sidebar/indexes/preview registrations

- [ ] **Step 1: Write failing composition tests**

Sources: real link list/count/disclosure and inline citation separation. ModelSelector: Dialog + command/select semantics, keyboard search, selected model event, no provider hardcoding. Composer: real form, Textarea, AttachmentInput, tools/actions, submit/stop; Enter/Shift+Enter/Mod+Enter/IME; external `ready | submitted | streaming | error`; `onStop` required for stop behavior. Conversation: ScrollArea/ConversationScroller follow-bottom, scroll button, empty state, message list, download action composition.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test/sources.test.ts packages/prototypes/brutalist/test/model-selector.test.ts packages/prototypes/brutalist/test/composer.test.ts packages/prototypes/brutalist/test/conversation.test.ts packages/prototypes/shadcn/test/sources.test.ts packages/prototypes/shadcn/test/model-selector.test.ts packages/prototypes/shadcn/test/composer.test.ts packages/prototypes/shadcn/test/conversation.test.ts
```

- [ ] **Step 3: Write Library P/T entities**

Document composition dependencies and explicitly exclude provider/model catalogs, AI SDK types, network lifecycle, and business success semantics from Base.

- [ ] **Step 4: Implement compositions**

Composer provider semantics map to family context, not React Provider as public protocol. Web search is a composed Toggle/Button, speech is a capability action, model selection is a composed family. Submit resets only when Library policy explicitly requests it; stop does nothing without a provided handler.

- [ ] **Step 5: Demos/docs/browser**

Real text entry, file/image upload, remove, model choice, web-search toggle, optional speech capability, submit, stop, streaming status, message list, scroll-follow and citations. Test both locales and narrow/mobile layout.

- [ ] **Step 6: Completion command, commit, PR note**

```bash
corepack pnpm@10.32.1 check:prototype-catalog \
  && corepack pnpm@10.32.1 check:types \
  && corepack pnpm@10.32.1 exec vitest run packages/prototypes/brutalist/test packages/prototypes/shadcn/test packages/adapters/web-component/test \
  && corepack pnpm@10.32.1 check:styles:preset
git add packages spec apps/www internal/baselines/prototype-catalog-debt.json
git commit -m "feat(libraries): compose chat input and conversation systems"
gh pr comment 323 --body "Library composition batch: Message, Response, Reasoning, ToolCall, Sources/Citations, ModelSelector, Composer, Conversation. Base atoms remain business-neutral. Protocol entities, tests, exports, generated CSS, demos, docs, browser evidence. Verification: paste the exact command outputs and browser observations from this batch."
```

---

## Task 18: Remove broken artifacts and close catalog debt

**Files:**

- Remove: superseded failed sources/spec/tests/docs from the broken Avatar-onward implementation
- Modify: `internal/baselines/prototype-catalog-debt.json`
- Modify: all Base/Brutalist/Shadcn package exports and indexes
- Regenerate: style tokens, BOM if package surfaces changed, Agent project understanding

- [ ] **Step 1: Assert debt and stale surfaces fail**

Add or update catalog/package-surface tests so every old Composer/CodeBlock/Message debt entry or stale export causes a failure.

- [ ] **Step 2: Verify failure**

```bash
corepack pnpm@10.32.1 check:prototype-catalog
```

- [ ] **Step 3: Remove superseded artifacts**

Delete old source files and P/T entities that do not match the approved atomic boundary. Remove stale debt entries. Remove unsupported package subpaths or replace them with the correct Library surfaces. No compatibility aliases.

- [ ] **Step 4: Regenerate owned artifacts**

```bash
corepack pnpm@10.32.1 styles:preset:generate
corepack pnpm@10.32.1 release:bom
corepack pnpm@10.32.1 spec:docs:agent
```

- [ ] **Step 5: Run governance checks**

```bash
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 check:agent-doc
corepack pnpm@10.32.1 check:styles:preset
corepack pnpm@10.32.1 check:component-presets
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove superseded avatar-onward prototype debt"
```

---

## Task 19: Final verification, browser matrix, and concise PR summary

**Files:**

- Modify only artifacts proven stale by verification
- No new features

- [ ] **Step 1: Run full repository verification**

```bash
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 check:styles:preset
corepack pnpm@10.32.1 check:component-presets
corepack pnpm@10.32.1 check:agent-doc
corepack pnpm@10.32.1 check:types
corepack pnpm@10.32.1 test
```

Expected: all exit 0. Any failure must be traced and repaired at source; do not label changed snapshots or unsupported tokens as expected drift.

- [ ] **Step 2: Browser matrix**

Exercise every English and Chinese public page introduced or changed by the rewrite. For interactive atoms, drive their behavior; for visual atoms, inspect computed styles in light/dark and narrow viewport. Capture exact failures, fix them, and rerun the matrix.

- [ ] **Step 3: Final reviewer**

Dispatch one reviewer for spec compliance across the full design record and one reviewer for code quality/security/accessibility. Repair every confirmed finding and rerun verification.

- [ ] **Step 4: Commit final repairs**

```bash
git add -A
git commit -m "fix: close avatar-onward rewrite verification gaps"
git push origin HEAD
```

- [ ] **Step 5: Post one concise PR summary**

```bash
gh pr comment 323 --body "Avatar-onward rewrite complete. Base now contains business-neutral atoms; Brutalist/Shadcn compose and style them; ChatUI semantics remain at Library level. Protocol entities, tests, package surfaces, generated CSS, demos, bilingual docs, and browser evidence are aligned. Verification: check:prototype-catalog, check:styles:preset, check:component-presets, check:agent-doc, check:types, and test all pass."
```
