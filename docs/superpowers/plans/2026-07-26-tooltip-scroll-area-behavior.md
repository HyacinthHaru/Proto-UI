# Base Tooltip and Scroll Area Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Base Tooltip and Base Scroll Area demo-ready interactive protocols under incubation PR #323.

**Architecture:** Tooltip reuses Hover Card open/delay/context + Content overlay/presence. Scroll Area keeps Viewport as native overflow owner and projects Thumb geometry/drag from metrics.

**Tech Stack:** Proto UI Base prototypes, asOverlay/asTransition/useOpenState, Vitest + WC adapter, docs PrototypePreviewer browser verification.

---

## File map

### Tooltip behavior PR (`split/base-tooltip-behavior`, based on #340 shell)

- Modify: `packages/prototypes/base/src/tooltip/shared.ts`
- Modify: `packages/prototypes/base/src/tooltip/types.ts`
- Modify: `packages/prototypes/base/src/tooltip/root.proto.ts`
- Modify: `packages/prototypes/base/src/tooltip/trigger.proto.ts`
- Modify: `packages/prototypes/base/src/tooltip/content.proto.ts`
- Modify: `packages/prototypes/base/src/tooltip/portal.proto.ts` (keep anatomy; no heavy behavior)
- Create: `packages/prototypes/base/test/tooltip.test.ts`
- Modify: `packages/prototypes/brutalist/src/tooltip/*` only if inheritance breaks
- Modify: `apps/www/src/content/docs/**/tooltip.mdx` and demo if needed
- Modify: `spec/prototypes/P-BASE-TOOLTIP*.yaml`, `spec/tests/T-*-TOOLTIP*.yaml`

### Scroll Area behavior PR (`split/base-scroll-area-behavior`, based on #339 shell)

- Modify: `packages/prototypes/base/src/scroll-area/shared.ts`
- Modify: `packages/prototypes/base/src/scroll-area/types.ts`
- Modify: `packages/prototypes/base/src/scroll-area/viewport.proto.ts`
- Modify: `packages/prototypes/base/src/scroll-area/scrollbar.proto.ts`
- Modify: `packages/prototypes/base/src/scroll-area/thumb.proto.ts`
- Modify: `packages/prototypes/base/src/scroll-area/root.proto.ts` as needed for context
- Create: `packages/prototypes/base/test/scroll-area.test.ts`
- Modify Brutalist projection/demo only as required for browser proof
- Update catalog entities/tests

---

### Task 1: Tooltip failing tests first

**Files:**

- Create: `packages/prototypes/base/test/tooltip.test.ts`

- [ ] **Step 1: Write failing interaction tests**

Cover:

1. uncontrolled open after delay on trigger pointerenter
2. close after leave when content not hovered
3. content hover bridge keeps open
4. controlled mode emits openChange and does not self-open without prop
5. Escape closes open tooltip

Use fake timers like `packages/prototypes/base/test/hover-card.test.ts`.

- [ ] **Step 2: Run tests and confirm fail**

```bash
corepack pnpm@10.32.1 exec vitest run packages/prototypes/base/test/tooltip.test.ts
```

Expected: FAIL because trigger/content currently have no behavior.

- [ ] **Step 3: Commit test scaffold**

```bash
git add packages/prototypes/base/test/tooltip.test.ts
git commit -m "test(base): add tooltip interaction coverage"
```

### Task 2: Implement Tooltip context and Root

**Files:**

- Modify: `packages/prototypes/base/src/tooltip/shared.ts`
- Modify: `packages/prototypes/base/src/tooltip/types.ts`
- Modify: `packages/prototypes/base/src/tooltip/root.proto.ts`

- [ ] **Step 1: Add TooltipContextValue + helpers** mirroring Hover Card, with tooltip-specific reasons and single `delayDuration` first.
- [ ] **Step 2: Implement Root with useOpenState, context provide/subscribe, delay scheduling, openChange emit, disabled handling.**
- [ ] **Step 3: Re-run tooltip tests; Root-related cases may still fail until Trigger/Content done.**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(base): add tooltip root open context"
```

### Task 3: Implement Tooltip Trigger and Content

**Files:**

- Modify: `packages/prototypes/base/src/tooltip/trigger.proto.ts`
- Modify: `packages/prototypes/base/src/tooltip/content.proto.ts`

- [ ] **Step 1: Trigger pointer/focus intent updates context.**
- [ ] **Step 2: Content uses asOverlay+asTransition, anchors to trigger, syncs open, supports content hover bridge, Escape via overlay config.**
- [ ] **Step 3: Run tooltip tests to green.**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(base): wire tooltip trigger and content interaction"
```

### Task 4: Tooltip browser verification and PR

- [ ] Update demo/docs if needed for reliable hover target.
- [ ] Run package build + check:types + focused tests.
- [ ] Browser: open tooltip docs, hover trigger, observe content appear/disappear.
- [ ] Push branch and open draft PR under #323.
- [ ] Comment on #323 split map.

### Task 5: Scroll Area failing tests first

**Files:**

- Create: `packages/prototypes/base/test/scroll-area.test.ts`

- [ ] **Step 1: Write failing tests for metrics publish, thumb ratio, thumb drag updates scrollTop.**
- [ ] **Step 2: Run and confirm fail.**
- [ ] **Step 3: Commit test scaffold.**

### Task 6: Implement Scroll Area metrics and thumb

**Files:**

- Modify scroll-area Base parts listed above

- [ ] **Step 1: Viewport owns overflow and metrics states; publish on scroll/mount.**
- [ ] **Step 2: Context shares metrics to scrollbar/thumb.**
- [ ] **Step 3: Thumb derives size/offset; drag writes scroll.**
- [ ] **Step 4: Tests green; browser verifies scroll + visible thumb.**
- [ ] **Step 5: Open draft PR under #323.**

---

## Spec coverage check

- Tooltip delay/open/close/escape/controlled: Tasks 1–4
- Scroll metrics/thumb/drag/native overflow: Tasks 5–6
- Both belong to #323: Task 4/6 PR bodies + split map comment
