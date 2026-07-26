# 2026-07-26 Tooltip / Scroll Area 交互补全（归属 #323）

## 决定

在 incubation PR #323 下新开独立行为 PR，而不是只保留 #339/#340 的 anatomy/visual shell：

1. Base Tooltip behavior
2. Base Scroll Area behavior

目的：作为后续基于 Proto UI 的 demo 应用基石，同时打通 Base 尚未实现的交互点。

## 设计要点

- Tooltip：复用 Hover Card 的 open/delay/context + Content overlay/portal 模型
- Scroll Area：Viewport 原生 overflow 拥有 metrics；Thumb 投影几何并支持拖拽回写

## 状态

- 设计已获用户批准
- 实现从 Tooltip 行为 PR 开始
