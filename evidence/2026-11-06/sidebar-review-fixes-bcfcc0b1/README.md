# PR1299 复审增量：原位置、真实 mutation 顺序与离场中重开

最终 source head **bcfcc0b1841f62691509069d51b8a737f1c09dfa**，tree **d4e379f0fcb2afb8a8a48ac2c0dcfaae589833bd**。它正常追加在已公布的 e8ae5f4b / 1f10f0c9 上，四份原作者签名、DCO和历史均保留。main parent为508e2d3。总净范围是draft网站consumer契约、既有browser test与既有source-host test三路径；没有生产、Prototype、Adapter、公共API或motion时长改动。

[先前C1完整原红、phase、替身反控与准确1f10记录](https://github.com/HyacinthHaru/Proto-UI/tree/db287ade4c871d0a24eea24d196fd35c28d632f7/evidence/2026-11-06/sidebar-leave-contract-1f10f0c9)固定保留。本包是其后三条实际自动复审P2的处理，不把C1历史重写成最终覆盖。

## 已成立的审阅问题

1. 原树身份和home下count1不证明原parent/nextSibling位置。e8ae5f4b在借出前同时保存这两项Node引用，在原marker-null之后立即严格比较，不轮询位置；17行纯插入。
2. 两项最终位置正确仍不证明marker在home插入后撤销。94a66e10在Escape前用**一个MutationObserver**观察原home的childList与原树的marker属性。真实addedNodes/target/nextSibling产生home事件，真实oldValue产生marker事件；回调依原队列顺序追加，takeRecords收齐待递送尾部后断开。原同树/位置/marker检查后严格要求home→marker，并确认初始marker存在，区间内恰好一次带初值的marker变化；结合已保留的final-null证明这一次是撤销。

3. Draft中的同view离场中重开原先未被执行覆盖。bcfcc0b1给既有source-host suite增加35行：关闭并保持leave、同view重开、调用旧leave finish、核对同棵marked树仍在原slot且仅一棵，随后有效关闭才归还原home/sibling。合成public host在open时忽略旧finish；这证明consumer lease流程，不是原生Transition取消或FocusScope接受。私有反控仅跳过active lease重开时public open=true通知，原10项仍过而新项失败，生产源码恢复原SHA。

观察准备在输入前。Escape返回后仍只有一个1000ms总预算，新增读回和断言也在原harddeadline前；原180s、原整文件207 matcher及所选原生输入调用节点保持，未加固定sleep。原失败后的证据保留会重抛原错误。成功周期在每族结束后写JSON；若在drain前就失败，只保证写入先前已完成周期，不虚称当前早期失败拥有完整队列。

## 真实反控与结果归属

| 实际epoch | 结果与鉴别点 |
| --- | --- |
| 67345619位置候选，base1f10+dirty | 原case1pass/8filtered，24close；类型1156/0errors/0warnings/24hints |
| 私有wrong-parent | 0pass/1fail/8filtered；原身份/marker/home均真，只有parent不符，sibling仍真，新即时位置断言拒绝 |
| 私有wrong-sibling | 0pass/1fail/8filtered；原身份/marker/home均真，parent仍真，只有sibling不符，新即时位置断言拒绝 |
| 准确e8ae提交后 | Contents1pass/8filtered、24close/16PNG；Dialog原8/8、196观测/120PNG |
| 8a5db042顺序候选，basee8ae+dirty | 原case1pass/8filtered，24份实际home→marker记录；同源码types1156/0/0/24hints |
| 私有same-turn反序 | 在现有withNativeContentLease回调中**仅互换两条同步DOM操作**，无合成输入/私有业务state。最终六项事实仍正确：originalConnected/current、homecount1、markernull、parent、sibling。实际记录marker→home，新数组断言拒绝，0/1/8；原错误、原图和两个源的恢复均保留 |
| 准确94a66提交后 | **Contents1pass/8filtered，24close、24份home→marker记录、16PNG；Dialog原8/8、196观测/120PNG** |
| 新重开source-host同源码候选 | 11pass/0fail，原10项逐字节保留；反控10pass/1fail，只新项拒绝，非native |
| 最终准确bcfcc提交后 | Contents1pass/8filtered，24close、24份home→marker、16PNG；Dialog原8/8、196观测、120PNG，runner/cleanup均过 |

这些四份负控是私有counterfactual，不是产品缺陷或新source head上的pristine执行。错误位置两例是1f10+673候选+私有test注入；反序是e8ae+8a5候选+私有controller/test诊断。最后两项类型结果在提交前相同候选字节上执行，不改称提交后重跑。上述原生浏览器执行各有共享runner的报告哈希和清理结果，无runner/unhandled/outer-timeout；source-host与types依据各自原始Vitest/类型日志及退出回执，不作浏览器runner或cleanup结论。

原顺序候选receipt的candidateKind文字继承了“base1f10”，该描述未更新；真实head、执行guard、browser source均为e8ae，test为8a5db042。原回执/脚本保留，另见order-provenance-note.json，不按旧文案重标运行。

最后两次准确Contents的24份原context JSON各加一份normal-close-mutations JSON，分别记录94a66和bcfcc/dirty=false；Dialog receipt/observations以head/sourceSha/probeSha绑定，runner.reportSha256对应原Vitest字节，不宣称所有JSON都含head/dirty字段。源宿主held-leave的旧10/10、先前Shadcn/WC public phase仍按各自原epoch引用。native矩阵不证明排除fatal路径、实际detach、全网站/全浏览器或设计接受。

## 限制和剩余条件

A正常close语义已由当前用户明确，未再当A/B待决项。新draft consumer没有提升任何spec生命周期。三个新有限源码review为partial/ABSTAIN；GitHub线程是否resolved、准确head是否获独立维护者接受，以实时服务状态为准。本包不伪造APPROVE或thread resolution。

Dialog CURRENT50f/3b425/4bbc仍待独立校准，历史strict181f/e379/4bbc未改；无新fixed15d pair。新head的native8绿不是校准接受。完整hostedCI、Material source/packed、全9Homepage、GPUI、optical/performance、九profilenative和#1191设计/响应式/终态等剩余工作均不因本修正完成。Vercel授权失败不改成green，不更改权限/秘密或调度Actions。

## 原件

两个标准tar.gz保留各次准确head与候选native epoch、四份反控、源、命令、日志和记录。相同字节只以标准tar hardlink去重，所有相对路径及epoch归属保留。raw-public-map逐项列原始/公开SHA；只替换文本机器路径，派生文本不是执行时原字节或原样可运行源码。图片均未编辑或重编码。

主代理逐张查看6份本包图片来源（最终94 Contents打开/焦点、两个位置反控、反序反控、最终Dialog WC390）；另实际查看最终bcfcc的ShadcnWC打开、BrutalistVue2返回焦点、DialogWC390三图：原导航可见，关闭/触发焦点轮廓可见，Dialog内容和操作在视口内；这是功能结果。其余只核字节和PNG完整性，不称全视觉审阅。Modal Contents图是功能证据，不把旧被否定的navigation设计改标接受。

环境：Node24.21.0、pnpm10.32.1、Playwright1.58.2、Chrome155.0.8059.39、macOSarm64。AI assistance: Codex，human-assisted/current-user。
