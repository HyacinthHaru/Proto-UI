# Shadcn Radio Group 投射与验证

日期：2026-09-19。公开基线：`3b756f450e7505e834629e2aef67f7b29afa94e7`，`0.3.0-alpha.0`。

本次承接 [#662](https://github.com/Proto-UI/Proto-UI/issues/662) 的完整三部分投射。Root、Item、Indicator 分别消费已有 Base hook，选值、Collection、roving focus、activation 与 accessibility 继续由 Base 拥有。新增 P/T 实体保持 draft；本记录保存工程观察，不替代规范或稳定化准入。

## 投射与公开消费

Root 使用 `grid gap-3`。Item 提供 16px 圆形边框、primary 前景、focus ring、disabled 与 dark input 底色；Indicator 是 8px 装饰 SVG，通过 Base checked 的 Rule 控制 opacity，不建立另一份选值或 presence 状态。

比较来源固定为 shadcn-ui/ui `f31ed81983653919dd4fe77aee4b4859f610f1dc` 的 `apps/v4/registry/new-york-v4/ui/radio-group.tsx`。独立 Indicator、flex 居中、显式透明背景与不提供 invalid/Form/asChild 等差异在 P 实体及双语页面中说明，沿用包内 upstream MIT notice。

包根与 `@proto.ui/prototypes-shadcn/radio-group` 提供三个对象及 PascalCase/lowercase 别名。CLI 注册三个独立 facade，不注入默认 Indicator；既有 component-preset generator 仍有三个 recipe，样式 token 闭包由 scanner 正规生成。公开页面通过同一个真实 demo 与 Shadcn-only projection manifest 接入当前 Website projection scope，导航和原型库概览可达。

## CLI 闭包发现与修复

初版的 `resolveKnownAsHookStateHandles()` 没有 Radio Group Item/Indicator 映射。独立审查发现，Indicator 虽在运行时持有 `data-[checked]:opacity-100`，生成 manifest 却没有这个 selector。隔离 family 扫描测试在该缺失处失败；补充实际 Base handles 映射后，scanner 与 lowered-hook coverage 共 158 项通过，Shadcn manifest 由 generator 输出 277 个 token。

网站 dev 预览经其它样式路径已经能显示圆点，不能据此证明 CLI 初始化产物完整。用同一夹具、相同输入和运行时 token，在两个独立的真实 WC/Chromium 执行中仅消费 CLI 生成的样式，测得 value=`b`、checked=`true` 时，Indicator opacity 从修复前的 0 变为修复后的 1；两次均无 page error，前后实际组件截图已检查。这不是同一物理 DOM instance 的 identity 测试。

对应持久化覆盖位于 `packages/cli/test/prototype-style-tokens.test.ts` 的 isolated Radio Group case、既有 `lowered-hook-coverage.test.ts`，以及 CLI 初始化 CSS 的 checked-opacity selector 断言。

## 初始焦点入口的前置依赖

公开页面的 WC、React、Vue、Vue 2 均在 non-first selected 初始 Tab 入口断言失败：Comfortable 已 checked，圆点 opacity 为 1，但 Default 是 tabindex=0，Comfortable 为 -1。选中值与焦点入口是不同证据，未将前者通过当作后者通过。

随后在干净公开基线独立执行真实 Base Root/Item + WC：DOM 顺序固定为 `a,b,c`，分别输入 uncontrolled `defaultValue` 或 controlled `value` 的 `a` / `b`。四组都在 Collection count=3 后记录 12 帧，再从前置 App 按钮执行原生 Tab。两个 `b` case 持续呈现 Beta checked、tabindex `[0,-1,-1]`，Tab 后实际焦点进入 Alpha；两个 `a` 对照正常，均无 page error。Base Root/shared blob 与公开基线相同。

[复现源码、原始采样与真实组件图片](https://github.com/HyacinthHaru/Proto-UI/tree/cd4cede77dcd9f30011e5466dd54f8a920514c48/evidence/2026-09-19/radio-group-entry)保存在不会合入产品的独立证据分支。截图中灰色 checked 与绿色原生 focus-visible 是 App 对真实 Base 状态的诊断呈现，没有注入 checked/tabindex/focus。证据是源码解析后的真实组件执行，不冒充 dist/tarball 消费验证。匿名下载、文件哈希、基线和测量已独立核对。

源码推断是 `resolveCurrentItemId()` 优先保留 enabled current，使首次注册形成的 fallback 在非首项 selected 出现后继续保留；尚未把 registration/publish 的逐次顺序写成实测结论。修复必须同时保留规范中已有的 programmatic/navigation current，以及 value 更新不抢焦点的边界。

#662 明确排除 Base 修订，因此已提出[有界前置修复请求](https://github.com/Proto-UI/Proto-UI/issues/662#issuecomment-5741460931)。本记录时尚无该范围决定，没有修改 Base 产品代码，没有通过改 demo 顺序、主动 `focusSelected()` 或移除失败断言绕过它。

## 当前验证状态

| 范围 | 结果 |
| --- | --- |
| Shadcn projection 单元测试 | 8 项通过；不覆盖 non-first selected 的首次 Tab entry。 |
| Scanner / lowered-hook coverage | 158 项通过。 |
| CLI / Website manifest | 28 + 9 项通过。 |
| 完整类型检查 | Workspace 与 223 个 Astro 文件通过，零类型诊断。 |
| 包、manifest、budget | 43 个公共包构建和 manifest 检查通过，全部现有 budget 通过。 |
| 文档构建 | 245 页成功生成。 |
| Catalog / authoring | 143 declaration files、191 entries、142 P 的 catalog 检查通过；4 个新实体 authoring 通过。 |
| 完整 `pnpm test` 尝试 | 非浏览器 477 文件 / 2,359 项通过，原有 3 skipped 文件 / 34 TODO 保留；浏览器 23 文件 / 107 项通过，新增 Radio Group 的 1 文件 / 4 项初始入口断言失败。整体退出码 1。 |

浏览器的后续键盘、pointer、主题与窄屏 journey 仍需在入口前置问题解决后完整执行，不据已有挂载和初始样式观察宣称这些路径通过。完整交付、独立审查和合并尚未完成。
