# 2026-07-25：Switch / Dialog 原型质量与 preset 管理收敛

> Internal record. Not normative. 本文记录 rc.5 发布后 demo-matrix 人工试用发现的视觉与焦点问题，以及 preset authoring 位置的收敛。稳定规则见对应 `D-*`、`P-*` 与 `T-*` 实体。

## 1）Switch 几何与 focus ring

demo-matrix 的实际盒模型为 44px Root、20px Thumb、1px border 与 2px inline padding。关闭态 Thumb 左侧距 border 内沿 2px；`translate-x-5` 移动 20px 后，打开态 Thumb 右侧贴到 border 内沿，造成视觉上向右多出 2px。

Thumb 的 `shadow-lg` 会组合 ring shadow。CSS custom properties 可继承，因此 Root focus-visible 的 `--pui-ring-offset-width: 2px` 会进入 Thumb；只声明 `ring-0` 不会清除 inherited ring offset，造成 Thumb 跟随 Root 出现额外环形变化。

当前修正：

- checked 位移改为 `translate-x-[calc(100%_-_2px)]`，物理值为当前 Thumb 宽度减 2px，即 18px，两端内部净距均为 2px；
- Thumb 同时声明 `ring-0 ring-offset-0`，隔离 Root 的 focus ring variables；
- transform 仍属于 Thumb prototype 的 state-driven visual rule，而不是 preset 约束。Raw Root/Thumb 与 convenience preset 使用同一个 prototype，因此两条消费路径保持相同样式语义。

## 2）Dialog Trigger 与 Close/Button focus

固定 upstream DialogTrigger 是透明语义 wrapper，不提供 Button variants。Proto UI 旧的 Shadcn Dialog Trigger 自带 compact Button surface，属于早期额外设计，并且与显式组合 Button 的方向冲突。当前移除其 variant 与全部视觉 tokens，保留 Base Dialog Trigger 的 command、disabled、open request 与 a11y behavior。

`DialogClose > Button` 已通过 trigger-group surface ownership 去除外层 Close 的宿主 `tabIndex` 与 role，但 FocusCenter 仍把两个 logical focusable entries 当成两个 scope members。键盘打开 Dialog 时，scope 首先请求外层 Close；其 root target 实际解析到内层 Button，随后 focus facts 却留在外层 Close，导致实际聚焦的 Button 没有 `focusVisible` feedback。

当前 FocusCenter 对共享同一宿主 focus target 的成员去重，并在直接祖先/后代冲突时保留更深的 surface owner。这样 scope entry、Tab next/prev 与 roving navigation 都只计算一次，键盘 focus facts 落在实际 Button surface。

## 3）CloseIcon 位置

固定 upstream baseline 的 Content X Close 使用 `top-4 right-4`，X icon 为 16px。当前实现原为 `right-0 top-4 size-8`，右边缘贴 Content border 且扩大为 32px surface。当前改为 `top-4 right-4`，移除固定 `size-8`，并同步 opacity transition 与 focus ring surface。

## 4）Preset authoring 与物化边界

此前 Switch/Dialog recipe 只手写在 `packages/cli/src/registry/components.ts`，与 `D-COMPONENT-PRESET-MATERIALIZATION-0001` 中“prototype library 声明默认 part identity 与替换策略”的方向不一致，也让原型库作者无法从原型包找到 preset。

当前边界：

- `packages/prototypes/shadcn/src/component-presets.ts` 是 Shadcn component preset recipe 的 authoring source，声明 Root/default part identity、具名输入与 omission policy；
- recipe 不声明 class、style 或 token，不对原型视觉施加第二层限制；
- `packages/cli/src/registry/shadcn-component-presets.generated.ts` 是受生成检查约束的 CLI 投影；
- CLI registry 继续拥有 React/Vue/Web Component export 与 element name 映射，并根据 recipe 引用解析实际 facade；
- raw facade 与 convenience preset 继续同时保留。

生成与检查命令：

```sh
corepack pnpm@10.32.1 component-presets:generate
corepack pnpm@10.32.1 check:component-presets
```

## 5）Dialog 跨 adapter 二次人工验收

demo 继续保持透明 `DialogTrigger` / `DialogClose` 包裹显式 `ShadcnButton`，没有把 Button 样式重新写回语义 wrapper。此次验收暴露的并不是单一 Dialog prototype 问题，而是 trigger group、Event 与 Focus 的三个交界问题：

- `asTrigger` 的祖先识别仍匹配旧 trace spelling `asTrigger`，而 runtime 的规范 hook identity 是 `as-trigger`。因此 WC 中内层 Button 没有加入外层 Dialog Trigger group，真实 click 只进入 Button event surface，Dialog behavior owner 收不到提交；键盘恰好经外层 root keydown fallback 打开，形成鼠标与键盘分叉。
- Event 过去把整个 root redirect 到 group owner，连 `host:focus` / `host:blur` 也一起重定向。React/Vue 的内层 Button 因而无法观察自己的后续原生焦点迁移，DOM 已聚焦但 `focusVisible` facts 没有更新。
- Focus scope 在全局 `Tab` listener 内同步移动焦点。目标 Button 自己的全局 modality listener 可能尚未处理同一个 keydown，导致同步触发的 host focus 仍读取旧 pointer modality。

当前修正：

- trigger ancestry 同时识别规范 `as-trigger` identity 与 logical trigger mark；最内层 surface 承载共享 semantic event target，最外层 owner 继续消费 Dialog open/close behavior；
- Event 新增 semantic-only root redirect，`host:*` 始终保留在实例自身 host root；
- Focus 在带 `reason: keyboard` 的同步 native focus request 之前先更新目标实例 modality；
- Web router 对同一 host root 只允许最新 router view 处于启用状态，避免 view epoch 交叠时重复解释原生事件；
- style token discovery 识别 `asDialogClose` 的 focusVisible handle，使 CloseIcon 的 `data-[focus-visible]:ring-*` 规则进入生成 CSS。

真实 demo-matrix 复验结果：WC 首次鼠标 click 可打开；WC/React/Vue 均可从 Cancel → Save changes → CloseIcon → Cancel 循环，三者每一步都有可见 focus ring；CloseIcon 的逻辑 `focusVisible` 与实际 box shadow 一致；键盘关闭后焦点恢复到内层 Trigger Button；清除视觉焦点后再次 Tab、打开、移动与关闭仍保持同一状态机，没有回退到 skip-to-content。

## 6）Web adapter 共享场景测试

把上述人工验收路径保留为独立的 Web conformance/journey 测试类别。测试直接消费官网 `demo-shadcn-dialog.demo.ts`，通过统一 DOM 可观察面，对 WC、React 与 Vue 执行同一套场景：指针打开、透明 Trigger/Close 与嵌套 Button 的单一交互面、Cancel → Save changes → CloseIcon → Cancel 的 focus-visible 循环、键盘关闭后的焦点归还，以及清除 pointer modality 后的再次进入。

该类别的边界是：

- 三个官方 Web adapter 都是强制参数，缺少任意一个或任意一个失败都会使共享测试失败；
- adapter 同时提供被验证的 host-cap，因此通过测试仍可能包含 adapter 自洽但语义错误的情况；它是“交互跨宿主一致”的必要不充分条件，不能替代 runtime/contract test 与真实浏览器人工验收；
- Web adapter 共享 DOM、事件与可访问性投影平台，因此可以复用一份宿主级场景；不把这一做法推广成隐藏非 Web 宿主差异的统一 UI 测试 DSL。

独立入口为 `corepack pnpm@10.32.1 test:web-conformance`；测试文件仍处于根 Vitest 默认收集范围内，因此也受默认 `test` 门禁约束。
