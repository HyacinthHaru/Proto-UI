# Neo-Brutalist Prototype Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@proto.ui/prototypes-brutalist` with eight Base-inheriting Neo-Brutalist families, draft catalog entities/tests, CLI style preset support, www demos, browser verification, and a draft PR.

**Architecture:** Add a new styled prototype package parallel to Shadcn. Each family calls the existing Base `as*` hook, adds only props/style/rules, and uses generated CLI token closure plus dual-theme CSS variables for light/dark Neo-Brutalist surfaces.

**Tech Stack:** TypeScript, Proto UI core/prototypes/runtime, Vitest, YAML spec catalog, Astro docs site, Proto UI CLI token scanner.

---

## File structure

### New package

- Create `packages/prototypes/brutalist/package.json` — public workspace package metadata and subpath exports.
- Create `packages/prototypes/brutalist/README.md` — purpose, imports, visual contract, light/dark notes.
- Create `packages/prototypes/brutalist/src/style.ts` — shared Neo-Brutalist token constants and typed helpers.
- Create `packages/prototypes/brutalist/src/index.ts` — root exports and type exports.
- Create family directories under `packages/prototypes/brutalist/src/{button,toggle,switch,tabs,hover-card,dropdown,select,dialog}/`.
- Create tests under `packages/prototypes/brutalist/test/*.test.ts`.

### Catalog

- Create `spec/prototypes/P-BRUTALIST-*.yaml` for implemented family/part identities.
- Create `spec/tests/T-BRUTALIST-*-0001.yaml` family conformance mappings.
- Create `spec/decisions/D-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml`.
- Create `spec/tests/T-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml`.

### CLI

- Create `scripts/styles/generate-brutalist-style-tokens.ts`.
- Create generated `packages/cli/src/generated/brutalist-style-tokens.ts` through the generator.
- Modify `package.json` scripts to run both shadcn and brutalist preset generators/checks.
- Modify `packages/cli/src/legacy/type.ts` to export Brutalist tokens/theme CSS and package map.
- Modify init style choices/writer in `packages/cli/src/legacy/cli.ts` to support `brutalist`.
- Modify `packages/cli/src/registry/components.ts` to add `brutalist-*` registry entries.
- Modify `packages/cli/src/commands/add.ts` to warn for any disabled non-null style preset.
- Modify `packages/cli/test/cli.test.ts` for Brutalist add/init coverage.

### Website

- Modify `apps/www/package.json` to depend on `@proto.ui/prototypes-brutalist`.
- Modify `apps/www/astro.config.mjs` aliases / optimize deps if Shadcn is listed there.
- Modify `apps/www/src/components/PrototypePreviewer/prototype-modules.ts` to register Brutalist prototypes.
- Create demo docs/code files under existing `apps/www/src/content/docs/**` demo pattern for Brutalist.

---

## Task 1: Isolated workspace and baseline

**Files:**
- Read: repository root
- No production code changes

- [ ] **Step 1: Detect existing worktree state**

Run:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUPERPROJECT=$(git rev-parse --show-superproject-working-tree 2>/dev/null || true)
BRANCH=$(git branch --show-current)
printf 'GIT_DIR=%s\nGIT_COMMON=%s\nSUPERPROJECT=%s\nBRANCH=%s\n' "$GIT_DIR" "$GIT_COMMON" "$SUPERPROJECT" "$BRANCH"
```

Expected: if `GIT_DIR != GIT_COMMON` and `SUPERPROJECT` is empty, continue in current linked worktree. Otherwise create a linked worktree.

- [ ] **Step 2: Create implementation worktree if needed**

If not already isolated, use project-local `.worktrees` after ensuring it is ignored:

```bash
git check-ignore -q .worktrees || printf '\n.worktrees/\n' >> .gitignore
git add .gitignore || true
if ! git diff --cached --quiet; then git commit -m "chore: ignore local worktrees"; fi
git worktree add .worktrees/brutalist-design-system -b feat/brutalist-design-system
```

Expected: new worktree at `.worktrees/brutalist-design-system` on branch `feat/brutalist-design-system`. If already isolated, skip this step.

- [ ] **Step 3: Run baseline checks**

Run in the implementation worktree (or current worktree if already isolated):

```bash
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 --filter @proto.ui/prototypes-shadcn test -- --runInBand 2>/dev/null || corepack pnpm@10.32.1 vitest run packages/prototypes/shadcn/test/button.test.ts
```

Expected: catalog check passes. The focused Shadcn test command may need the fallback; record exact passing command.

- [ ] **Step 4: Commit baseline-only changes if `.gitignore` changed**

If `.gitignore` was changed in Step 2, it was already committed. No other changes should exist.

---

## Task 2: Button vertical slice (TDD)

**Files:**
- Create: `packages/prototypes/brutalist/package.json`
- Create: `packages/prototypes/brutalist/README.md`
- Create: `packages/prototypes/brutalist/src/style.ts`
- Create: `packages/prototypes/brutalist/src/button/types.ts`
- Create: `packages/prototypes/brutalist/src/button/button.proto.ts`
- Create: `packages/prototypes/brutalist/src/button/index.ts`
- Create: `packages/prototypes/brutalist/src/index.ts`
- Create: `packages/prototypes/brutalist/test/button.test.ts`

- [ ] **Step 1: Write failing Button tests**

Create `packages/prototypes/brutalist/test/button.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RuntimeHost } from '@proto.ui/runtime';
import { executeWithHost } from '@proto.ui/runtime';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import { RULE_META_GET_CAP } from '@proto.ui/module-rule-meta';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import button from '../src/button';

function createButtonHost(rawPropsRef: { current: Record<string, unknown> }, colorScheme = 'light') {
  const rootTarget = new EventTarget();
  const globalTarget = new EventTarget();
  const host: RuntimeHost<any> = {
    prototypeName: 'x-brutalist-button',
    getRawProps() {
      return rawPropsRef.current as any;
    },
    commit(_children, signal) {
      signal?.done();
    },
    schedule(task) {
      task();
    },
    onRuntimeReady(wiring) {
      wiring.attach('event', [
        [EVENT_ROOT_TARGET_CAP, () => rootTarget],
        [EVENT_GLOBAL_TARGET_CAP, () => globalTarget],
      ]);
      wiring.attach('as-trigger', [
        [AS_TRIGGER_INSTANCE_CAP, rootTarget],
        [AS_TRIGGER_PARENT_CAP, () => null],
        [AS_TRIGGER_GET_PROTO_CAP, () => null],
      ]);
      wiring.attach('rule-meta', [[RULE_META_GET_CAP, (key: string) => (key === 'colorScheme' ? colorScheme : null)]]);
    },
  };
  return { host, rootTarget };
}

describe('prototypes/brutalist: button', () => {
  it('maps variant and size props to Neo-Brutalist rule style tokens', () => {
    const rawPropsRef = { current: { variant: 'default', size: 'default', disabled: false } };
    const { host } = createButtonHost(rawPropsRef);
    const { controller } = executeWithHost(button as any, host as any);

    expect(button.name).toBe('brutalist-button');
    expect((button as any).__asHooks).toContainEqual(expect.objectContaining({ name: 'as-button', mode: 'once' }));

    let tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('rounded-none');
    expect(tokens).toContain('border-2');
    expect(tokens).toContain('border-black');
    expect(tokens).toContain('bg-[var(--main)]');
    expect(tokens).toContain('text-[var(--main-foreground)]');
    expect(tokens).toContain('shadow-[5px_5px_0_0_#000]');
    expect(tokens).toContain('h-10');

    rawPropsRef.current = { variant: 'destructive', size: 'lg', disabled: true };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-[var(--destructive)]');
    expect(tokens).toContain('h-12');
    expect(tokens).toContain('opacity-50');

    rawPropsRef.current = { variant: 'outline', size: 'icon', disabled: false };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-[var(--secondary-background)]');
    expect(tokens).toContain('size-10');

    rawPropsRef.current = {};
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('bg-[var(--main)]');
    expect(tokens).toContain('h-10');
    expect(tokens).not.toContain('opacity-50');
  });

  it('derives focus press hover and disabled styling from Base Button state handles', () => {
    const rawPropsRef = { current: { variant: 'default', size: 'default', disabled: false } };
    const { host, rootTarget } = createButtonHost(rawPropsRef);
    const { controller } = executeWithHost(button as any, host as any);

    rootTarget.dispatchEvent(new Event('pointerenter'));
    let tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('shadow-[8px_8px_0_0_#000]');
    expect(tokens).toContain('-translate-x-0.5');
    expect(tokens).toContain('-translate-y-0.5');

    rootTarget.dispatchEvent(new Event('pointerdown'));
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('translate-x-[5px]');
    expect(tokens).toContain('translate-y-[5px]');
    expect(tokens).toContain('shadow-none');

    rawPropsRef.current = { variant: 'default', size: 'default', disabled: true };
    controller.applyRawProps(rawPropsRef.current as any);
    tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('pointer-events-none');
    expect(tokens).toContain('opacity-50');
  });

  it('projects dark color-scheme visual deltas without changing protocol identity', () => {
    const rawPropsRef = { current: { variant: 'outline', size: 'default', disabled: false } };
    const { host } = createButtonHost(rawPropsRef, 'dark');
    const { controller } = executeWithHost(button as any, host as any);

    expect(button.name).toBe('brutalist-button');
    const tokens = controller.getRuleStyleTokens();
    expect(tokens).toContain('text-[var(--foreground)]');
    expect(tokens).toContain('ring-[var(--ring)]');
    expect(tokens).not.toContain('rounded-lg');
    expect(tokens).not.toContain('shadow-lg');
  });
});
```

- [ ] **Step 2: Verify Button tests fail**

Run:

```bash
corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test/button.test.ts
```

Expected: FAIL because `../src/button` / package files do not exist.

- [ ] **Step 3: Create minimal package metadata and shared style tokens**

Create `packages/prototypes/brutalist/package.json`:

```json
{
  "name": "@proto.ui/prototypes-brutalist",
  "version": "0.2.0-rc.3",
  "private": false,
  "type": "module",
  "sideEffects": false,
  "dependencies": {
    "@proto.ui/core": "workspace:*",
    "@proto.ui/prototypes-base": "workspace:*"
  },
  "devDependencies": {
    "@proto.ui/module-as-trigger": "workspace:*",
    "@proto.ui/module-event": "workspace:*",
    "@proto.ui/module-rule-meta": "workspace:*",
    "@proto.ui/runtime": "workspace:*"
  },
  "exports": {
    ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
    "./button": { "types": "./src/button/index.ts", "default": "./src/button/index.ts" }
  },
  "description": "Neo-Brutalist Proto UI prototype library for adapter-driven components.",
  "license": "MIT",
  "homepage": "https://github.com/Proto-UI/Proto-UI/tree/main/packages/prototypes/brutalist",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Proto-UI/Proto-UI.git",
    "directory": "packages/prototypes/brutalist"
  },
  "bugs": { "url": "https://github.com/Proto-UI/Proto-UI/issues" },
  "publishConfig": { "access": "public" },
  "keywords": ["proto-ui", "proto", "ui", "prototypes", "brutalist", "neo-brutalist", "prototype-library"]
}
```

Create `packages/prototypes/brutalist/README.md`:

```md
# @proto.ui/prototypes-brutalist

Neo-Brutalist Proto UI prototype library for adapter-driven components.

## Purpose

Provides a design-language prototype library that inherits Base interaction protocols and layers a Neo-Brutalist visual surface: square corners, black borders, hard offset shadows, flat colors, and light/dark theme variables.

## Visual Contract

- `border-radius: 0` everywhere.
- 2-3px black structural borders.
- Hard zero-blur offset shadows.
- Light paper `#f4f1ea`; dark warm paper `#1c1914`.
- Accent `#ffd23f` with black foreground.
- No gradients, blur, glass, rounded cards, or soft elevation.

## Family Imports

```ts
import { brutalistButton } from '@proto.ui/prototypes-brutalist/button';
```

## Related Internal Packages

- `@proto.ui/core`
- `@proto.ui/prototypes-base`

## License

MIT
```

Create `packages/prototypes/brutalist/src/style.ts`:

```ts
export const BRUTALIST_FOCUS_TOKENS = 'outline-none ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)]';

export const BRUTALIST_CONTROL_TOKENS = [
  'rounded-none',
  'border-2',
  'border-black',
  'shadow-[5px_5px_0_0_#000]',
  'bg-[var(--secondary-background)]',
  'text-[var(--foreground)]',
].join(' ');

export const BRUTALIST_PANEL_TOKENS = [
  'rounded-none',
  'border-[3px]',
  'border-black',
  'shadow-[8px_8px_0_0_#000]',
  'bg-[var(--secondary-background)]',
  'text-[var(--foreground)]',
].join(' ');

export const BRUTALIST_HOVER_LIFT_TOKENS = '-translate-x-0.5 -translate-y-0.5 shadow-[8px_8px_0_0_#000]';
export const BRUTALIST_PRESS_TOKENS = 'translate-x-[5px] translate-y-[5px] shadow-none';
export const BRUTALIST_DISABLED_TOKENS = 'pointer-events-none opacity-50';
```

- [ ] **Step 4: Implement Button production code**

Create `packages/prototypes/brutalist/src/button/types.ts`:

```ts
import type { ButtonExposes, ButtonProps } from '@proto.ui/prototypes-base/button';

export type BrutalistButtonVariant = 'default' | 'outline' | 'secondary' | 'destructive' | 'reverse';
export type BrutalistButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface BrutalistButtonProps extends ButtonProps {
  variant?: BrutalistButtonVariant;
  size?: BrutalistButtonSize;
}

export type BrutalistButtonExposes = ButtonExposes;
```

Create `packages/prototypes/brutalist/src/button/button.proto.ts`:

```ts
import { definePrototype, tw } from '@proto.ui/core';
import { asButton } from '@proto.ui/prototypes-base/button';
import {
  BRUTALIST_CONTROL_TOKENS,
  BRUTALIST_DISABLED_TOKENS,
  BRUTALIST_FOCUS_TOKENS,
  BRUTALIST_HOVER_LIFT_TOKENS,
  BRUTALIST_PRESS_TOKENS,
} from '../style';
import type { BrutalistButtonExposes, BrutalistButtonProps, BrutalistButtonSize, BrutalistButtonVariant } from './types';

const BUTTON_BASE_TOKENS = [
  'group/brutalist-button',
  'inline-flex',
  'shrink-0',
  'items-center',
  'justify-center',
  'gap-2',
  'whitespace-nowrap',
  'select-none',
  'font-bold',
  'uppercase',
  'tracking-tight',
  BRUTALIST_CONTROL_TOKENS,
].join(' ');

const VARIANT_TOKENS: Record<BrutalistButtonVariant, string> = {
  default: 'bg-[var(--main)] text-[var(--main-foreground)]',
  outline: 'bg-[var(--secondary-background)] text-[var(--foreground)]',
  secondary: 'bg-[var(--background)] text-[var(--foreground)]',
  destructive: 'bg-[var(--destructive)] text-[var(--main-foreground)]',
  reverse: 'bg-black text-[var(--background)] shadow-[-5px_5px_0_0_#000]',
};

const SIZE_TOKENS: Record<BrutalistButtonSize, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
  icon: 'size-10',
};

const button = definePrototype<BrutalistButtonProps, BrutalistButtonExposes>({
  name: 'brutalist-button',
  setup(def) {
    def.props.define({
      variant: { type: 'enum', empty: 'fallback', options: ['default', 'outline', 'secondary', 'destructive', 'reverse'] },
      size: { type: 'enum', empty: 'fallback', options: ['default', 'sm', 'lg', 'icon'] },
      disabled: { type: 'boolean', empty: 'fallback' },
    });
    def.props.setDefaults({ variant: 'default', size: 'default', disabled: false });

    const buttonState = asButton().stateHandles;
    if (!buttonState) throw new Error('[brutalist-button] asButton must project Button state handles.');
    const { disabled, hovered, focusVisible, pressed } = buttonState;

    def.feedback.style.use(tw(BUTTON_BASE_TOKENS));

    (Object.keys(VARIANT_TOKENS) as BrutalistButtonVariant[]).forEach((variant) => {
      def.rule({ when: (w) => w.prop('variant').eq(variant), intent: (i) => i.feedback.style.use(tw(VARIANT_TOKENS[variant])) });
    });

    (Object.keys(SIZE_TOKENS) as BrutalistButtonSize[]).forEach((size) => {
      def.rule({ when: (w) => w.prop('size').eq(size), intent: (i) => i.feedback.style.use(tw(SIZE_TOKENS[size])) });
    });

    def.rule({ when: (w) => w.state(hovered).eq(true), intent: (i) => i.feedback.style.use(tw(BRUTALIST_HOVER_LIFT_TOKENS)) });
    def.rule({ when: (w) => w.state(pressed).eq(true), intent: (i) => i.feedback.style.use(tw(BRUTALIST_PRESS_TOKENS)) });
    def.rule({ when: (w) => w.state(focusVisible).eq(true), intent: (i) => i.feedback.style.use(tw(BRUTALIST_FOCUS_TOKENS)) });
    def.rule({ when: (w) => w.state(disabled).eq(true), intent: (i) => i.feedback.style.use(tw(BRUTALIST_DISABLED_TOKENS)) });
    def.rule({ when: (w) => w.meta('colorScheme').eq('dark'), intent: (i) => i.feedback.style.use(tw('text-[var(--foreground)] ring-[var(--ring)]')) });
  },
});

export type { BrutalistButtonProps, BrutalistButtonExposes, BrutalistButtonSize, BrutalistButtonVariant };
export default button;
```

Create `packages/prototypes/brutalist/src/button/index.ts`:

```ts
export { default, default as brutalistButton } from './button.proto';
export type { BrutalistButtonExposes, BrutalistButtonProps, BrutalistButtonSize, BrutalistButtonVariant } from './button.proto';
```

Create `packages/prototypes/brutalist/src/index.ts`:

```ts
export { default as button } from './button';
export { default as brutalistButton } from './button';
export type { BrutalistButtonExposes, BrutalistButtonProps, BrutalistButtonSize, BrutalistButtonVariant } from './button/types';
```

- [ ] **Step 5: Verify Button tests pass**

Run:

```bash
corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test/button.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Button vertical slice**

```bash
git add packages/prototypes/brutalist
git commit -m "feat: add Brutalist Button prototype"
```

---

## Task 3: Toggle, Switch, and Tabs (TDD)

**Files:**
- Create/modify `packages/prototypes/brutalist/src/toggle/**`
- Create/modify `packages/prototypes/brutalist/src/switch/**`
- Create/modify `packages/prototypes/brutalist/src/tabs/**`
- Modify `packages/prototypes/brutalist/src/index.ts`
- Modify `packages/prototypes/brutalist/package.json` exports
- Create tests: `toggle.test.ts`, `switch.test.ts`, `tabs.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that assert:

```ts
expect(toggle.name).toBe('brutalist-toggle');
expect((toggle as any).__asHooks).toContainEqual(expect.objectContaining({ name: 'as-toggle', mode: 'once' }));
expect(controller.getRuleStyleTokens()).toContain('rounded-none');
expect(controller.getRuleStyleTokens()).toContain('shadow-[5px_5px_0_0_#000]');
```

For switch:

```ts
expect(switchRoot.name).toBe('brutalist-switch-root');
expect((switchRoot as any).__asHooks).toContainEqual(expect.objectContaining({ name: 'as-switch-root', mode: 'once' }));
expect(controller.getRuleStyleTokens()).toContain('rounded-none');
expect(controller.getRuleStyleTokens()).toContain('border-2');
expect(controller.getRuleStyleTokens()).toContain('shadow-[5px_5px_0_0_#000]');
expect(switchThumb.name).toBe('brutalist-switch-thumb');
expect((switchThumb as any).__asHooks).toContainEqual(expect.objectContaining({ name: 'as-switch-thumb', mode: 'once' }));
```

For tabs:

```ts
expect(tabsRoot.name).toBe('brutalist-tabs-root');
expect(tabsList.name).toBe('brutalist-tabs-list');
expect(tabsTrigger.name).toBe('brutalist-tabs-trigger');
expect(tabsContent.name).toBe('brutalist-tabs-content');
expect((tabsTrigger as any).__asHooks).toContainEqual(expect.objectContaining({ name: 'as-tabs-trigger', mode: 'once' }));
expect(triggerController.getRuleStyleTokens()).toContain('rounded-none');
expect(triggerController.getRuleStyleTokens()).toContain('border-2');
```

Use Shadcn `toggle.test.ts`, `switch.test.ts`, and `tabs.test.ts` host setup patterns, replacing names/tokens.

- [ ] **Step 2: Run tests to verify failure**

```bash
corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test/toggle.test.ts packages/prototypes/brutalist/test/switch.test.ts packages/prototypes/brutalist/test/tabs.test.ts
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement minimal Toggle/Switch/Tabs**

Implementation rules:

- Copy type aliases from the matching Shadcn types but rename `Shadcn` → `Brutalist`.
- Each `.proto.ts` calls the matching Base `as*` hook and throws if required state handles are missing.
- Use shared `BRUTALIST_CONTROL_TOKENS`, `BRUTALIST_PANEL_TOKENS`, `BRUTALIST_HOVER_LIFT_TOKENS`, `BRUTALIST_PRESS_TOKENS`, `BRUTALIST_FOCUS_TOKENS`, `BRUTALIST_DISABLED_TOKENS`.
- Use `rounded-none`, never `rounded-lg`, `rounded-full`, or `shadow-lg`.
- Switch root must use square track tokens: `inline-flex h-7 w-12 items-center rounded-none border-2 border-black bg-[var(--secondary-background)] p-0.5 shadow-[5px_5px_0_0_#000]`.
- Switch thumb must use square thumb tokens: `size-5 rounded-none border-2 border-black bg-[var(--main)] shadow-[3px_3px_0_0_#000]`.
- Tabs list uses ruled strip: `inline-flex rounded-none border-2 border-black bg-[var(--secondary-background)] shadow-[5px_5px_0_0_#000]`.
- Tabs trigger active state uses `bg-[var(--main)] text-[var(--main-foreground)]`.
- Tabs content uses `BRUTALIST_PANEL_TOKENS`.

- [ ] **Step 4: Verify tests pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit controls**

```bash
git add packages/prototypes/brutalist
git commit -m "feat: add Brutalist toggle switch and tabs prototypes"
```

---

## Task 4: Overlay families (HoverCard, Dropdown, Select, Dialog) TDD

**Files:**
- Create/modify `packages/prototypes/brutalist/src/{hover-card,dropdown,select,dialog}/**`
- Modify root package exports and `package.json` exports
- Create tests: `hover-card.test.ts`, `dropdown.test.ts`, `select.test.ts`, `dialog.test.ts`

- [ ] **Step 1: Write failing tests**

For each family, assert names, Base `as*` inheritance, and structural tokens:

```ts
expect(contentController.getRuleStyleTokens()).toContain('rounded-none');
expect(contentController.getRuleStyleTokens()).toContain('border-[3px]');
expect(contentController.getRuleStyleTokens()).toContain('shadow-[8px_8px_0_0_#000]');
expect(contentController.getRuleStyleTokens()).toContain('bg-[var(--secondary-background)]');
expect(contentController.getRuleStyleTokens()).not.toContain('rounded-lg');
expect(contentController.getRuleStyleTokens()).not.toContain('shadow-lg');
```

Dialog mask test:

```ts
expect(maskController.getRuleStyleTokens()).toContain('bg-[var(--overlay)]');
expect(maskController.getRuleStyleTokens()).not.toContain('backdrop-blur');
```

Dialog content test also asserts transition stays configured by inherited content if following Shadcn pattern, and content name is `brutalist-dialog-content`.

- [ ] **Step 2: Run tests to verify failure**

```bash
corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test/hover-card.test.ts packages/prototypes/brutalist/test/dropdown.test.ts packages/prototypes/brutalist/test/select.test.ts packages/prototypes/brutalist/test/dialog.test.ts
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement minimal overlay families**

Implementation rules:

- Follow Shadcn family file names and exports.
- Rename prototype names to `brutalist-*`.
- Root prototypes call Base root asHook and add minimal layout tokens if Shadcn does.
- Trigger prototypes inherit Base trigger and layer Button-like surface if trigger is visible (`BRUTALIST_CONTROL_TOKENS`).
- Content/panel prototypes use `BRUTALIST_PANEL_TOKENS` plus positioning tokens from Shadcn/Base as needed.
- Select item / Dropdown item use square hover/active tokens: `rounded-none px-2 py-1.5 font-mono text-sm` + active `bg-[var(--main)] text-[var(--main-foreground)]`.
- Dialog header/footer are layout-only if implemented; no Base semantics claimed.
- Dialog close-icon is implemented if preserving the Shadcn convenience preset pattern.

- [ ] **Step 4: Verify overlay tests pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit overlay families**

```bash
git add packages/prototypes/brutalist
git commit -m "feat: add Brutalist overlay prototype families"
```

---

## Task 5: Spec prototype and test entities

**Files:**
- Create `spec/prototypes/P-BRUTALIST-*.yaml`
- Create `spec/tests/T-BRUTALIST-*-0001.yaml`

- [ ] **Step 1: Write catalog entities for Button first**

Create `spec/prototypes/P-BRUTALIST-BUTTON.yaml` modeled after `P-SHADCN-BUTTON.yaml` with:

```yaml
id: P-BRUTALIST-BUTTON
type: prototype
title: Brutalist Button inherits Base Button and layers a dual-theme Neo-Brutalist visual API
status: draft
since: 0.2.0-rc.3
summary: Brutalist Button is a Proto UI-maintained design-language projection that inherits Base Button by default and adds a square-corner, hard-shadow, light/dark Neo-Brutalist visual API.
criteria:
  - id: P-BRUTALIST-BUTTON-DESIGN-LANGUAGE-IDENTITY
    text:
      en: Brutalist Button must identify itself as a Proto UI-maintained Neo-Brutalist design-language projection rather than an upstream-derived third-party package.
      zh-CN: Brutalist Button 必须标记为 Proto UI 维护的 Neo-Brutalist design-language 投射，而不是第三方上游衍生包。
  - id: P-BRUTALIST-BUTTON-BASE-INHERITANCE
    text:
      en: brutalist-button must inherit P-BASE-BUTTON through asButton during setup, and every Base guarantee without an explicit negative-patch criterion remains effective.
      zh-CN: brutalist-button 必须在 setup 期通过 asButton 继承 P-BASE-BUTTON；未被显式负向补丁准则覆盖的 Base guarantee 继续有效。
    references:
      prototypes:
        - id: P-BASE-BUTTON
          anchors: [P-BASE-BUTTON-AUTHORING-ENTRIES]
  - id: P-BRUTALIST-BUTTON-VISUAL-GRAMMAR
    text:
      en: The visual surface must use square corners, black structural borders, hard zero-blur offset shadows, flat fill colors, and no gradients, glass, soft shadows, or rounded surfaces.
      zh-CN: 视觉表面必须使用直角、黑色结构边框、零模糊硬偏移阴影和平面色，不得使用渐变、玻璃拟态、柔和阴影或圆角表面。
  - id: P-BRUTALIST-BUTTON-LIGHT-DARK-THEME
    text:
      en: Light and dark appearances must be driven by Brutalist semantic CSS variables and optional colorScheme visual deltas without changing Button protocol facts.
      zh-CN: Light 与 Dark 外观必须由 Brutalist 语义 CSS 变量和可选 colorScheme 视觉增量驱动，不得改变 Button protocol facts。
  - id: P-BRUTALIST-BUTTON-VARIANT-SIZE-PROPS
    text:
      en: The current passing API provides variant default, outline, secondary, destructive, and reverse plus size default, sm, lg, and icon; removing either prop restores defaults.
      zh-CN: 当前 passing API 提供 default、outline、secondary、destructive、reverse variant 以及 default、sm、lg、icon size；移除任一 prop 必须恢复默认值。
dependsOn:
  contracts: [C-PROPS-0001, C-PROPS-0003, C-RULE-INTENT-FEEDBACK-STYLE-0001]
  decisions: [D-PROTOTYPE-ENTITY-NAMING-0001, D-AS-CHILD-OMISSION-0001]
inherits:
  prototypes:
    - id: P-BASE-BUTTON
verifies: { tests: [T-BRUTALIST-BUTTON-0001] }
revisions:
  - version: 0.2.0-rc.3
    change: introduced
    summary: Introduced the draft Brutalist Button design-language projection.
tags: [prototype, brutalist, neo-brutalist, button, visual, delta]
```

Create matching `spec/tests/T-BRUTALIST-BUTTON-0001.yaml` with cases for identity/inheritance, visual grammar, variant/size, interaction styles, and color scheme, implementation path `packages/prototypes/brutalist/test/button.test.ts`.

- [ ] **Step 2: Generate remaining P/T entities**

Use the same pattern for Toggle, Switch (+ Thumb), Tabs (+ List/Trigger/Content), HoverCard (+ Trigger/Content), DropdownMenu (+ Trigger/Content/Item), Select (+ Trigger/Value/Content/Item), Dialog (+ Trigger/Mask/Content/Title/Description/Close/CloseIcon/Header/Footer if implemented).

Rules:

- Every P entity uses `status: draft` and `since: 0.2.0-rc.3`.
- Every styled part with Base inheritance declares `inherits.prototypes` to the corresponding Base P entity.
- Layout-only Dialog Header/Footer entities must not claim Base inheritance.
- Every T entity implementation path points to an actual test file.

- [ ] **Step 3: Validate catalog**

Run:

```bash
corepack pnpm@10.32.1 check:prototype-catalog
```

Expected: PASS.

- [ ] **Step 4: Commit catalog entities**

```bash
git add spec/prototypes/P-BRUTALIST-*.yaml spec/tests/T-BRUTALIST-*.yaml
git commit -m "spec: catalog Brutalist prototype library"
```

---

## Task 6: CLI style preset and registry

**Files:**
- Create `scripts/styles/generate-brutalist-style-tokens.ts`
- Create `packages/cli/src/generated/brutalist-style-tokens.ts`
- Modify `package.json`
- Modify `packages/cli/src/legacy/type.ts`
- Modify `packages/cli/src/legacy/cli.ts`
- Modify `packages/cli/src/registry/components.ts`
- Modify `packages/cli/src/commands/add.ts`
- Modify `packages/cli/test/cli.test.ts`
- Create catalog decision/test entities for CLI preset closure

- [ ] **Step 1: Write failing CLI tests**

In `packages/cli/test/cli.test.ts`, add tests that:

```ts
it('adds the Brutalist Button React facade', async () => {
  expect(runCli(cwd, ['init', '--no-interactive', '--no-styles']).status).toBe(0);
  const result = runCli(cwd, ['add', 'react', 'brutalist-button', '--no-install']);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('@proto.ui/prototypes-brutalist');
  expect(readFileSync(path.join(cwd, 'proto-ui/components/react/index.ts'), 'utf8')).toContain('BrutalistButton');
});

it('writes the Brutalist style preset when selected', async () => {
  const result = runCli(cwd, ['init', '--no-interactive', '--style-preset', 'brutalist']);
  expect(result.status).toBe(0);
  const theme = readFileSync(path.join(cwd, 'src/styles/brutalist-theme.css'), 'utf8');
  expect(theme).toContain('--background: #f4f1ea');
  expect(theme).toContain(':root.dark');
  const tokens = readFileSync(path.join(cwd, 'src/styles/proto-ui-tokens.generated.css'), 'utf8');
  expect(tokens).toContain('shadow-[5px_5px_0_0_#000]');
});
```

Adjust option names to existing CLI parser if it does not support `--style-preset` yet; otherwise add that parser option in implementation.

- [ ] **Step 2: Run CLI tests to verify failure**

```bash
corepack pnpm@10.32.1 vitest run packages/cli/test/cli.test.ts --testNamePattern Brutalist
```

Expected: FAIL unknown component / missing style preset.

- [ ] **Step 3: Add generator and generated tokens**

Create `scripts/styles/generate-brutalist-style-tokens.ts` by copying Shadcn generator and replacing:

```ts
const inputPath = path.join(root, 'packages/prototypes/brutalist/src');
const outputPath = path.join(root, 'packages/cli/src/generated/brutalist-style-tokens.ts');
```

Generated source exports:

```ts
export const BRUTALIST_STYLE_TOKENS: string[] = [...];
```

Run:

```bash
node --import tsx scripts/styles/generate-brutalist-style-tokens.ts
```

- [ ] **Step 4: Wire package scripts**

Modify root `package.json` scripts:

```json
"styles:preset:generate": "node --import tsx scripts/styles/generate-shadcn-style-tokens.ts && node --import tsx scripts/styles/generate-brutalist-style-tokens.ts",
"check:styles:preset": "node --import tsx scripts/styles/generate-shadcn-style-tokens.ts --check && node --import tsx scripts/styles/generate-brutalist-style-tokens.ts --check"
```

- [ ] **Step 5: Add Brutalist theme CSS and init support**

In `packages/cli/src/legacy/type.ts`, export:

```ts
export { BRUTALIST_STYLE_TOKENS } from '../generated/brutalist-style-tokens.js';
export const BRUTALIST_THEME_CSS = `:root { ... } :root.dark, :root[data-theme='dark'] { ... }`;
```

Use exact variables from design doc:

```css
--background: #f4f1ea;
--secondary-background: #ffffff;
--foreground: #000000;
--border: #000000;
--ring: #000000;
--main: #ffd23f;
--main-foreground: #000000;
--destructive: #ff6b6b;
--overlay: rgba(0, 0, 0, 0.75);
```

Dark:

```css
--background: #1c1914;
--secondary-background: #2a241c;
--foreground: #f4f1ea;
--border: #000000;
--ring: #f4f1ea;
--main: #ffd23f;
--main-foreground: #000000;
--destructive: #ff6b6b;
--overlay: rgba(0, 0, 0, 0.85);
```

In `legacy/cli.ts`, select tokens/theme by style preset: `shadcn` → existing, `brutalist` → new. Output theme file name should be `brutalist-theme.css` when selected.

- [ ] **Step 6: Add registry entries**

In `components.ts`, add `brutalist` and `brutalistCompound` helpers parallel to `shadcn`, then entries for all eight families. Use element names `proto-ui-brutalist-*` and export base names `Brutalist*`.

- [ ] **Step 7: Generalize add warning**

Change `add.ts` from `componentEntry.stylePreset === 'shadcn'` to `componentEntry.stylePreset !== null` and include the preset name in the message.

- [ ] **Step 8: Verify CLI tests and preset checks**

Run:

```bash
corepack pnpm@10.32.1 vitest run packages/cli/test/cli.test.ts --testNamePattern Brutalist
corepack pnpm@10.32.1 check:styles:preset
```

Expected: PASS.

- [ ] **Step 9: Add CLI catalog decision/test entities and validate**

Create `D-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml` and `T-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml` by mirroring Shadcn closure entities with Brutalist paths and cases.

Run `corepack pnpm@10.32.1 check:prototype-catalog`.

- [ ] **Step 10: Commit CLI support**

```bash
git add package.json scripts/styles/generate-brutalist-style-tokens.ts packages/cli spec/decisions/D-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml spec/tests/T-CLI-BRUTALIST-PRESET-CLOSURE-0001.yaml
git commit -m "feat: add Brutalist CLI style preset"
```

---

## Task 7: Website demos and browser verification

**Files:**
- Modify `apps/www/package.json`
- Modify `apps/www/astro.config.mjs`
- Modify `apps/www/src/components/PrototypePreviewer/prototype-modules.ts`
- Create docs/demo files under existing app pattern

- [ ] **Step 1: Write/modify demo fixtures**

Create Brutalist demo pages by following Shadcn demo files. Include one page or section covering:

- Button variants and sizes.
- Toggle pressed state.
- Switch root/thumb.
- Tabs root/list/trigger/content.
- HoverCard trigger/content.
- Dropdown trigger/content/item.
- Select trigger/value/content/item.
- Dialog root/trigger/mask/content/title/description/close.

Use light and dark wrappers:

```html
<section data-theme="light">...</section>
<section class="dark" data-theme="dark">...</section>
```

- [ ] **Step 2: Register Brutalist prototype modules**

Add manual loaders to `prototype-modules.ts`, e.g.:

```ts
'brutalist-button': async () => {
  const mod = await import('../../../../../packages/prototypes/brutalist/src/button/index');
  registerPrototype('brutalist-button', mod.default);
},
```

Repeat for all part IDs.

- [ ] **Step 3: Add app dependency / alias**

Add `@proto.ui/prototypes-brutalist`: `workspace:*` to `apps/www/package.json` and add any alias/optimizeDeps where `@proto.ui/prototypes-shadcn` is listed in `astro.config.mjs`.

- [ ] **Step 4: Run docs type/build check**

```bash
corepack pnpm@10.32.1 --filter apps-www check
```

Expected: PASS.

- [ ] **Step 5: Browser smoke**

Start docs dev server:

```bash
corepack pnpm@10.32.1 docs:dev
```

Open the Brutalist demo route in browser. Verify:

- Light paper `#f4f1ea`.
- Dark warm paper `#1c1914`.
- 0px radius.
- Hard shadows `5px/8px` with zero blur.
- No gradients/glass/rounded cards.
- Dialog/dropdown/select/hover-card content visible and hard-shadowed.

- [ ] **Step 6: Commit demos**

```bash
git add apps/www
git commit -m "docs: add Brutalist prototype demos"
```

---

## Task 8: Final verification and draft PR

**Files:**
- Modify generated `internal/agent/PROJECT-UNDERSTANDING.zh-CN.md` only through generator if required.
- No new feature code unless verification exposes a bug.

- [ ] **Step 1: Regenerate spec agent docs**

Run:

```bash
corepack pnpm@10.32.1 spec:docs:agent
```

- [ ] **Step 2: Run required checks**

Run:

```bash
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 check:styles:preset
corepack pnpm@10.32.1 check:agent-doc
corepack pnpm@10.32.1 check:types
corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test packages/cli/test/cli.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run browser verification again if any docs files changed after the first smoke**

Use the same route and checks from Task 7.

- [ ] **Step 4: Commit generated docs if changed**

```bash
git add internal/agent/PROJECT-UNDERSTANDING.zh-CN.md
git commit -m "docs: refresh agent project understanding for Brutalist catalog" || true
```

- [ ] **Step 5: Push and draft PR**

```bash
git push -u origin feat/brutalist-design-system
gh pr create --draft --title "Add Neo-Brutalist prototype library" --body "$(cat <<'PR'
## Summary
- Adds `@proto.ui/prototypes-brutalist` with Base-inheriting Neo-Brutalist families.
- Catalogs Brutalist prototype/test entities and CLI preset closure governance.
- Adds CLI `brutalist` style preset support and www demos with light/dark theme coverage.

## Verification
- [ ] `corepack pnpm@10.32.1 check:prototype-catalog`
- [ ] `corepack pnpm@10.32.1 check:styles:preset`
- [ ] `corepack pnpm@10.32.1 check:agent-doc`
- [ ] `corepack pnpm@10.32.1 check:types`
- [ ] `corepack pnpm@10.32.1 vitest run packages/prototypes/brutalist/test packages/cli/test/cli.test.ts`
- [ ] Browser smoke: Brutalist demo light/dark, zero radius, hard shadows, no gradients/glass.

## Non-goals
- No launch-package freeze promotion.
- No `asChild` / Radix Slot parity.
- No form/input/table/chart inventory beyond the eight requested families.
PR
)"
```

Expected: draft PR URL.

---

## Self-review

- Spec coverage: covers design doc sections 1-10, eight families, CLI preset, catalog, demos, browser verification, draft PR.
- Placeholder scan: no `TBD` / `TODO`; broad generation steps have exact constraints and file targets.
- Type consistency: Brutalist names use `Brutalist*` types/exports, `brutalist-*` prototype names, `@proto.ui/prototypes-brutalist` package.
