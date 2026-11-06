# 2026-11-06：合入后的 main 产品组合复核

本包只记录在 main `9e58834d167618216ed9b39278eb8dded2f2f596` / tree `9f9b425720a3e52c9f9b1c3a8b6f7629484e8a96` 上实际执行的新验证，没有新增产品源码修复。#1287 已合入 `c8a006403f4dfc850ee3cec5633c17f394ccd308`；#1288 已合入 `93aa78d8eaef736acabc650063d9307fa6cf7fee`。原始修改的关键源码 blob 与该 main 逐一相同，详见 `merged-source-binding.json` 和 `validation-report.json`。

## 本次实际结果

| 范围 | 结果 | 边界 |
| --- | --- | --- |
| 相关公开包 build | exit 0，44/47 包 | 选择 CLI、Base、四 Web Adapter；不称全部 47 包重建 |
| manifest | exit 0，47 包 | 原命令检查 |
| Material 原单元配置 | 48/48 | 原断言；另有 helper/test scoped TypeScript 检查 exit 0 |
| source build / ordinary / continuous | 三步 exit 0 | light/dark；continuous 42 条流程记录，非 42 个独立测试 |
| packed build / ordinary / continuous | 三步 exit 0 | emitted public packages + 显式 private Liquid 源码；不是已安装公开 Liquid 包验收 |
| Dialog 原始 native | 8/8，196 条观测，120 PNG | Shadcn/Brutalist × WC/React/Vue/Vue2；原 150s，原 probe |
| Sidebar 原始 Contents case | exit 1，0 pass / 1 fail / 8 filtered | `homepage-dogfood.browser.test.ts:954` 首次 sidebar count 0 ≠ 1；逻辑关闭 poll 与焦点检查先通过 |
| 独立校准守卫单元 | 99/99 | CURRENT 闭包继续被历史严格分类器拒绝；不是独立校准接受 |

两条 continuous 各有 8 条第二页面焦点控制，共 16；各 4 条恢复尺寸严格等式，共 8。原生操作、原断言和 deadline 未更改。结束时两侧 contexts / consumers / pendingImages / decodedImages 均为 0。Dialog 与 sidebar 的 reporter/report SHA、process-exit、cleanup 均对账；无 runner/unhandled/outer-timeout 错误。Sidebar 测试在第一个失败组合停止，不称完成全部四 runtime。此前 11 月 5 日同环境的 fixed15d 本地配对仍保留原日期，本轮没有重跑或改标为 main 配对。

## 失败与待办保留

- Sidebar 首次同步读取与 public `isPresent=false` leave 屏障的语义决定仍待维护者。现有 controller 等待 public open/presence，避免在 FocusScope 关闭栈内搬树。没有增加等待、提前归还、改 oracle 或把这次失败称为“1s 内未归还”。本包没有新增 sidebar phase 时序；旧时序仅属于旧 epoch。
- 当前 Dialog probe 闭包为 50f13884… / 3b425734… / 4bbc332f…；历史接受表仍为 181f88d9… / e3792a3e… / 4bbc332f…。本轮 8 绿不替代独立维护者的校准决定。
- 读取时两条合入 PR 的 checks 均为 5 success / 17 skipped，Vercel 外部授权失败保留；该 main 未返回 Actions runs/check-runs，另列 REST Vercel 最新状态为 success。没有称完整 hosted CI 全绿或重新调度 Actions。
- 两次实际录屏编码均 `encoded:false`：1300×813 的奇数高度被 libx264 拒绝。source 的 57 张、packed 的 61 张原 JPEG 与错误均保留；两份 continuous-drag.mp4 都是 0 字节占位文件，无可播放视频、UI 帧率或性能验收声明。
- wider optical / performance / installed consumer / GPUI / 九 profile 全 native / release acceptance 没有因此完成。Liquid 仍为 Experimental，相关 draft 定义不提升生命周期。

## 可读入口与完整原件

`material-source-result.json.txt`、`material-packed-result.json.txt`、`dialog-observations.json.txt`、两个 native runner / result、`validation-report.json` 及选定 PNG 可直接阅读。两个标准 tar.gz 分别保留全部本轮产品生成物和 UI 原件；controls 归档保留命令、日志、已执行 probe、校准守卫日志与准确提交源码。普通 tar hardlink 只去重相同字节，每个原相对路径仍在，解包后可逐项核验。

`raw-public-map.json` 对每个来源分别记录 raw/public SHA-256。仅文本中的机器路径替换为 `<...ROOT>`；这类文本为公开派生物，不称执行时原字节或原样可运行源码。图片/JPEG 不修改、不重编码。主代理已逐张查看五张选定新图；其余保留并核验字节，不称全部视觉审阅。source/packed 截图显示四 runtime 的可见原型；Dialog 两张为 390/320 窄屏，sidebar 图是失败前实际打开态，不伪装失败瞬间。

环境：macOS arm64，Node 24.21.0，pnpm 10.32.1，Playwright 1.58.2，Chrome 155.0.8059.39。原始运行时间/准确 source revision 保留在各 receipt。局部数据复核为 human-assisted/current-user、partial/ABSTAIN，不是 GitHub APPROVE。AI assistance: Codex。
