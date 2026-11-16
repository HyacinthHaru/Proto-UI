# Contents 滚轮等待与 Select 重连

产品 head `7e5fdc43fb6d3166e660a963721b261ee08ec8a5`，源码树 `53146331dc1cde098a86f977f0fefee88153d877`。同步的 upstream main 是 `ff24ed1a9e6cfa3486a2fdcc86b890556265e339`。

## 局部改动

冻结的 WC 样本在第一轮归还后进入第二次 Enter。原滚轮断言等待同一 `scrollTop` 比较，第一个 browser read 在 1 秒原窗口结束前未返回。受控迟拒绝中，Vitest `expect.poll` 在原 verdict 后又启动一次读，`vi.waitFor` 停止调度。当前改动局限于原滚轮断言，保留真实输入、比较和 1000 ms。捕获不证明已送入浏览器的读取能更快返回。[迟拒绝控制](wheel-timeout-control.json)

## 准确 head 验证

源码与构建预览各 14 通过、1 失败、9 未选。两条 Contents 旅程、八次切换和 24 次按原顺序归还均通过。Dialog 两次各 8/8、196 条观测。Header 320 和 390 宽度下的源码与构建首帧均为浮层上沿 61px、页头下沿 56px。683 页输出中目标按钮页仍有全部九个 CodeExample。类型检查覆盖 1223 个 Astro 文件，0 错误、0 警告、30 hints。构建后的 graph gate 仍报告相同的 53 条旧依赖边。[本地回执](local-validation.json)

两张源码截图分别显示 WC 打开时的目录和 React 关闭后的键盘焦点。它们呈现原页的原生状态，几何数值来自浏览器采样 JSON。

## Shadcn 偏好与 hosted 工作负载

Shadcn React family Select 在桌面断点的原谓词超时出现在 source、built preview 和隔离诊断。只让选中行匹配 trigger 的临时控制通过原用例，测试文件的诊断字节相同。控制改动已还原，保留 #1439 的同列表全行等高。造成读取不返回的具体操作仍待测定。[同一谓词回执](select-reconnect.json)

第一次 hosted 采用动态计算的 13 文件，意外带入通用 Search 套件并漏掉 Contents、S4。这次的退出 124 有独立回执。补测载体仅固定原 12 文件清单，防止再带入 Search。其产品父提交、载体树、实际 Chrome 和 runner 回执都保存在证据中。补测实际运行状态为 `failure`，原进程退出 `124`。[动态分片回执](automatic-shard-receipt.json) · [原清单回执](original-shard-receipt.json) · [Hosted run](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43803106335)

## 旧 React 与 S4 证据

旧产品 `ed25e0f0` 有带完整时序的 React 红例，`f9b4b9e1` 现存回执中仍缺同次 React 红例。S4 的最后一条已记录 CDP 完成通知与 Node 收到该通知使用各自的证据时间轴。观察到部分 runtime helper 兑现，三个 React package import 缺少兑现边界。[旧样本时序](prior-timing.json)

当前原分片的 Brutalist family-commit 原谓词于 +1001.736 ms 拒绝。同次 family 写入落在 +2018.481–2077.377 ms，最后的读在 +2973.259 ms 返回 Brutalist。Node 已较早发出最后的读取，写入位于一秒之后。诊断 drain 未取得浏览器 getter 接收和 renderer 调度时点。[当前 Brutalist 时序](brutalist-family-timing.json)
