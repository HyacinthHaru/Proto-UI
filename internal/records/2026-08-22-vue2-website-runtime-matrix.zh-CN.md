# 2026-08-22 Vue 2 官网 Runtime Matrix

> Internal record. Not normative. 本记录更新 PR #462 的官网 Previewer 定位；稳定 adapter 语义仍以 `spec/**` 为准。

## 决定

官网 Runtime selector、首页 Previewer、Demo Matrix 与可选 runtime 文档示例重新包含 `vue2`。这满足官网以同一 demo 对比 Web Components、React、Vue 3 与 Vue 2.6 的需求。

`@proto.ui/adapter-vue2` 仍是 private package，且不进入 npm release scan。本次决定只承诺官网随仓库构建的 Vue 2.6 Previewer runtime，不承诺独立 npm 安装面。该边界在 `packages/adapters/vue2/README.md` 中明确。

## 供应与验证

- `apps/www` 与 `packages/web-conformance` 通过 `vue2: npm:vue@2.6.14` 使用本地锁定的 Vue 2.6 runtime；不再从 `esm.sh` 加载。
- `vue2-runtime.ts` 保留 per-host epoch guard；旧的异步 mount 在 runtime 切换或 unmount 后不得 append DOM。
- 两条共享 Web conformance journey 都把 `vue2` 纳入 `WEB_ADAPTERS`；它们以同一 DOM scenario 覆盖 scroll move 与 Shadcn Dialog keyboard/focus journey。

## 验证

- `corepack pnpm@10.32.1 test` — 通过（含 Vue 2 adapter 测试及四运行时 Web conformance journeys）。
- `corepack pnpm@10.32.1 check:types` — 通过。
- `corepack pnpm@10.32.1 spec:docs:agent && corepack pnpm@10.32.1 check:agent-doc` — 通过。
