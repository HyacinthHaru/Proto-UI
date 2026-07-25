# ChatUI and SaaS component expansion implementation plan

> **For implementation:** follow TDD for every component phase. Do not combine component commits. After each phase: focused tests, generators/checks, commit, push, and PR comment.

**Goal:** Give Base, Shadcn, and Brutalist a shared ChatUI-capable component surface, complete Brutalist parity for the required official primitives, and generalize CLI component presets so every library can project the same recipes without handwritten registry drift.

**Architecture:** Base owns contracts, states, events, accessibility, contexts, and renderer anatomy. Shadcn and Brutalist import the Base `asHook` for the same part and contribute only feedback style tokens. Existing official Base/Shadcn families are reused; only Brutalist styled deltas are added for those families. New Message, Composer, and CodeBlock families are implemented across all three libraries. Preset generation becomes library-descriptor-driven.

**Tooling:** TypeScript, Vitest, Proto UI prototype DSL, spec YAML catalog, Astro/Starlight docs, generated CLI token and component-preset registries.

---

## Phase 0: Framework and governance

### Task 0.1: Generalize component-preset generation

**Files:**

- Modify: `scripts/components/generate-shadcn-component-presets.mjs` (extract reusable descriptor-driven generator)
- Create or rename through implementation conventions: `scripts/components/generate-component-presets.mjs`
- Modify: `packages/cli/src/services/component-presets.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/generated/package-presets.ts`
- Generate: `packages/cli/src/generated/{base,shadcn,brutalist}-component-presets.ts`
- Tests: `packages/cli/test/cli.test.ts` and focused preset tests
- Spec/docs: relevant CLI contract entity and `internal/records/2026-07-25-component-preset-first-party-component-coverage.zh-CN.md` follow-up record

**TDD:** first assert library selection, correct package imports, no cross-library leakage, deterministic generation, and check-mode drift detection. Then implement one descriptor schema and three generated registries.

### Task 0.2: Update PR metadata for expanded scope

- Title: reflect Neo-Brutalist + cross-library ChatUI/SaaS expansion.
- Body: component matrix, architectural invariants, phase commits, and live verification list.

## Phase 1: Brutalist ChatUI parity

Each component follows the same order: docs/spec projection -> failing styled-prototype test -> implementation using existing Base `asHook` -> package/export/preset registration -> generated token closure -> docs/demo -> focused verification -> commit/push/PR comment.

### Task 1.1: Avatar

**Files:**

- Create: `packages/prototypes/brutalist/src/avatar/{root,image,fallback}.proto.ts`, `index.ts`
- Modify: Brutalist package exports/index
- Create: `packages/prototypes/brutalist/test/avatar.test.ts`
- Create: `spec/prototypes/P-BRUTALIST-AVATAR.yaml`, matching `spec/tests/T-BRUTALIST-AVATAR.yaml`
- Docs: English/Chinese Brutalist Avatar pages and demo modules
- Preset: Brutalist Avatar registry entry

### Task 1.2: Badge

Create styled family/test/spec/docs/preset for `badge`, inheriting Base Badge.

### Task 1.3: Card

Create styled root/header/title/description/action/content/footer family/test/spec/docs/preset, inheriting Base Card parts.

### Task 1.4: Input

Create styled Input family/test/spec/docs/preset preserving Base disabled/invalid/focus semantics.

### Task 1.5: Textarea

Create styled Textarea family/test/spec/docs/preset preserving Base value/disabled/invalid/focus semantics.

### Task 1.6: Scroll Area

Create styled root/viewport/scrollbar/thumb/corner family/test/spec/docs/preset; Base keeps scroll mechanics.

### Task 1.7: Separator

Create styled Separator family/test/spec/docs/preset preserving orientation/decorative semantics.

### Task 1.8: Skeleton

Create styled Skeleton family/test/spec/docs/preset; flat stepped motion only, reduced-motion safe.

### Task 1.9: Tooltip

Create styled root/trigger/portal/content/arrow family/test/spec/docs/preset; Base keeps delay, portal, positioning, escape, and focus behavior.

## Phase 2: Cross-library Message family

### Task 2.1: Base Message contract

**Files:**

- Create: `packages/prototypes/base/src/message/**`
- Modify: Base package exports/index
- Create: Base tests
- Create: `spec/prototypes/P-BASE-MESSAGE.yaml`, `spec/tests/T-BASE-MESSAGE.yaml`
- Docs: Base Message semantics and anatomy

**Contract:** direction/status state, semantic article/listitem projection, author/timestamp/content/actions/status parts, live error/status announcement, no transport ownership.

### Task 2.2: Shadcn Message delta

Create Shadcn styled parts, tests, specs/docs/demo/preset; inherit Base hooks only.

### Task 2.3: Brutalist Message delta

Create Brutalist styled parts, tests, specs/docs/demo/preset; inherit Base hooks only.

Commit/push/comment after all three projections pass.

## Phase 3: Cross-library Composer family

### Task 3.1: Base Composer contract

Create Base root/input/toolbar/actions/submit/error anatomy. Reuse Textarea/Button/Field semantics; own only composition lifecycle, busy/invalid state, and submit event.

### Task 3.2: Shadcn Composer delta

Styled family + tests/spec/docs/demo/preset.

### Task 3.3: Brutalist Composer delta

Styled family + tests/spec/docs/demo/preset.

Commit/push/comment after all three projections pass.

## Phase 4: Cross-library CodeBlock family

### Task 4.1: Base CodeBlock contract

Create root/header/code/actions anatomy, semantic `pre > code`, language label, code exposure, and copy-request event without clipboard ownership.

### Task 4.2: Shadcn CodeBlock delta

Styled family + tests/spec/docs/demo/preset.

### Task 4.3: Brutalist CodeBlock delta

Styled family + tests/spec/docs/demo/preset.

Commit/push/comment after all three projections pass.

## Phase 5: ChatUI composition proof

**Files:**

- Add Base, Shadcn, and Brutalist ChatUI docs/demo pages.
- Add component preset/recipe closure tests for each library.
- Use existing Item/InputGroup/Field/Button plus new Message/Composer/CodeBlock; do not duplicate those primitives.
- Browser-smoke all three pages in light/dark where applicable.

## Phase 6: Final verification

Run:

```sh
corepack pnpm@10.32.1 check:styles:preset
corepack pnpm@10.32.1 check:component-presets
corepack pnpm@10.32.1 check:prototype-catalog
corepack pnpm@10.32.1 spec:docs:agent
corepack pnpm@10.32.1 check:agent-doc
corepack pnpm@10.32.1 check:types
corepack pnpm@10.32.1 test
```

Then browser-smoke Base, Shadcn, and Brutalist ChatUI pages, push final metadata update, and append final PR evidence comment.
