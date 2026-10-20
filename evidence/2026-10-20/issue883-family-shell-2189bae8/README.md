# Group C：family 写入、查询延迟与 mobile-shell predicate

本补包绑定 PR #921 的 `2189bae8f3e39ed9708f79576f6bc6b0c6660192`，tree `c357d6efd0146c5846d1493f4db188dd8eaaaceb`，parent `de2272060fd47cd5b37991e4f7a049c254beabda`。接受的 main 为 `042f1e5740e1a809b9ca238593f5bb01a1f8a8e3`。本次唯一源码改动是 Homepage 浏览器测试内的观测：171 行新增，原断言、原 deadline、输入顺序、9 个 case、两个 mobile poll 与键盘 owner 控制保留。生产代码、依赖、锁文件和 Dialog keeper 均未改变。

Agent 请求释义：区分真实 family 属性写入与 Node 查询迟滞，准确定位 mobile-shell 的原失败条件；保留现有断言、deadline 与键盘 owner，核验当前组合并向维护者提供可检查的证据。这个释义不新增产品语义或稳定时限保证。

原始执行记录与脱敏公开派生物由 `raw-public-map.json` 逐项对应；`records.zip` 内的 `PUBLIC-MAPPING.json` 与外部映射完全相同。公开源码、命令和日志中的路径经过替换，不能称为原执行字节或可独立运行的复现包。原 PNG 字节未编辑或重编码。原始私有数据、历史失败、实际执行 epoch 均保留。

## 本次验证

| 材料 | 实际 source epoch | 已观察结果 | 边界 |
| --- | --- | --- | --- |
| native-arm1 | DE + 第一版 dirty 观测源码 `d4b77134…` | 原 Homepage 9/9 | 独立静态审查发现日志异常可覆盖 native 返回的 P3；运行阳性没有抹掉该 finding |
| native-arm2 | DE + 最终 dirty 观测源码 `e97adac9…` | 原 Homepage 9/9；types 934 文件，0 error / 0 warning / 14 hints | P3 已修；仍是提交前执行 |
| private-utility-arm3 | DE + 单独私有 CDP 观测源码 `582835a6…` | 原 Brutalist case 1 pass，8 filtered | 与默认候选不同；执行后已还原，未进入提交或默认 CI |
| postcommit-node129 | clean `2189bae8` | 129 文件，1803 pass / 4 fail；Dialog 2/2、owner 17/17 | 四项 Checkbox Group authored-token 失败全部保留，不一概归因于 CLI nested Form |
| postcommit-native120 | clean `2189bae8` | Shadow 111 + Homepage 9 = 120/120 | 本地 Chromium / macOS；不能代替 hosted Linux 结果 |
| canonical CI | exact `2189bae8` | terminal FAILURE；22 jobs 13 success / 9 failure；37 workflows 26 success / 11 failure；105 checks 68 success / 37 failure | 全部8 browser日志已读。仅完整1/3/4/5/6/7分片合计766 pass / 32 fail / 15 skip；2/8 exit124无完整summary，不推算全部8总数。General先被78项docs漂移阻断；package44/47、47manifest、9policy测试、4PASS/5ADVISORY；types934/0error/0warning/14hints。 |

签名提交只证明本次 Git 对象与提交者配置相符；本地 peer 报告为 partial / ABSTAIN，不是 GitHub 独立批准。不能据本补包宣称 PR 全绿、合并就绪、全夹具无泄漏、AT 验收或完整生产 Portal 根因已成立。

## family 的三个时点

新的默认观测在实际单个 Homepage root 上临时代理 `dataset`，只记录 `family` 的一次原生 `Reflect.set` 前后括号；它不等于整个 family transaction 成功完成。生产代码在该写入后仍会发布参与者、更新状态和焦点；rollback 的 `setAttribute` 路径也不经过这个代理。代理改变对象 identity / access cost，属于有干扰的观测。

MutationObserver 记录的是回调交付时点。原 `locator.getAttribute('data-family')` 的同一个 Promise 仍保留，Node 侧分别记录发起、返回和原 poll 的成功或拒绝。增加的三个固定校准 RPC 全在原 poll 已有结果后执行，没有挑选最快样本，也没有加长 deadline。

把 page time 换到 Node time 的区间结论，条件是同一个 document / root、近似恒定相对时钟速率与偏移、全部五个 RPC 区间交集非空。还须检查三个 post-verdict sample 全部完成、observer 无错、无丢弃、writer 起点有效、代理确已还原。RPC 括号没有独立量化时钟精度或漂移上界；不能把区间写成无条件精确时间。

在实际 clean `2189` 的本地阳性中，原 Brutalist poll 约 392.358ms 通过。原生写入和 MO 交付分开记录，三个原查询返回依次是旧值、旧值、新值。本地结果不能追认历史 Linux 红项的提交时点；新的 hosted 结论以同一轮日志和 artifact 为准。

| clean2189 本地事件 | 相对原 poll 开始的 Node 毫秒 | 记录含义 |
| --- | --- | --- |
| 查询1返回 | 2.623458 | `shadcn` |
| 查询2返回 | 121.748041 | `shadcn` |
| 查询3发起 | 173.806916 | 此时还没有 Node 结果 |
| 原生 family 写入括号 | 条件区间272.236833–272.635166 | 原 native setter 返回true；不代表全事务完成 |
| MO回调交付 | 条件区间321.036833–321.435166 | 回调看到`brutalist` |
| 查询3返回 | 392.329250 | `brutalist`；默认观测没有utility getter内部时点 |
| 原poll fulfilled | 392.358083 | 原assertion/deadline未改变 |

私有 utility arm 通过公开 CDP API 识别实际已有的 main-frame Playwright utility realm，在 native getter 前后记录两个真实查询，没有创造 realm 或改用 main-world 替代查询。该轮恰有两个 Node call 与两个 utility read，并分别落在调用区间内。共同校准条件下，调用开始至 utility read 约 108ms、263ms，read 结束至 Node 收到结果约 0.3–0.7ms。前段包含客户端/服务端分发、selector 和浏览器调度；后段包含序列化、传输及 Node。不能将它们分别说成纯浏览器队列或纯网络耗时；额外 CDP 也会预热和干扰。对应关系依据数量、顺序、值与各区间；没有协议 call ID，还以不存在额外 matching 读取为条件。相同 getter 起止 ticks 不代表零耗时。

### 新 hosted 拒绝的实际区分

[官方CI39346804518](https://github.com/Proto-UI/Proto-UI/actions/runs/39346804518)的普通 shard2，实际checkout `b09e8ad66790860a8d01ed5d9a919d221f04ed80` 的tree严格等于产品 `c357d6ef…`。全部五个RPC交集为 `[103799.953950,103805.082677]`ms，宽5.128727ms；三个固定post-verdict校准、origin/root、restore、error/drop检查均合格。

| 同一 hosted family poll     | 相对原poll开始的毫秒         |
| --------------------------- | ---------------------------- |
| 原生属性写入括号            | 条件757.861917–763.090644    |
| MO callback delivery        | 条件888.961917–894.090644    |
| 原poll拒绝                  | 1000.532239                  |
| 同一个query3返回`brutalist` | 1082.459065，拒绝后81.926826 |

在上述时钟假设下，本轮原生属性操作和MO交付均在原deadline前；Node收到新值却在拒绝后。这比仅记录晚返回更具体，不能再将本轮红项解释为“属性一定在deadline后才写入”。默认 hosted 观测仍没有utility getter内部时点，无法将差额拆为纯浏览器/网络/Node原因，也不能把该属性写入称作完整事务结束。原1000ms断言保持红；本补包不把它改成通过。

Artifact12232795304仅下载一次，原ZIP SHA256 `317e491a679590935e852e5bfc0e774c7e13a528a90feb838557453ac7ac4396`，58,721,962B；全部230成员逐项CRC/hash核验。只选择source、failure/lifecycle JSON与原failure PNG入本补包；stdout与两份JSON的原时序数据对齐。390×844截图在原拒绝后于2026-10-20 00:30:50.711Z采集，显示晚就绪的WC/Brutalist Header，不能代替deadline当帧。

## mobile-shell predicate

原 mobile case 只有两个默认 1000ms Vitest poll：

1. `header.getAttribute('data-site-menu-ready') === ''`：表示 disclosure 已 enhance / sync，不表示所有异步 surface 都已完成。
2. 打开 Contents 后，`menu.getAttribute('aria-expanded') === 'false'`：表示原全局导航按原流程关闭。

新观测记录当前 stage、宽度及相邻原步骤。原错误出现时先冻结 Node stage / width / message / stack / cause 并写日志，再做一次后置 DOM 状态采集与截图，最后抛出同一个原错误。这样即使 shard 后续整体超时，已落盘的 rejection marker 仍可定位 predicate。后置 DOM / PNG 不能回填成 deadline 当帧。

本地 clean `2189` 的 390→430→320 原序列全部通过，每个 `menu-ready` 和 `navigation-close-from-contents` 都有相邻后继 stage。没有新的本地 mobile 拒绝记录，不能凭本地阳性定位旧红项。新 hosted Homepage 为8 pass / 1 fail，唯一红项是原 Brutalist family poll。mobile case 的三个宽度均到达两poll的后继stage，并有实际passed行；没有本轮 mobile rejection。该阳性不能定位旧DE的具体失败predicate，也不回写旧结果。

## 保留的外部边界

CLI #902 与 Main #890 在 2026-10-20 00:25 UTC 的完整分页读取仍分别只有 4 / 10 条评论，ID、正文和 updated_at 均与上次相同，末尾仍是作者 handoff / index；没有收到 collection owner ACK。本次没有重复催促或接管 owner。七份相关源码字节保持；历史 8c 两红两绿不是本次运行。对应[可靠 mailbox](https://github.com/Proto-UI/Proto-UI/issues/902#issuecomment-6268946005)与[协作索引](https://github.com/Proto-UI/Proto-UI/issues/890#issuecomment-6269763641)。

维护者对上一补包的接受范围仍然是 changed Dialog fixture 的作者组合执行证据；本次不重开已关闭的这个证据缺口，也不把该接受套用为 hosted 时序、CLI owner ACK、独立执行或整体批准。历史 DE 官方失败与原始截图位于[固定上一补包](https://github.com/HyacinthHaru/Proto-UI/tree/8678f86478b97c7c3ec32ac92c8b6d50d976e93d/evidence/2026-10-19/issue883-clock-dialog-de227206)，不会在此改写或重新标注 head。

本补包选取并逐张查看 6 张 clean2189 原图：WC / React / Vue / Vue2 的320×300 Brutalist Runtime焦点状态，以及 WC / Vue2 的390×844 Docs Contents键盘焦点状态。它们是原 case 后续状态的开发服务器产物，不是原 deadline 当帧或 hosted全页验收；底部原 Astro工具条保留。其余42张本次PNG及116张提交前PNG没有据此声称逐张审阅，也未镜像进本补包。所选图和 sidecar 一一绑定，见 `packet.json`。

## 同轮发现的Header几何红项

新专属Header family工作流有8项Shadcn `38px`对原`36px`断言失败。单独私有观测使用2189生产源码、原Shadcn/WC/light case，保留原BCR/断言/90s，仅在原sample同一RPC追加computed字段并在原高度断言前记录。实际1 fail / 15 filtered：line-height20 + padding8×2 + border1×2 =38，box-sizing为border-box，min-height36，inline height:auto，inline padding为空；已有Header CSS变量padding为0.25rem。诊断源码/原稿/差异、完整红记录与还原clean2189回执均保留。它不是未改原test的本地baseline，也不是main重新执行。

这与Oct4既有consumer密度记录和当前36/44 oracle相符，指向完整Shadcn parts分支没有收到已有Header响应padding。下一增量将只评估显式Header consumer padding输入，保留默认wrap消费者无padding、200%文本/RTL与全部原几何/owner断言。本补包没有该生产修复或其绿结果；后续可能暴露的断言也不能预称通过。

另有一张1440×1000 Shadcn/WC/light私有height诊断后的原失败图，由root实际查看；Header、完整当前viewport与原页面资源保留，2px差异以computed/BCR值对账，图像本身不替代尺寸测量。加上上述6张local与1张hosted，共8张原PNG。
