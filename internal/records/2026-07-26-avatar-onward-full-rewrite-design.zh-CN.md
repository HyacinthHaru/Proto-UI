# 2026-07-26：Avatar 之后组件全量重写设计记录

> Internal record. Not normative. 本文记录 PR #323 中从 Avatar 开始新增组件在破损会话后形成的全量重写设计。稳定语义必须在其后形成的 spec entity、协议文档和测试中表达；本文不替代 `spec/**`。

## 1. 结论

从 Avatar 开始加入的现有组件全部按失败探索处理，不再逐项修补。

本次重写采用“协议优先的纵向切片”：每个 family 先完成协议文档与失败测试，再实现 Base、styled projection、真实 CSS、公开 package surface、demo、双语文档和浏览器验收。只有单族完整闭环才允许进入下一族。

## 2. Base 与 Library 边界

Base 只定义跨设计系统成立的原子行为协议。Library 决定如何把这些原子组装成 Message、Chat Composer、AI 工作台或其他业务组件。

Base 允许拥有：

- 可测试的用户语义：press、edit、scroll、copy、select、toggle、focus、disclosure。
- 明确的 DOM/ARIA 语义：button、textarea、link、dialog、form、code、time。
- 明确的浏览器 capability 边界：file input、drag/drop、clipboard、speech、media preview、highlight renderer。
- 通用容器状态：open、disabled、focused、loading、error、streaming。
- 通用 anatomy：root、trigger、content、header、actions、viewport、thumb。

Base 不允许拥有：

- `assistant message`、`AI reasoning` 等业务角色分类。
- Vercel AI SDK、`UIMessage.parts`、TanStack AI 等外部数据模型。
- 消息业务生命周期、重试成功、流式结束或 provider/model 规则。
- Chat 页面布局或会话业务规则。
- 特定 AI provider、model、MCP 或 skill 概念。

当 Library 组合发现 Base 原子缺失时，先抽象成通用协议，再由 Library 组装业务组件。业务需求不得反向污染 Base。

## 3. 当前实现的处置

- 不保留 Avatar 之后现有 API 作为兼容目标。
- 不保留 aliases、deprecated exports 或迁移垫片。
- 不在现有实现上逐项打补丁。
- 可复用的只有已经验证正确的底层工具、通用 hooks、host capabilities 和设计 token；family 本身重新设计。
- 破损会话创建的错误 P/T entities、catalog debt、生成 CSS、demo 和文档随对应 family 一起重建。

## 4. 协议文档策略

每个 family 必须先交付完整协议文档，再开始实现。

- `spec/prototypes/P-BASE-*`：原子协议，描述跨 Library 的确定语义。
- 每个 compound part 有独立 P entity；不允许空泛 Root entity 代表整族。
- 每个 P entity 必须有 statement、criteria、sources、inheritance/relations、revisions 和 verifies。
- `spec/tests/T-*`：逐条验证 criteria，并关联真实测试路径。
- Brutalist/Shadcn 对应实体必须明确继承 Base 的内容、仅视觉投影的内容和允许的 host 差异。
- 跨 family 稳定规则提升为 `C-*` 或 `D-*`，不得埋在代码注释或记录中。
- 代码内用精确 criterion ID 标注实现证据。
- 修改 `spec/**` 后重新生成 projections；不得手改生成文件。
- 现有只有 `*-CATALOGED` 的占位实体全部删除重写。

## 5. 纵向切片顺序

### 第一批：输入与基础视觉原子

- Input
- Textarea
- Separator
- Skeleton

### 第二批：媒体与结构原子

- Avatar
- Badge
- Card

### 第三批：交互容器

- ScrollArea
- Tooltip
- Disclosure

### 第四批：通用能力原子

- CopyButton
- Attachment
- AttachmentInput
- CodeBlock
- CodeHighlight

### 第五批：ChatUI Library 组合

- Message
- Reasoning
- ToolCall
- Sources/Citations
- Composer/PromptInput
- ModelSelector
- Conversation

该顺序不是业务交付承诺；只是降低循环依赖的实现顺序。

## 6. 各族语义边界

### Input

单行编辑协议。Root 映射为真实 input host；支持 value/defaultValue、controlled/uncontrolled、disabled、readOnly、required、name、type、placeholder、autoComplete、minLength/maxLength。Base 负责 input/change、focus、value 与 host translation；不覆盖 IME、选择区、粘贴和原生编辑。label、description、error 属于外部 Field/InputGroup 组合。

### Textarea

多行编辑协议。Root 映射为真实 textarea host；继承 Input 的 value、focus、disabled、readOnly、required 与受控/非受控规则，并支持 rows、wrap、minLength/maxLength。原生换行、选择区、IME 和滚动行为由 host 保留；resize 策略只属于 styled/host policy。

### Separator

方向与 decorative 语义协议。`orientation` 决定横纵；`decorative=true` 不进入可访问树，`decorative=false` 映射为 separator 并暴露 orientation。无 value、event、focus 或 command。视觉粗细、颜色和间距只归 styled layer。

### Skeleton

纯视觉占位协议。默认 `aria-hidden=true`；无 props、state、event、context 或 command。Skeleton 不自行发布 `role=status`、`aria-busy` 或 loading 文本；加载状态由拥有真实内容的父容器表达。

### Avatar

身份媒体与 fallback 协议。Root 持有 `idle | loading | loaded | error`；Image 负责真实图片源、alt 和 load/error；Fallback 根据 Root 状态 materialize。更换 src 必须重置状态。Avatar 不拥有点击、presence、菜单或业务身份语义。

### Badge

非交互状态标签。Base 只允许跨库成立的 `tone: neutral | info | success | warning | critical`；`default/secondary/destructive/outline` 是 styled variant。Badge 无 click、focus、event，也不自动成为 live region。可点击标签必须组合 Button/Toggle。

### Card

结构化内容表面。Parts 为 root/header/title/description/action/content/footer。Card 只建立 anatomy 与稳定关联；无隐式 open、selected、click、focus、form 或 navigation 语义。Action 区域中的按钮必须由 Button/Menu 等真实协议组合。

### ScrollArea

原生滚动容器与自定义滚动条投影。Parts 为 root/viewport/scrollbar/thumb/corner。Viewport 映射为真实 scroll container，保留 wheel/touch/keyboard/momentum。Scrollbar/thumb 与 viewport offsets 双向同步，支持 drag、track click、keyboard、resize、RTL 与 dual-axis。Scrollbar 仅在可操作时进入可访问树。

### Tooltip

非交互说明浮层。Root 管理 delayed/open/closed、controlled/uncontrolled、open reason、timer ownership；Trigger 支持 pointer/focus、Escape、aria-describedby；Content 非交互；Arrow 只负责视觉/定位。Tooltip 不承载按钮、链接或 focus trap；需要这些时必须使用 Popover/Dialog。

### Disclosure

通用可折叠 disclosure 原子。Root 管理 open/defaultOpen、controlled/uncontrolled、openChange；Trigger 映射为真实 disclosure trigger；Content 由 expanded 状态控制。它为 Reasoning、ToolCall 等 Library 组件提供可折叠行为，但不拥有业务语义。

### CopyButton

copy request/state 的可访问 trigger。激活只发布 `copyRequest`；clipboard adapter/capability 或消费者执行复制并反馈 `idle | copied | failed`。Base 不在 setup 中直接调用 Clipboard API，也不伪造成功。

### Attachment

附件展示原子。Collection/item/preview/info/remove；支持文件、图片、video、audio、document/source metadata。Remove 是真实 trigger。Preview 不伪造文件内容，也不拥有选择或上传流程。

### AttachmentInput

附件获取原子。支持 hidden file input、drag/drop、paste、screenshot/camera capture、accept、multiple、maxFiles、maxFileSize、validation errors。使用 File API/DataTransfer/paste/screenshot capability；capability 缺失时显式降级。预览 URL 生命周期必须撤销；global drop 是 opt-in，卸载必须解除 document listeners。

### CodeBlock

代码表面原子。Parts 为 root/header/filename/language/actions/container/content/lineNumbers/copy。Content 映射为真实 `<pre><code>`，保留 whitespace、line breaks 与 selectable text。Root 持有 code、language、filename、showLineNumbers、wrap、highlight、theme。行号不进入可复制文本。Copy 组合 CopyButton，而不是重新发明复制按钮。

### CodeHighlight

代码高亮 renderer capability。状态为 `pending | ready | error`；支持 language/theme/streaming 输入重算，错误时回退 plain code。Shiki 是可选 renderer 依赖，不作为 Proto UI runtime 的硬依赖。高亮 DOM 不得破坏原始 selection 或 code metadata。

## 7. Library 组合边界

Library 可以把上述原子组装成业务组件：

- Message：消息容器，使用 Avatar、Badge、Card、Response、CodeBlock、Button/Tooltip 等。
- MessageBranch：分支导航，管理 index/count/previous/next。
- Response：plain/markdown 响应 renderer，可组合 CodeHighlight、CodeBlock 和安全 URL policy。
- Reasoning：Disclosure 样式/语义包装，管理 streaming 自动打开和完成关闭。
- ToolCall：Disclosure + CodeBlock/Response/Attachment 的工具调用呈现。
- Sources/Citations：LinkList 或独立 inline citation 组合。
- Composer/PromptInput：真实 form，组合 Textarea、AttachmentInput、ModelSelector、Button、Speech capability 和提交/停止状态。
- ModelSelector：Dialog + CommandPalette + model metadata/logo。
- Conversation：ConversationScroller + Message 列表 + empty/download/scroll actions。

这些 Library 组件可以知道 `self/other/system`、`assistant/tool`、`reasoning`、`streaming`、`model/web search`、branch 或 diff renderer；但这些知识不得进入 Base。

## 8. CSS 与 renderer 约束

- 原型使用的每个 token 必须生成真实 CSS。
- 禁止把 unsupported-token comment 当作可接受输出。
- 禁止 demo 通过外围 `<div style>` 伪装原型本身缺失的视觉能力。
- Brutalist hard shadow、square geometry、ink border、paper/canvas surface 与交互位移必须由受支持 token/renderer 路径产生。
- 深色主题、focus-visible、pressed/hover、disabled、reduced-motion、RTL 和 narrow viewport 必须有浏览器验收。

## 9. 单族完成门槛

一个 family 只有同时满足以下条件才算完成：

- 协议文档完整且不含占位 criterion。
- catalog 无新增 debt。
- focused runtime tests 通过并覆盖 observable behavior。
- family subpath 可独立导入。
- generated CSS 无该 family unsupported tokens。
- Web Component、React、Vue 中的适用语义一致。
- 浏览器真实交互和 computed styles 正确。
- 英文与中文 demo 都展示真实能力，不只是静态文本。
- 公开文档不承诺实现中不存在的传播、事件或交互。
- 单族单独 commit，并在 PR 记录测试与浏览器证据。

## 10. 验证证据要求

每批必须记录：

- `check:prototype-catalog`
- `check:types`
- focused Vitest 结果
- token/style preset 生成与检查
- docs build 或 dev-server 页面状态
- 浏览器截图/DOM/computed styles 证据
- PR comment 中列出本批 family、协议文档路径、测试路径和仍存在的明确边界

如果验证失败，不允许把失败解释为“预期漂移”；必须修正生成器、协议、测试或文档中真正的错误。
