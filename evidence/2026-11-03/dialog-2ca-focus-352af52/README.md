# 2026-11-03：Dialog 新闭包配对与 continuous 跟进

模式：human-assisted/current-user；本地独立复核 partial/ABSTAIN。此包没有正式批准、独立校准接受或完整项目通过的含义。

## 准确源与实际结果

| 范围 | 准确提交 | 本轮实际结果 |
| --- | --- | --- |
| Dialog candidate | `2ca069c1aa80d7d798d246d0d1bd3e96e700e7b0` / tree `5e47265c4fe837fb77b821bfb9ac3e6c051ef37a` | 原8例全部通过；169相关测试通过、3项Linux-only skip；Node132/132；types1141文件、0errors/0warnings/24hints |
| Dialog fixed baseline | `15d864de54210c2eebc4f4b2fec6235324989989` 加三份明确复制的candidate输入 | 原8例失败：3inset0、4Title box overlap504、1RuntimeNotOffered；不是干净baseline tree或8个已执行产品失败 |
| continuous 第一次真实执行 | `78637f03ac92292c5f0b9742b4b20197bc4efdfe` | source/packed build和ordinary通过，continuous均在新operation recorder的TDZ处失败，尚未执行blur刺激 |
| continuous 修复时钟后 | `352af52c42780af46c39d7732fba3f2d8c9e91a8` / tree `893e8f8e864a46e4caef989495241a723aeec895` | source/packed build和ordinary通过，continuous仍各exit1；不得称完整continuous通过 |

Dialog 接受父分支为 `8c496094fba393e0c571f2b290dac4befd3db007`，并明确依赖#1274的五行测试typing。新三输入闭包为 `50f13884… / 3b425734… / 4bbc332f…`。CURRENT仅绑定新harness；历史PROBE_HASHES及完整verifier tail逐字保留。本地8/8不登记独立校准，旧f1db官方配对仍属旧epoch。两侧原150秒case与所有数值/流程断言未改，runner process-exit/cleanup完成、0runner/unhandled/timeout。

continuous源仅改owner #1277单文件：恢复旧capture边界注释；以既有非空error标志保留falsy thrown value；四处Node时钟明确使用globalThis，避开同函数后部的const performance词法TDZ。原prefix23542B/suffix19209B及40/100/400、所有事件/断言/后续流程保持。原36控制35/1→36/0，最后候选36/36；14项私有VM控制含falsy与实际形状TDZ，事件/时钟为fake，不能计原生产品通过。

## 两条新真实失败的边界

- source：第一WC默认负臂没有window blur，有matched down/up和click；原即时contact getter读到release≠rest。后置frame/failure-state已rest，不能称永久卡住，也不能用后置值抹掉原失败。disabled臂与后续流程未到达。
- packed：默认臂通过；WC disabled臂取得trusted同pointer的down→window-target blur→up。contact同session已记录inactive/reason=blur，随后nativeclick和WC outward CustomEvent均发生，原激活计数6≠5。产品收到visual取消并不等于已证activation gate根因。Playwright mouse.up仍向原page的CDP发送mouseReleased；trusted事件不证明OS活动窗口输入路由。保留原no-activation断言，交owner区分输入前提和取消后的commit归属，未直接改产品gate或材料。
- 后续runtime blur arms和preferences等流程因原失败停止，不能用ordinary四runtime绿补齐。packed明确是emitted public packages + private Liquid prototype source，不宣称已安装的完整公共prototype包。
- 原录像JPEG及frames.json完整留在archive；原ffmpeg因813奇数高度失败，未得到可用视频，不把采帧cadence当UI性能。

## 环境与交接

本地Node24.21.0、pnpm10.32.1、macOS arm64、Chrome155.0.8059.39、Playwright1.58.2；不能替代官方Linux/Chrome156。source/packed app输入与hash、命令、实际时间/退出、早先TDZ失败及最终失败均保留。Dialog baseline用自己的offline frozen ignore-scripts依赖准备，不复用symlink。

archive含完整本轮原结果/日志/PNG、帧、产物及源绑定；raw-public-map逐文件列raw与公开hash。机器路径使用别名，派生文本不是原执行字节或原样可运行源码。PNG/JPEG不编辑重编码；只对指定4张Dialog candidate、2张continuous最终failure实际视觉检查，其余图片仅核完整性。源精确提交另列committed-source；运行器别名需用户按实际环境替换。

sidebar本轮无新增浏览器运行/产品修改：公开open=false和isPresent=false屏障与原立即count断言仍待维护者明确时序契约。报告只描述源码和既有原件，不补造新时序。

AI assistance: Codex。旧证据与历史失败未改写；证据分支不合入产品。

## 直接可读入口

`focus-source-result.json.txt`、`focus-packed-result.json.txt` 是新352执行结果的逐字公开派生副本，完整native和operation数组保留；不是后造摘要。`focus-review.json.txt` 是独立有限复核。`dialog-candidate-observations.json.txt`、`dialog-baseline-observations.json.txt` 与两份runner-integrity可直接审阅新配对，完整其余原件在archive。
