# Proto UI 0.2.0-rc.8（草案）

> 本说明追踪 `0.2.0-rc.7` 之后、计划纳入 rc.8 的候选变更。`0.2.0-rc.8` 尚未发布。精确的 package 版本、BOM、Git tag、GitHub prerelease 与不可变 spec snapshot 必须由发行列车准备工作单独建立并验证。

## 新增

### Base Tooltip 家族

- `P-BASE-TOOLTIP` 编目 Root、Trigger、Content 以及相邻的 Tooltip Group 协议。Root 唯一持有受控或非受控可见性、可取消的 pointer 延时（默认 700ms 打开 / 100ms 关闭）、即时 focus 打开、disabled 状态，以及统一的 `openChange` request channel。
- Tooltip Group 在兄弟 Tooltip 之间协调唯一 active 所有权：第一个 pointer Tooltip 遵守 `openDelay`，warm window 内兄弟可立即打开，最后一个 active 关闭并经过 `skipDelay`（默认 300ms）后恢复 cold 延时。
- 非受控兄弟 handoff 为即时切换：离开的 Content 在同一次 view reconciliation 中结束感知 presence。受控 owner 仅接收关闭请求，并保留最终 open 权威。
- 追加式 A11y relation 投影（`C-A11Y-0001-K`）：Tooltip Trigger 将自身 content ID 追加到 `aria-describedby`，不覆盖宿主已有的 IDREF token，关闭时仅移除自身 token。

### Base Scroll Area 家族

- `P-BASE-SCROLL-AREA` 编目 Root、Viewport、Scrollbar 与 Thumb。Scroll domain（`C-SCROLL-0001`）持有逻辑 surface 身份、portable facts、requests 与 projection 协商；有界 host session 持有几何、输入物理与具体投影。
- Composed chrome（`C-SCROLL-COMPOSED-CHROME-0001`）在同一 Context family scope 内绑定 Viewport、方向性 Scrollbar 与其后代 Thumb，并从 normalized host facts 投影被动 Thumb 几何。
- Move Gesture host capability（`C-MOVE-GESTURE-0001`）为 Thumb 拖拽提供一个有界连续运动 session，产生 `control-drag` request，同时以实际 surface facts 作为位置真相。
- Web Component、React 与 Vue adapter 各自接入 Scroll Surface host capability，并携带 adapter-profile projection 偏好。

### Brutalist 风格原型

- Base Separator 保留为真实可迁移协议，持有 semantic/decorative 无障碍投影与实时 orientation 同步。
- Brutalist Skeleton、Badge 与 Card 重建为直接 styled-only 原型，不导入 Base：Skeleton 持有 `aria-hidden` 树行为与无内容渲染；Badge 持有被动 `accent | info | danger` tone；Card 收窄为 Root/Header/Content/Footer，使用方向性 border 分隔线。

## 构建与发行

- `@proto.ui/module-scroll` 为新增 public package（rc.8 共 38 个 public package，rc.7 为 37 个）。
- `@proto.ui/prototypes-brutalist` 保持私有 `0.0.0`，`protoUi.release.scan: false`，不纳入 rc.8 BOM。

## 验证

- 发布审查前，完整 workspace 测试套件、prototype catalog、style preset、type checks 与生成的 Agent 文档检查必须全部通过。
- Scroll Area 与 Tooltip 家族各自携带专用 contract 与 adapter 测试，覆盖延时边界、受控所有权、group 协调、追加式 A11y 投影与 composed Thumb 几何。

## 升级说明

- 使用 public package exports 的消费者无需更改导入。新增的 `@proto.ui/module-scroll` 为追加性变更。
- Tooltip 与 Scroll Area 为 draft 状态原型，其 API 可能在后续 release candidate 中细化。

## 仍需完成的发行准备

- 本草案不意味着 rc.8 是可安装的发行。前置 PR（#337、#338、#351、#352）必须先合入 `main`，发行列车准备 PR 才能最终确定 BOM 并通过完整发行演练。
