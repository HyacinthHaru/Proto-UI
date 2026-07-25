# 2026-07-25：rc.4 Dialog CloseIcon 与 Switch 人工试用回归

> Internal record. Not normative. 本文记录 `0.2.0-rc.4` 仓库外人工试用发现的两个回归、复现证据与当前修复选择。稳定规则见 `D-COMPONENT-PRESET-MATERIALIZATION-0001`、`P-SHADCN-DIALOG-CLOSE-ICON`、`P-SHADCN-SWITCH` 与 `P-SHADCN-SWITCH-THUMB`。

## 1）外部观察

- `proto-ui add <host> shadcn-dialog` 引入默认 `dialog-close-icon` 后，消费项目会直接报错；CLI 没有 remove 命令，使已生成 facade 缺少即时回滚路径。
- `shadcn-switch` 无论使用 convenience preset，还是显式组合 Root 与 Thumb，checked 改变后 Thumb 都没有可观察的位置变化。

这两个行为由 rc.3 的 component preset 与 Dialog CloseIcon 变更引入，并随 rc.4 原样发布；rc.4 相对 rc.3 在这些路径上只有版本元数据变化。

## 2）根因

Web Component preset 的 generated `connectedCallback()` 先向已连接的宿主追加默认 part，再调用 Raw Root 的 `connectedCallback()`。追加动作会立刻连接 CloseIcon 或 Thumb，而 parent runtime/context 尚未建立，因此抛出 `CONTEXT_PROVIDER_MISSING`。原 CLI 测试只断言生成字符串包含默认 part，没有执行 packed consumer 的 preset 连接路径；release smoke 对 Vue/Web Component 也只覆盖 Button。

Switch 的位置由 Root 在 checked/unchecked 间切换左右 padding 间接表达，Thumb 自己始终只有 `translate-x-0`。这种布局耦合没有形成“Thumb 从自己的 inherited checked state 投射位置”的可执行保证，测试也只检查状态同步和 token 存在，没有断言 checked translation。

## 3）当前修复

- Web Component preset 先执行 Raw Root/Content 的连接逻辑，建立 runtime/context，再连接已经解析出的默认 part；默认 part 只挂载一次，不采用失败后重挂载。
- Switch Root 改为固定对称 `px-0.5`；Thumb 从 inherited checked state 投射 `data-[checked]:translate-x-5`，unchecked 保持 `translate-x-0`。
- Style CSS renderer 增加 spacing-based translate utility 支持，使生成 preset CSS 包含 `translate-x-5` 的物理规则。
- packed CLI consumer smoke 将 Switch 与 Dialog preset 纳入 React、Vue、Web Component 的真实生成与连接路径，并检查默认 part、context state 与 translation token。

## 4）边界

- 本次不增加 CLI remove 命令；remove/rollback UX 仍需独立设计配置、依赖清理与用户代码引用的语义。
- 本次不宣称 Shadcn Switch 的全部 size、dark surface 或 form API 已与固定 upstream baseline 精确一致。
- Web Component 受 custom-element constructor 约束，不能安全地在 constructor 中写入默认子节点；因此先建立 Root context、再连接已解析 part 是当前 adapter lifecycle 的必要 staging，不把 Anatomy 变成 materializer。
