# Proto UI 0.2.0-rc.6

> 本文是已在 `0.2.0-rc.5` 发布后合入更改的更新日志草稿。rc.6 release train、package 版本、npm 发布、Git tag、GitHub prerelease 与不可变 spec snapshot 均尚未准备或发布；当前安装与试用说明仍固定到 rc.5。

## 已修正

### Shadcn Switch 几何与焦点视觉

- Switch Thumb 的 checked 状态位移现在会计入 track border 与 padding，使两端都保留相同的 2px 内部净距，不再在视觉上向右偏移。
- Switch Thumb 现在会隔离继承的 focus ring offset，Switch 进入 `focus-visible` 时只有 Root 发生预期的视觉变化，Thumb 自身的 shadow 不再出现额外环形变化。
- Preset 与显式 Root/Thumb 组合继续共享由 prototype 持有的同一套状态样式。

### Shadcn Dialog 组合与跨适配器焦点

- Dialog Trigger 现在是无样式的语义 wrapper，与既有的 Dialog Close 组合模型一致。Button 外观由显式嵌套的 `ShadcnButton` 提供，不再隐藏于 Trigger variants 中。
- 嵌套的 Trigger/Button 与 Close/Button 组合现在只投射一个宿主 focus/a11y surface，在 Dialog focus scope 中只计为一个成员，并由实际的内层 Button 展示 focus-visible feedback。
- Pointer 与 keyboard activation 现在会到达同一个 Dialog behavior owner。由此修复 Web Component 无法通过鼠标打开的问题，并让 Web Component、React 与 Vue 的原生 focus/blur 观察保留在嵌套交互 surface 自身。
- 同步移动焦点前会先建立 keyboard modality，因此在 Dialog 内连续 Tab，以及清除 pointer modality 后再次进入时，都能保持可见焦点。
- 通过键盘关闭 Dialog 后，焦点现在会可靠地恢复到内层 Trigger Button，不再丢失并回到页面起点。
- 默认 CloseIcon 现在使用与 upstream 对齐的 `top-4 right-4` 位置、16px X icon 与生成后的可见 focus ring。

## 已调整

### Component preset authoring

- Shadcn Switch 与 Dialog 的 preset recipe 现在分别在各组件 prototype 旁的独立 `preset.ts` 文件中编写，由 Shadcn prototype library 聚合，并通过受检查的生成流程投射到 CLI。
- Preset recipe 只描述 Root/default part identity、结构 placement、替换与显式省略策略；视觉 tokens 仍由被引用的 prototype 持有，raw facade 与 convenience preset 继续同时保留。

## 验证

- 新增一份共享 Web conformance journey，直接使用官网的 Shadcn Dialog demo，对官方 Web Component、React 与 Vue adapter 执行同一套鼠标打开、键盘焦点循环、关闭、焦点恢复与再次进入场景。
- 三个 adapter 都是该场景的必选参数。这份共享 DOM journey 用于补充底层 contract test 与真实浏览器验收，而不是替代它们。

## 升级提示

- 依赖 `shadcn-dialog-trigger` 隐式 Button 外观的调用方，现在需要在 Trigger 内显式组合 `shadcn-button`。Dialog Close 仍保持无样式，并遵循相同的显式组合方式。
