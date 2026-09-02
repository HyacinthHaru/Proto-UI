# 白皮书章节蓝图修订：七章结构与收束安排

日期：2026-09-01

本文记录对 `2026-08-28-whitepaper-chapter-blueprint.zh-CN.md` 所作的章节结构复审。它为后续手稿规定章节职责和依赖顺序，不以尚未归档到当前 base/head 的正文草稿作为成立依据。它是维护者人工起稿使用的时点蓝图，不是白皮书正文、Spec 实体、稳定保证、产品路线图或公共发布计划。

本文替代旧蓝图中的以下部分：

- “序章 + 三部九章 + 结语”的阅读架构；
- 原第二部第四至第七章的拆分；
- 原第三部第八、九章的拆分；
- 由上述编号派生的例子、插图和手稿顺序。

旧蓝图的序章和第一部三章仍然适用；其中已经形成的来源追踪、证据标签、反驳、negative boundary 与写作纪律也继续适用。本文不重写旧记录来掩盖结构怎样变化。

## 1. 为什么需要修订

这次调整不是单纯为了降低作者的写作负担。复审采用的判准是：读者尚有哪些不可跳过的问题、每章是否推进新的主张、内容是否属于白皮书而不是 Spec、路线图或工程指南，以及相邻章节的计划职责是否发生重复。

按照这些判准，当前结构存在三个可以直接从章节职责中检查的重叠：

1. State、Anatomy 与 Lifecycle 可以在同一章内沿“事实怎样保存、结构怎样成立、语义何时运行”连续推导；把 Lifecycle 单独成章会重复建立前提。
2. 翻译层一章必须解释 Host artifact、Adapter/Compiler/hybrid、翻译结果、能力边界、诊断和证据；原一致性章节若再次承担这些职责，就会重复建立翻译前提。
3. 原“设计约束”与“在实践中逼近”两章存在明显重叠：负边界只有放入可证伪、可修正的反馈循环中，才不会变成静态禁令；反馈循环也只有带着明确边界，才不会成为无限扩张的借口。

本轮写作讨论中，作者对后续章节信息新增量的担忧只是一项仓库外背景观察，不是删减章节的证据。独立于这项感受，按上述职责进行复审仍会得到同一结论：一致性与实践修正各有一条不可替代的主张，但没有必要维持原来的四个后续章节。

## 2. 修订后的阅读架构

采用“序章 + 三部七章 + 结语”。FAQ 继续作为非线性参考，不计入主论证章节。

| 顺序 | 部分 / 章节（工作标题） | 唯一不可缺少的推进 | 相对篇幅权重 |
| --- | --- | --- | --: |
| 0 | 序章：重复消失不了 | 跨技术生命周期反复重建相似交互责任，使“是否存在可移植不变量”成为值得检验的问题。 | 7 |
| I-1 | 代码之前的组件 | 一个组件可以先作为可辨认的交互主体被讨论，再表现为某种 Host 实现。 | 8 |
| I-2 | 从交互关系出发 | 参与者、方向和语义责任共同导出 information channel，而不是 API 名称导出通路。 | 10 |
| I-3 | 组件的边界 | 独立参与者关系决定 Component/Prototype 边界，feedback-only 保留粒度例外。 | 12 |
| II-4 | 通路之外的语义 | State、Anatomy 与 Lifecycle 分别补上内部连续性、复合结构和时间秩序，使 Prototype 接近可执行。 | 16 |
| II-5 | 翻译层 | Module 与 Host Capability 降低翻译工程的重复成本；翻译形式可以不同，但必须说明语义结果、能力边界和证据。 | 18 |
| II-6 | 一致性的条件 | 一致性是在两个已声明 realization context 之间的条件比较；共享且受控的基础越多，要求越严格。 | 12 |
| III-7 | 在边界中逼近 | Proto UI 以明确非目标约束近似，再让理论/内核、原型库与翻译证据共同修正它。 | 10 |
| 8 | 结语：为过去与未来保留交互知识 | 长期目标是让交互知识不再被单一技术生命周期独占，而不是冻结技术或宣称已经找到终极本质。 | 7 |

权重总计为 100，只表达论证注意力，不是字数配额。第六章应明显短于第五章；第三部也不应重新扩张成项目全景介绍。

### 三部的叙事责任

- 第一部“寻找不变量”回答我们在寻找什么、如何观察它、怎样划定交互主体。
- 第二部“使近似可执行”回答 Prototype 怎样保存事实、形成结构、进入时间、被翻译，并在不同 realization 之间接受比较。
- 第三部“在实践中逼近”只回答两件事：这份近似在哪里停止，以及失败证据怎样推动它被明确修正。

贯穿问题保持不变：

> 为了仍然成为同一交互主体，什么必须保持不变；什么可以随着实现、时间、媒介或 Host 合理变化？

## 3. 第一部与第二部前两章的计划职责

为避免第六章重复前文，当前蓝图把第四、第五章应当承担的边界记录如下。这些是手稿的前置约束，不证明对应正文已经存在或已经接受。

### 第二部 · 第四章：通路之外的语义

第四章应把 State、Anatomy 与 Lifecycle 放在同一条推导线上：

- State 保存一个 Component 在前后交互之间持续存在的内部事实；
- Anatomy 说明多个独立 Prototype 怎样形成可识别的 compound structure；
- Lifecycle 说明这些事实、结构和通路义务何时被计划、运行和结束；
- `setup` 与持续 `runtime` 的分离是时间模型的主要推进。

因此不再保留原蓝图中的独立 Lifecycle 章节。Rule、`asHook`、Focus、Accessibility、`meta` 和具体 `def` / `run` API 也不因篇幅合并而进入本章主线。

### 第二部 · 第五章：翻译层

第五章应承担以下职责：

- 定义 Prototype、Host 与 Host artifact 的区别；
- 用 Module 与 Host Capability 解释翻译工程如何拆成可复用语义责任与 Host 对接点；
- 区分 Adapter、Compiler 与 hybrid；
- 区分表示形式变化与交互语义损失；
- 引入 faithful、authorized bounded degradation 与 unsupported；
- 区分 translation form、capability realization、conformance outcome 与 evidence state；
- 要求在最早可靠边界报告 degradation 或 inability，并让结论绑定到具体证据范围。

因此第六章不得重新解释 Module、Host Capability、翻译形式、三种结果或 evidence state。第五章判断的是“一次翻译是否履行义务”；第六章比较的是“两个 realization 在什么条件下应当相同到什么程度”。

## 4. 第二部 · 第六章：一致性的条件

**Reader question**

当两个 Host artifact 使用不同的结构、事件系统和渲染方式时，我们凭什么说它们仍然实现了同一个 Component；又应要求它们一致到行为、结构还是像素？

**一句话主张**

一致性不是某个 Host artifact 独自拥有的属性，而是在两个已声明 realization context 之间对受治理语义进行的条件比较：共享且受控的基础越多，可比较的输出层越多，允许的无解释差异越小。

**继承前提**

第五章负责说明每次翻译可能得到 faithful、authorized bounded degradation 或 unsupported 的结果，并且结论必须绑定到 Host/profile 和证据范围。第六章只消费这一计划前提，不重新定义它。

**推导动作**

1. 从“两个实现都 faithful，是否就必须长得一样”开始，说明单个 conformance outcome 仍不足以决定两个 realization 之间的比较强度。
2. 定义 realization context：至少包含 Prototype revision 与输入、交互媒介、Adapter/Host capability profile、投影策略、渲染参数，以及经过说明的 tolerance/exclusion。
3. 给出所有声称实现同一 Prototype 的结果都必须保持的底层义务：Prototype identity、information channel 方向与责任、State transition、Lifecycle order 和 Prototype 授权的替代分支。
4. 区分 Host 对原始输入的识别与 Prototype 对交互语义的治理。click synthesis、按下/抬起时间差、touch slop 和误触阈值可以由 Host 不同处理，除非 Prototype 或可移植 recognizer 明确接管这些参数。
5. 说明不同交互媒介之间的等价形式由具体 Prototype 决定。翻译层不能仅因平台惯例或实现便利，把 dropdown 自行替换为 picker。
6. 说明共享条件怎样逐层提高比较强度：同一 Prototype identity 是最低共同前提；相同媒介和相近 Host family 可以比较更多行为与结构；viewport、单位、字体 shaping、颜色、rasterization 等输入均受控时，像素比较才可能成为最高强度要求。
7. 用一小段收束证据边界：比较 profile 的 tolerance/exclusion 必须事先说明并可审阅，不能在看到差异后临时添加；现有 Web evidence 不能替非 Web Host 作证。

**例子推进**

- Switch 是主例：在相同 Prototype revision、相同输入、键鼠媒介、受控 viewport/单位/字体与同属 Web family 的条件下，React 与 Web Component realization 可以接受严格的 Feedback、normalized DOM 和图像比较；底层 click synthesis 的微小差异仍可能属于 Host 输入识别。
- Select 是唯一必要扩展：键鼠 dropdown 与触屏 picker 是否仍是同一 Select，不由 Adapter 自行判断，必须来自 Select Prototype 对媒介分支的授权。当前缺少该完整受治理分支时，只能把它写成设计问题或 thought experiment。
- Scroll Area 不作为第三个完整案例；只有在需要一句说明 system/composed chrome 的 projection 差异时才出现。

**证据状态**

- maintainer theory direction：`2026-08-28-whitepaper-rewrite-maintainer-decisions.zh-CN.md` WPD-07；
- draft：`K-DESIGN-TRADEOFF-0001` 与相关 Prototype identities；
- active partial evidence：`D-ADAPTER-PROFILE-0001` 和 current official Web Adapter profiles 已编目的局部证据；
- governance gap：comparison profile、normalized DOM 与 image evidence 还没有完整治理身份；
- hypothetical projection：Qt、Flutter、TUI 与完整跨媒介 Select 对照。

**最强反驳**

如果每次比较都允许声明大量 context、tolerance 和 exclusion，那么任何不一致都可以在事后被解释掉，使“一致性”变得不可证伪。

**本章必须正面承认**

该风险真实存在。Context 不是免责条款；每个 tolerance/exclusion 都必须在比较之前有明确理由、适用范围和证据责任。无法解释的差异不能因为 Host 不同就自动合法。

**Negative boundary**

- 不重复第五章的 Adapter/Compiler/hybrid、Module/Host Capability、三种翻译结果或 evidence-state 教程；
- 不承诺所有 Host、媒介或输入设备产生相同像素和操作细节；
- 不把“语义一致”降为“功能大概可用”；
- 不把未经治理的 native chrome、font 或 rasterizer 差异算成 Prototype 自身输出，也不在事后随意排除；
- 不把 HTML 字节相同当作 Web 结构一致；使用 normalized DOM projection 的设想仍须标明治理缺口；
- 不把当前 Web-family evidence 外推到 Qt、Flutter 或一般 native Host；
- 不在本章建立完整 comparison-profile API 或测试规范。

**插图机会**

优先使用一张“条件一致性包络”：核心为 identity/channel/state/lifecycle，向外依次增加相同媒介、相近 Host family、受控渲染参数与像素比较。图必须表达“共享前提增加，比较层增加”，不能画成由低级到高级的固定质量等级。

另一个可选图是两个 Switch realization context 的并列表：左侧列共同输入与受控条件，右侧列可比较输出和已声明 exclusion。若正文与主图已经说清，不再增加第二张图。

**通向下章的 bridge**

一致性只有在边界清楚时才可检验；但这些边界不是永恒真理。下一章需要回答 Proto UI 如何既不把所有现象吞入核心，又允许失败证据修正当前近似。

**私有 source / entity map**

- `internal/records/2026-08-28-whitepaper-rewrite-maintainer-decisions.zh-CN.md` WPD-07；
- `K-DESIGN-TRADEOFF-0001`（draft）；
- `D-ADAPTER-PROFILE-0001` 与 current official `A-*` Web profiles；
- `P-BASE-SWITCH*`、`P-BASE-SELECT*`，必要时一句引用 `P-BASE-SCROLL-AREA*`；
- 旧 `execution-semantics.md` 与 FAQ 的一致性段落只作历史来源；
- 已知缺口：comparison profile、normalized DOM、image evidence。

**相对篇幅约束**

正文建议控制在第五章的约二分之一至三分之二。它只需完成“比较对象—不变量—条件增强—媒介边界—可证伪性”五步，不需要再建立一套翻译治理术语。

## 5. 第三部 · 第七章：在边界中逼近

**Reader question**

如果 Prototype 只是当前近似，Proto UI 如何避免一边把所有 GUI 问题无限吸入核心，一边又把早期抽象固化成不可反驳的教条？

**一句话主张**

Proto UI 的可信度来自两种约束同时成立：它明确拒绝把所有现象伪装成可移植语义，又让 theory-and-kernel、prototype-library、translation-layer-and-ecosystem 产生的失败与使用证据显式修正当前近似。

**继承前提**

第二部依次负责说明 Prototype 怎样执行、翻译和接受一致性比较，并暴露未支持 Host、未经治理差异和错误抽象都可能出现。

**推导动作**

1. 重申经验前提的边界：Proto UI 只假设一类重要交互逻辑值得跨技术保存，不主张所有 GUI 属性都天然可移植。
2. 给出最少的非目标：Proto UI 负责 Component 级交互语义，不负责业务接合、完整应用组合和框架级调度；Host-specific 能力可以重要，但不自动进入 portable core。
3. 把原“设计约束”改写成可检验的所有权问题：每项限制必须说明它保护了哪项 identity、translation 或 evidence 责任，而不能以“保持纯粹”为理由无限禁止需求。
4. 区分三条工作主线：理论与内核维护表达和治理基础；原型库逐个探索 Component identity；翻译层与生态检验这些近似能否被不同 Host 承接。
5. 展示反馈循环：提出近似 → 编写 Prototype → 经 Core/Runtime 和 translation 落地 → 收集 conformance、失败与使用证据 → 判断问题属于 implementation drift、translation capability 缺失、Prototype 错误还是理论过度普遍化 → 显式仲裁修正对象。
6. 说明白皮书、Spec 与实践的方向关系：实践可以推动修正，但不能静默覆盖白皮书或 Spec；record、draft entity、active guarantee 和 executable evidence 也不能互相替代。

**例子推进**

以 Switch 作整篇回顾：从 Switch/Toggle/Checkbox identity、Root/Thumb 边界、State/Lifecycle、Web translation 到未来非 Web 对照，展示同一个近似怎样逐层获得证据，也怎样可能被新 Host 反例修正。Select 的媒介分支和 Scroll Area 的 Host-owned mechanics 只各用一句说明不同失败可能要求修正不同层。

**证据状态**

- maintainer direction：WPD-01、WPD-09 与本轮章节复审；
- current project evidence：Spec graph、Prototype/Test/Adapter 的局部纵向切片；
- current limitation：executable evidence 仍主要集中在 Web family；
- open test conditions：可信非 Web realization、新参与者关系、新 information channel 或“没有外部关系却必须成为 Component”的反例。

**最强反驳**

在非 Web 证据和大规模使用不足的情况下，所谓反馈循环可能只是让一套 Web 抽象不断自我解释，而不是检验普遍性。

**本章必须正面承认**

当前证据确实不能证明一般跨平台成功。非 Web 实现不是装饰性路线图，而是检验理论边界的重要条件；在证据出现前，白皮书只能陈述假设、当前方法和可反驳条件。

**Negative boundary**

- 不展开版本路线、Host 数量目标、工具链发布时间、社区政策或商业化方向；
- 不把 Proto UI 写成应用框架，也不把“官方 core 不拥有”写成“生态不得实现”；
- 不把可序列化、Author 便利取舍或任何当前约束写成未经限定的永恒原则；
- 不用 draft entity、测试数量或 package 数量代替理论成熟度；
- 不把使用反馈自动放在白皮书或 Spec 之上，冲突仍需显式仲裁；
- 不重复第三章 split rule、第六章 comparison context 或第五章翻译 outcome。

**插图机会**

一张三主线证据反馈环：theory-and-kernel、prototype-library、translation-layer-and-ecosystem 并行指向 realization；失败与使用证据回到四个可能的修正分支：实现、翻译能力、Prototype、理论。图中不画版本时间轴或项目组织架构。

**通向结语的 bridge**

如果这条循环能够长期运行，Proto UI 保存的就不只是一代组件代码，而是一份能够继续被新技术检验、承接和修正的交互知识。

**私有 source / entity map**

- `internal/records/2026-08-28-whitepaper-rewrite-maintainer-decisions.zh-CN.md` WPD-01、WPD-09；
- `spec/README.md` 的 lifecycle、relation、source-of-truth 与 evidence 规则；
- `K-DESIGN-TRADEOFF-0001`、`K-PROTOTYPE-COMPOSITION-0001`（draft）；
- `P-BASE-SWITCH*`、`P-BASE-SELECT*`、`P-BASE-SCROLL-AREA*` 与对应 Tests；
- `D-ADAPTER-PROFILE-0001` 与 current official Adapter profiles；
- 旧 `design-constraints.md`、`evolution-path.md` 只作历史来源，不继承阶段承诺。

**相对篇幅约束**

第三部只有这一章。正文不应超过第四或第五章任一章的篇幅，也不承担完整项目介绍。若某段不能直接服务于“边界怎样接受证据修正”，应移出主线。

## 6. 结语：为过去与未来保留交互知识

**Reader question**

即使 Proto UI 自身没有成为主流，这项工作还可能留下什么？

**一句话主张**

Proto UI 想让组件的交互知识不再被某一代框架、平台或实现形式独占；Prototype 是当前可执行近似，真正需要长期保留的是可被未来技术重新检验、翻译和修正的责任边界。

**推导动作**

1. 回到序章的技术时间轴，区分冻结旧实现与保留可迁移语义。
2. 用蓝图为第一至第七章安排的链条回望经验假设，不引入新概念。
3. 保留开放结论：未来证据可能证明某些 Component 不可移植、某些通路分类错误或某些 Host 差异不该被抹平。
4. 用长期公共基础设施愿景结束，不使用版本承诺、采用规模或贡献号召代替结论。

**例子推进**

Switch 最后一次出现：不再列 API，而是强调未来技术仍然可以询问同一组责任是否保持，以及新证据如何推翻旧近似。

**Negative boundary**

- 不复述完整理论；
- 不宣称历史必然走向 Proto UI；
- 不以 stars、采用、商业成功或贡献号召收尾；
- 不用宏大愿景掩盖当前 Web-heavy evidence。

## 7. 从旧蓝图移出的内容

下列内容并非不重要，只是不再属于白皮书线性主论证：

| 原内容 | 新位置 |
| --- | --- |
| 语义一致、User、Maker、Author 的完整优先级教程 | Spec/设计文档；白皮书只在发生真实取舍时引用必要部分 |
| 可序列化的完整规则与 escape hatch | Spec、Core/Runtime 文档或独立设计说明 |
| Prototype 组合 API 与框架边界细节 | Spec、FAQ 或工程文档 |
| v0/v1、Web→native 的阶段路线 | 路线图、milestone 或项目计划 |
| 可视化工具、Playground、调试工具计划 | 产品与工具链路线图 |
| 社区 Prototype/Adapter 政策 | FAQ、贡献与治理文档 |
| entity lifecycle、record、active/draft 的完整使用教程 | Spec introduction 与贡献者文档 |
| 详细 comparison profile、normalized DOM 和 image-test 设计 | 独立 Spec/测试治理事项 |

FAQ 仍可回答定位和常见误解，但不得承担正文第一次定义“一致性”或“可修正近似”的责任。

## 8. 修订后的例子与插图线路

### Switch

| 位置         | 任务                                                     |
| ------------ | -------------------------------------------------------- |
| 序章         | 展示跨技术重复责任                                       |
| I-1          | 从实现之前的还原预期进入交互主体                         |
| I-2          | 映射五条 information channel                             |
| I-3          | 解释 Root/Thumb 与 feedback-only 边界                    |
| II-4         | 串起 State、Anatomy、Lifecycle 与接近可执行的伪代码      |
| II-5         | 展示 Prototype 义务怎样形成 Host artifact 与翻译 outcome |
| II-6         | 在明确 realization context 下说明一致性强度              |
| III-7 / 结语 | 回顾近似怎样被证据修正，以及交互知识怎样跨技术保留       |

### Select

只保留两个定点用途：I-3/II-4 的复杂 family，以及 II-6 的跨媒介替代边界。不要让它发展成第二条贯穿主线。

### Scroll Area

主要留在 II-5 解释 Host-owned mechanics 和有边界损失；II-6 与 III-7 只在确有必要时各用一句回扣。

### 插图优先级

1. I-2 information channel 有向关系图；
2. I-3 Prototype boundary 决策树；
3. II-4 setup/runtime 与 instance lifetime 图；
4. II-5 translation responsibility 与四轴图；
5. II-6 conditional consistency envelope；
6. III-7 三主线证据反馈环。

第六章优先只制作一张主图。第三部也只保留一张反馈环，避免结尾阶段重新增加认知负担。

## 9. 计划手稿顺序

本文不以任何正文草稿的存在作为蓝图成立前提。实际完成状态由后续独立 checkpoint 记录；手稿按以下职责依赖推进：

1. 先按历史蓝图与本文第 3 节起草、复审 I-1 至 II-5，确认每章只承担自己的计划职责。
2. 在 II-5 已经解释 translation outcome、evidence state 与 Host Capability 的前提下，按本文第 4 节起草 II-6；先写 realization context 与 Switch 对照，不从术语表开始。
3. 对照 II-5 删除 II-6 中重复的翻译层解释。
4. II-6 接受后起草 III-7，用一条反馈循环吸收原“设计约束”和“在实践中逼近”的必要内容。
5. 回读 I-1 的开篇问题，确认 II-6 给出直接答案。
6. 最后写序章与结语，使经验问题、可证伪前提和长期愿景首尾对应。
7. 主线接受后再去重 FAQ，并在中文章节接受后制作英文 conceptual-parity 版本。

## 10. 复审触发条件

出现以下情况时，应再次新增较新的 record，而不是静默扩张正文：

- 第六章无法在不重复第五章的情况下给出独立主张；
- realization context 或 tolerance/exclusion 的写法使一致性不可证伪；
- 第七章必须依赖具体版本路线才能成立；
- 真实非 Web implementation 推翻当前 consistency 或 translation 边界；
- 新参与者关系、新 information channel，或“没有外部关系却必须成为 Component”的可信反例出现；
- 适用 Spec entity lifecycle 或白皮书/Spec 权威关系发生变化。

## 11. 主要来源

- 历史蓝图：`internal/records/2026-08-28-whitepaper-chapter-blueprint.zh-CN.md`
- 当前维护者方向：`internal/records/2026-08-28-whitepaper-rewrite-maintainer-decisions.zh-CN.md`
- record policy：`internal/records/README.md`
- authority 与 entity lifecycle：`AGENTS.md`、`spec/README.md`
- 条件一致性：WPD-07、`K-DESIGN-TRADEOFF-0001`（draft）
- 翻译治理：WPD-08、`D-ADAPTER-PROFILE-0001`（active）与 current official `A-*` Web profiles
- 核心例子：`P-BASE-SWITCH*`、`P-BASE-SELECT*`、`P-BASE-SCROLL-AREA*`（读取各自 lifecycle）
- 旧公开页面：`apps/www/src/content/docs/{zh-cn,en}/whitepaper/design-constraints.md`、`evolution-path.md`、`faq.md`，仅作历史来源与迁移清单

## 明确不授权

本记录不授权公共白皮书替换、英文版本、插图生成、Spec/entity 变更、comparison profile 创建、Issue/PR 外部写入、发布或路线图承诺。
