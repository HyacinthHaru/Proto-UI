# 2026-07-25：Component preset 配置与组件目录共置

> Internal record. Not normative. 本文补充同日 preset 管理收敛记录中的文件组织决策；稳定语义仍见 `D-COMPONENT-PRESET-MATERIALIZATION-0001` 及对应 `P-*` 实体。

集中式 `packages/prototypes/shadcn/src/component-presets.ts` 虽然已经把 recipe authoring 从 CLI 移入 prototype library，但组件作者仍难以从 `switch/` 或 `dialog/` 目录发现对应配置。

当前进一步收敛为：

- 每个提供 convenience preset 的组件在自身目录维护独立 `preset.ts`；
- 顶层 `component-presets.ts` 只聚合 component-local recipes，继续作为生成器与 public aggregate surface；
- component subpath 同时导出自己的 `componentPreset`，便于从组件入口发现；
- recipe 使用 TypeScript，以共享字面量类型检查并直接进入既有生成流程；不另建 JSON/XML schema；
- recipe 只描述 composition identity、`direct-child` 等结构 placement 与替换策略，不携带视觉 tokens。跨 part 的具体布局保证由 prototype/spec/test 共同负责。

首批共置文件为：

- `packages/prototypes/shadcn/src/switch/preset.ts`
- `packages/prototypes/shadcn/src/dialog/preset.ts`
