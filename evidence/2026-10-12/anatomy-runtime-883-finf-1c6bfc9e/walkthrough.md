# C 组请求完成边界：实际执行观察

请求转述：将现有作者PR #884 同步到 #872 的最新可见基础，优先核验 Form/Search 新反馈，修复成立的 C 组问题并完成组合验证。当前产品1c6bfc9e，treebd607349，基础15317b8b；main仍ea197278。之前500f/3f12批次保留原始时间与源码绑定。

本包是内部公开API执行观察和源码因果说明，没有新的原生浏览器点击/物理focus/像素截图/AT或全Adapter验收声明。合成EventTarget与角色/helper fixture是明示输入；独立探针另使用实际Menu Trigger、Drawer Root/Content prototypes及完整axis sample，仍在真实RuntimeSession的capabilities harness中。

| 实际触发 | 修复前观察 | 当前修复/实际对照 |
| --- | --- | --- |
| Field.validate抛原Error | Form pending保持true；随后真实Anatomy Field通知可完成被放弃的submit | 仅isCurrent时cancel；原Error仍抛，旧通知不再submit；已接受nested新提交仍能完成 |
| Autocomplete/Combobox Root open State观察者退休Root | unmount/remount发旧openChange；terminal在publish读disposed State；query caller还emit inputValueChange | Root helper与query/navigation/selection的相关尾部检查owner/viewepoch；Command原来就是inline/no-op，未算popup缺陷 |
| Menubar/Navigation Menu Root value观察者退休 | 仍valueChange，或terminal Anatomy phase错误；合法created Root close也能复现 | 保留接受true与合法alive-created/detached；epoch和beforeDispose清owner；navigation尾部也退让 |
| Drawer snapPoint观察者退休已admitted Content | 公开snap和axis-end继续读disposed State或发旧snapPointChange，axis caller仍cancel | request/render/cancel/axis尾部与cleanup各自守住epoch；admission release与数值/extent策略保留 |

正式41case同最终测试字节，在固定450026e4源码上27fail/14pass，修复后41pass；连同前轮179case为5files220pass。第一版Drawer fixture缺side声明而有8setup失败，已纠正并保留，不计产品失败。

独立同40case在正确base为27fail/13pass，仅替换四份源码后40/40pass。最初Menu created未取得metadata、Drawer合法beforeEnter的两个前提误判均保留；正式40与336loaded inputs及最终8Git文件绑定。执行仍称450026e4+snapshot；后续15317增量的三路径不在其输入集合内，绝不将旧日志重标新整树运行。本地审查为human-assisted/unassessed/partial/ABSTAIN，非GitHub批准。

最终1c6已提交整树原general plan：1154files1126pass25fail3既有skip；11567pass359fail34TODO、1unhandled、exit1；明确C40files499pass。相对500f出现11新failed titles，全部在当前4C修复前的0608合并树8文件控制中失败（513inputs逐一Git绑定）。不同source/test inventory的计数差不能算C新增成果或作为每项根因。

完整check:types在1c6实际exit0，Astro852/0errors/0warnings/11hints；它实际只构建CLI1/47，完整47包以新canonical job回执为准。原pnpm test仍在BOM axis-input/native-link登记缺口、Vitest前exit1。目录检查的552项Finf登记问题保留，不通过改规则/改断言/跳过测试掩盖。

前轮500f在3f12上的准确22job CI为9success/13failure，最终本地general11346pass372fail34TODO+9errors；其37独立控制与所有中间失败包括错误onBeforeMount、Context订阅/void测试类型尝试均原样保留历史。前轮16项退休反馈与本轮4项共20项C反馈是不同层级/调用者，重复评论不另算缺陷；图形/数值/Compiler、Host文档迁移及A/B范围仍由对应工作负责。
