# Proto UI 0.2.0-rc.7（草案）

> 本文记录 `0.2.0-rc.6` 之后拟进入 rc.7 的候选变化。`0.2.0-rc.7` 尚未发布；精确 package 版本、BOM、Git tag、GitHub prerelease 与不可变 spec snapshot 需要由后续 release-train preparation 单独建立并验证。

## 已修正

### 连续 Trigger group 与 Dialog 命中范围

- 连续嵌套的 `asTrigger()` 不再描述为向最外层或最内层 Trigger 单向代理事件，而是合并为一个 trigger group，并明确区分默认最外层 anchor、所有 members、默认最内层 interaction surface 与共享 semantic activation route。
- 每个 member 继续保留自身 behavior 声明；语义 activation registrations 汇聚到当前 surface 的共享 target，`host:*` listeners 仍留在各实例自己的宿主 root。
- Pointer activation 现在只有在原生 hit origin 位于当前 surface root 或其内容中时才会进入 group semantic route。命中 anchor 或其他非 surface member 自身多出来的宿主盒会被拒绝，不再被重定向为 surface activation。
- 这修复了 `ShadcnDialogClose > ShadcnButton` 中外层 Close wrapper 宽于内层 Button 时，点击 Button 旁空白仍关闭 Dialog 的问题；相同规则也覆盖 `ShadcnDialogTrigger > ShadcnButton` 的外层空白。
- Web Component、React 与 Vue 的共享 Dialog journey 现在同时验证：外层 Trigger/Close 空白不触发，内层 Button 的 pointer 与 keyboard activation、focus loop 和关闭后的 focus restoration 继续正常工作。
- 新的 group capability 使用 `mergeGroup` 与 `getGroupEventTarget` 命名；旧 route-owner capability 暂时保留 deprecated alias，便于既有 host integration 迁移。

### Shadcn Tabs v4 默认样式还原

- Shadcn Tabs 的默认横向样式现在对齐项目固定的 shadcn/ui v4 基线：Root 使用 `flex flex-col gap-2`，List 使用 `inline-flex h-9 w-fit rounded-lg p-[3px]`，不会再默认铺满容器宽度。
- Trigger 恢复 v4 的尺寸、圆角、文字与 selected、hover、focus-visible、disabled 状态反馈，并移除了不属于该基线的 pressed 缩放、额外 ring offset 与旧版大圆角表面。
- Content 回归 `flex-1 outline-none` 的无装饰内容承载角色，不再由 Tabs 原型强制生成 border、background、padding 和 shadow；需要卡片面板的用法应在消费端内容中显式组合。
- Proto style CSS 编译器新增 `w-fit`、`h-fit`、`flex-1`、`shadow-sm` 与 outline 相关 token 支持，确保上述原型样式可进入 Web 产物而不会退化为 unsupported token。
- 本轮只收敛默认 variant 的横向主路径；`line` variant、垂直布局、显式 dark 分支、SVG 后代规则与完整原生 API/data forwarding 仍保留为后续 parity gap。
### CLI Brutalist CSS-only style preset

- `proto-ui init --prototypes brutalist` 现在是一等 CSS-only style preset。它会写出 Brutalist 主题（`brutalist-theme.css`，包含 Light/Dark 变量与扁平 canary/mint/lavender/coral/sky 强调调色板），以及从官方 Brutalist prototype 源码扫描生成的 Proto UI token closure，使目标项目在尚未安装任何 prototype package 之前即可获得可用初始 CSS。
- 该 preset 故意为 CSS-only。私有 workspace package `@proto.ui/prototypes-brutalist`（Button reference family）暂无公开安装路径，且不在 rc.7 BOM 中；在该 package 经过后续 release train 公开发布之前，CLI `add` 组件注册表中不会暴露任何 Brutalist 条目。

## 构建与发布

### 37 个公开 package 交付可执行产物

- 全部 37 个公开 `@proto.ui/*` package 现在都会在发布前生成 `dist/*.js` 与 `dist/*.d.ts`，package exports 分别指向 JavaScript runtime 与 declaration output，不再把需要 TypeScript loader 的 `.ts` 源码直接作为 npm runtime entry 发布。
- 每个公开 package 现在都有 package-local `build` 与 `prepack` contract；根级 `build:packages` 按生产依赖拓扑构建所选 package 及其上游闭包，验证全部 export targets，并在不加载 TypeScript 的原生 Node ESM 环境中执行 import smoke。
- Release staging 现在复用并复制开发与 CI 已验证的同一份本地 `dist`，不再维护另一条可能漂移的临时编译路径。
- 公开 manifest 通过生成器统一维护 `dist` exports、`files` 白名单和 build scripts。源码与测试保留为仓库输入，但不再进入默认 npm payload；37 个 tarball 中的测试文件总量由 1,031,558 B 降至 0 B。

### Bundle、文档与 CI 反馈

- Lucide 固定图标入口与全图标 registry renderer 解耦，代表性单图标 `icons/x` 的 gzip 体积由 119,273 B 降至 1,560 B，避免单个图标传递引入完整 registry。
- Lucide Gallery 改为有限首屏服务端渲染，英文页面原始 HTML 下降约 63%。内部 Demo Matrix 恢复每个 demo 同时并排挂载 Web Component、React 与 Vue，保留快速跨 adapter 人工验收能力；其中英文路由标记为 development-only draft，不再进入生产文档产物与 sitemap。
- CI 现在根据 workspace 生产依赖图计算受影响的公开 package，并为代表性 package entry 固化 gzip budgets；`main` 与手动触发仍执行全量公开包验证。
- 新增可重复的 monorepo analysis snapshot，记录构建、测试、tarball、bundle、文档产物与 package 更新频率，使上述优化可以在相同口径下复查。

## 验证

- Trigger group 与 Tabs v4 样式还原通过完整工作区测试：239 个测试文件、1,077 个测试通过；prototype catalog、style preset、类型检查、Agent 文档生成检查与 Web Component/React/Vue 共享 Dialog conformance journey 通过。
- 构建优化已验证 37/37 公开 package 的完整构建、export target、原生 Node ESM import、release stage 与 `npm publish --dry-run`；package manifest、bundle budget、类型、测试、Astro check 与文档构建门禁均通过。
- Demo Matrix 开发路由实测同时挂载 27 个 demo、81 个 previewer，Web Component、React 与 Vue 各 27 个；生产构建的 150 个页面、sitemap 与 Pagefind index 均不包含其中英文 Demo Matrix 路由。新增的 development-only 与三 adapter 并排 policy 已进入 37 条 release tests。

## 升级提示

- 通过公开 package exports 使用 Proto UI 的消费者无需更改导入方式，但运行时现在会解析到已编译的 `.js`，类型解析到 `.d.ts`。依赖 package 内部 `src/*.ts` 路径或假定 npm payload 包含源码/测试的非公开用法不属于兼容保证。
- 自定义 host integration 应迁移到 trigger-group capability 命名；deprecated route-owner alias 仅用于过渡。

## 仍待发布准备

- 本草案不代表 rc.7 已经形成可安装发行。后续仍需创建 draft version entity、对齐 `VERSION` 与全部公开 package manifest、生成 package BOM，并通过完整 release rehearsal 后才能进入发布评审。
