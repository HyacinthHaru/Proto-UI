# 白皮书第一部初稿检查点

日期：2026-08-30

本文记录 [Issue #473](https://github.com/Proto-UI/Proto-UI/issues/473) 所属白皮书重写企划的一个阶段性检查点：章节蓝图已经展开，第一部前三章已经形成可供后续人工重写和集中打磨的中文初稿。

本文和所链接的章节均位于 `internal/records/**`，用于保存当前写作过程、依据和待办，不是 canonical 白皮书、Spec 实体、稳定保证或公共路线图。现有网站白皮书仍保持原状。

## 本次归档

- [白皮书重写章节蓝图（候选）](./2026-08-28-whitepaper-chapter-blueprint.zh-CN.md)：展开“序章 + 三部九章 + 结语”的主论证、逐章任务、例子线路、证据状态和已知治理缺口。
- [第一部第一章：代码之前的组件（初稿）](./2026-08-30-whitepaper-part-one-chapter-1-initial-draft.zh-CN.md)：从跨技术实现中的“还原”判断出发，把组件收紧为可辨认的交互主体。
- [第一部第二章：从交互关系出发（初稿）](./2026-08-30-whitepaper-part-one-chapter-2-initial-draft.zh-CN.md)：从参与者、方向和语义责任推导当前五条核心可移植 information channel。
- [第一部第三章：组件的边界（初稿）](./2026-08-30-whitepaper-part-one-chapter-3-initial-draft.zh-CN.md)：用独立参与者关系判断 Component 边界，并在章末引入 Prototype 作为当前可执行近似。

## 当前状态

这三章已经完成本轮协作初稿，但没有进入最终措辞阶段。它们保留维护者原稿的论证入口、例子、取舍和偏平白的语气，同时吸收了协作中完成的结构复盘、反驳检验、认知负荷调整、术语对账和事实边界说明。

后续工作继续以“先完成全书初稿，再集中打磨”为顺序：

1. 从第二部第四章开始，继续按章节蓝图逐章起稿、对照和复盘；
2. 在全部中文初稿完成前，不把局部章节提前包装成最终正文；
3. 全稿完成后，由维护者集中重写和调整中文措辞、论证节奏、章节篇幅、插图与排版；
4. 中文章节接受后，再处理英文 conceptual parity、网站页面边界与正式发布。

## 权威与证据边界

第一部的主要 catalog 依据包括：

- draft knowledge：`K-COMPONENT-INTERACTION-0001`、`K-COMPONENT-ACTOR-0001`、`K-INFORMATION-CHANNEL-0001`；
- active slice：`C-PROPS-0001`；
- draft channels and adjacent semantics：`C-CORE-CHANNEL-0001`、`C-EVENT-0001`、`C-FEEDBACK-0001`、`C-EXPOSE-0001`、`C-CONTEXT-0001`、`C-STATE-0001`、`C-LIFECYCLE-0001`、`C-ANATOMY-0001`；
- draft examples：`P-BASE-SWITCH`、`P-BASE-SWITCH-THUMB` 与当前 `P-BASE-SELECT*` family。

完整的 Component/Prototype split rule 当前没有单一 `active` governing entity；Select Caret 和极简 feedback-only Switch Thumb 只是解释性设计案例；React、Flutter、Qt 的对照也不构成非 Web Host 的符合性证据。初稿中的写作主张不会自动修改或晋升任何 Spec 实体，后续若暴露真实矛盾，应单独进入维护者仲裁或 Spec 治理。

## 写作与协作来源

维护者负责理论判断、原稿、例子选择、结构仲裁和最终中文表达。Codex 参与了来源追踪、反例与替代论证、章节对照稿、编辑建议、草稿整理和事实校对。本轮归档保存的是供维护者继续手工重写的协作中间产物，不把模型生成文字冒充为已经完成的最终白皮书。

本检查点推进但不关闭 Issue #473。企划仍需完成其余章节初稿、维护者集中打磨、插图、中文正文接受、英文 conceptual parity 和后续发布工作。
