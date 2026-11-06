# Sidebar A 契约、原断言阶段修正与原树身份反控

准确 source head **1f10f0c9bc76d6d305c43ccbe04c9065f982bf1d** / tree **d7a34d5f3e33bb2b5a59209462fe4349ffabc0bc**，parent main **508e2d3b7dc397c06d843d61748aa7962fc67bb8**。两路径：新增 draft 网站 consumer 契约 `internal/contracts/website/contents-navigation.v0.md`；原 `homepage-dogfood.browser.test.ts` 仅插入21行。没有生产、Prototype、Adapter、公开API、时长或历史calibration表改动。

当前用户在看到两种可见行为及准确main同次证据后，明确选择 **A：离场完成后归还**。本包记录这个决定和依它完成的有界fixture修正；不把旧时点改写成当时已经授权或通过。

## 观察、决定和修正

原main clean Contents case仍0pass/1fail/8filtered：逻辑关闭poll和焦点检查通过后，原L954首次home count0≠1。另一次两文件只读phase插桩同样重抛原失败，插桩后dirty=true如实保留，finally精确恢复。当前同slot/gen1/Shadcn/WC的public open=false为3203.6ms；3228.7ms原getter为open=false/present=true；原失败后marker3237.0ms；public present=false与return-before为3406.4ms，return-after3481.3ms看到原树home、保留Content引用仍connected。时间来自浏览器同一时钟；trace本身可扰动，marker不是原count精确时刻，74.9ms return区间不单独归因。失败后额外500ms仅供诊断，原verdict没有改绿。first12行是after18行的前缀，其中16条源phase行带同一lease标签，两条verdict/post marker无身份标签。

Draft C-AS-TRANSITION-0001-B/E/K要求把logical close、离场保留、structural/terminal事实分开。网站树归还原本是uncataloged consumer边界。选择A后，其在public离场屏障完成后归还，并在renderer移除借用槽位前完成；不为原即时首读提前清空离场内容。该consumer契约不替代已有spec，不提升生命周期，不代表独立维护者接受。

新test在Escape返回后开始**单个1000ms总关闭观察预算**。原logical-close poll、焦点检查、新的既有lease marker完成观察以及原home count=1/marker-null检查共享该预算，末端另有harddeadline。没有固定sleep或新独立超时。原整文件207个matcher调用顺序保留，AST中30个选定原生输入调用节点的序列不变，原180s case deadline不变。不是保持“立即首读”语义不变：这里明确修正了经用户选择后的前置阶段。

## 审阅发现与实测负控

初版16行候选6ec8c406…的完整原case实际通过，但独立有限审阅发现其只接受首个无marker节点，原树被替换时也可能满足三个局部条件。最终21行6456b32d…绑定已保存的 `__contentsOriginalTree`，检查connected、与当前首个querySelector结果严格相等及marker撤销，随后立即执行原home count/null检查；没有轮询home count来包容晚搬树。

私有负控在真实正常归还之后，由test-only MutationObserver将原树替换为空native nav，没有合成键盘事件、生产改动或私有state注入。实际旧局部谓词为true / home count1 / marker-null true，原引用disconnected且不等于current；最终identity poll在剩余**993.571ms**预算被拒绝，原错误重抛，0pass/1fail/8filtered，candidate原字节恢复。这个反控不是一个产品缺陷，也不声称旧完整case会通过；只证明该身份缺口可辨别。

## 实际验证归属

| 范围 | 原结果与最终结果 |
| --- | --- |
| Clean main508原Contents case | 0pass / 1fail / 8filtered，原即时首读失败 |
| Main508 private public-phase | 同一原失败；12条first/18条after，同identity；两原源文件恢复 |
| 初版6ec候选 | 原case1pass / 8filtered；不是最终身份保证 |
| 最终6456候选，提交前 | 原case1pass / 8filtered，24次close循环全部到达 |
| 私有替身负控 | 0pass / 1fail / 8filtered，在identity poll按预期拒绝 |
| 准确提交1f10后的Contents | **1pass / 8filtered**，两族×四runtime×click/Enter/Space的24次关闭；16PNG |
| 准确提交1f10后的Dialog原native | **8/8**，196条观测、120PNG，原150s保持 |
| 原source-host Contents controls | **10/10**，包含held-leave及retirement替代控制；不是native fatal/teardown证明 |
| 完整类型/真实style生成 | exit0，1156files / 0errors / 0warnings / 24hints；在提交前相同6456字节执行，不称提交后重跑 |

八组native实际执行的report SHA、runner进程退出与cleanup均核验；无runner/unhandled/timeout。最终Contents的24份context JSON记录1f10/dirty=false；Dialog的receipt与observations绑定1f10；runner.reportSha256对应原始Vitest JSON。初版、private插桩与counterfactual另标各自字节和dirty状态，不混同。源宿主控制与单个Shadcn/WC同次public fact支撑正常顺序；native矩阵证明实际输入、焦点与原树物理归还，不凭一次绿排除fatal路径或称观测到真实detach。

独立有限源/数据复核23/23、0openSourceFinding，identity finding已关闭；结论partial/ABSTAIN，非canonical GitHub APPROVE。Dialog新CURRENT50f/3b425/4bbc闭包仍待独立校准，历史181f/e379/4bbc接受表未改。本轮无新fixed15d配对；11月5日原件仍保留原epoch。

Material source/packed、全9个Homepage case、完整hosted CI、GPUI、optical/performance、九profile全native和release acceptance未在本包新增完成。Modal Contents截图是功能证据，不把既有被否定的navigation设计改标为视觉接受；#1191的更广工作保持开放。#1161共享浮层owner路径未接管。

## 原件与读取

native与controls两个标准tar.gz保留本轮全部相关目录、实际源、已执行probe、日志/JSON/PNG及正反控。普通tar hardlink仅去重相同字节，每个原相对路径均保留。`raw-public-map.json`逐文件记录原始/公开SHA和派生状态；只替换文本机器路径，公开派生文本不称原执行字节或直接可运行源码。所有PNG未编辑、未重编码。

主代理逐张查看5张选定新图：最终Shadcn/WC打开态、Brutalist/Vue2焦点态、原phase失败后的关闭态、替身反控后的关闭态、最终Dialog WC390；其余核验hash/PNG完整性，不称全视觉审阅。

环境：macOS arm64、Node24.21.0、pnpm10.32.1、Playwright1.58.2、Chrome155.0.8059.39。所有时间和执行范围按原receipt保留。AI assistance: Codex，human-assisted/current-user。
