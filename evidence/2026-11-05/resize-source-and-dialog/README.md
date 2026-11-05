# 2026-11-05：真实 resize 几何、完整 material 回归与 Dialog 几何过渡

human-assisted/current-user。本包交付两个独立修复分支和本次真实运行原件；本地独立审阅为partial/ABSTAIN，不代表GitHub批准、独立calibration或发行接受。#1283已实际合入；当前工作基于main4db52751。随后main ec9ea70b仅有七个governance/ledger/CI-guide路径变化，未重标本次执行为该更新head。

## 1. Material读取与有效source前提：e439f958

两份独立签名提交：c54f252修物理小数读取及失败前checkpoint；e439f958仅更正合法positive source的一色fixture，geometry/foreground/variant/stripe及安全门不变。最终tree ebb24f8d14409aca08177352b9a1fc5deea9ed9a。

- 原main两路径L1000严格失败157.609≠157.609375保留。原owner指出完整四host局部数组未输出，故另被动保存原resizeCheckpoint，不增加原getter/RPC/await；两条红重新保留完整CSSOM数组。后置CDP观测不能回填原verdict。
- 真实产品四runtime两路径均host133.609375×38、直属before157.609375×62；CSSOM只157.609，offsetRect/BoxModel.width为整数158。修复采用一次DOMSnapshot的真实小数bounds，要求原文档、唯一runtime/直属carrier、contact-v1、同quality/sourceRevision、原冻结materialFrame、原BCR严格一致、中性祖先变换/zoom、pseudo零border/padding。materialFrame是材质发布计数，不是compositor frame。
- 原79个assert调用按序保留，65个native/wait/viewport/preference调用AST等义；没有epsilon、取整或用写入变量自证。额外的四runtime计数检查不会跳过原case。
- 原47控制通过后，独立review发现迟到publication可掩盖原读数；新反例实际47/1，严格冻结frame后48/48。显式helper/test类型检查发现frameId为StringIndex并修正解码，原红与fixed0均保留。当前完整types1156files/0errors/0warnings/24hints；原C input控制57通过。独立真实坏几何control：四runtime初值通过，只给WC before注入+1px时原等式拒绝，另三保留，通过移除注入恢复四个；frame绑定版12样本均核。
- c54两条完整consumer通过resize、CSS reject/recovery和matched WebGL，但之后换色controls()正确拒绝原深蓝#0735ce/黄#fcda32在固定black/clear frame中的实际contrast<4.5。WC failure-state亦正确fallback。此红保留，不改产品render门。
- 独立真实控制保持同geometry/foreground/variant/stripe，原unsafe被拒；仅浅蓝#c3d5fc与同黄可render且image改变。后续e439只换这个positive literal；旧unsafe输入与两条c54红仍是negative原件。私有control的metrics采于cleanup前pendingImages1，不据此另称GPU归零；最终完整consumer的dispose另有真实零值。

准确e439提交后六步骤全部exit0：source/packed各build、ordinary、continuous均完成；两continuous各42条flow记录（含观察性记录，不是42个独立测试）。四runtime双臂共16条：default无window blur、4→5；disabled matching trusted down→window blur→up且5→5。四host小数等式/冻结frame、后续CSS安全恢复、匹配WebGL、真实source像素替换均到达；最终contexts/consumers/pendingImages/decodedImages各0，原uncaught-errors断言通过。

本地Node24.21.0/macOSarm64/Chrome155.0.8059.39，锁定Playwright1.58.2；packed为emitted public packages加显式private Liquid prototype source，非完整安装包。Liquid仍为Experimental；不宣称任意DOM、跨引擎、原生glass、完整shader silhouette、光学/性能或0.3发行接受。原视频encoder仍因1300×813奇数高度失败，encoded:false；JPEG/frames原件保留，没有可用MP4或UI帧率证明。

## 2. Dialog公共Content几何过渡：aab98dd4

当前main UI原8case为Brutalist4pass/Shadcn4fail；四Shadcn均首390→390原transitionProperty!=all guard失败，不称已观测430/320的插值。八modern recipes只有duration100而默认property all；NY已有opacity/duration200。独立判定支持existing available-region live inset方向下的局部修复。

生产仅common Content geometry token串新增transition-opacity；9recipes、modern100/NY200、logical configure200/200、独立fade/zoom keyframes、Base/publicAPI、原probe和历史classifier逐字不变。九live profile新guard在旧生产8fail17pass（9Dialog内modern8红/NY绿），候选overlay25+原Dialog2为27/27。

准确aab98dd4c5b8e9ee6bfa246d82b9b97f7b1ba229/tree8e7b28c85a6d900d385e12cdd7d9a561eabf65d3后的原native8项全过、196rows/120PNG；4viewport、长文/200%font、scale、close/reopen、Mask/identity/Focus原断言与150s不动。四host native覆盖当前Shadcn Rhea与Brutalist，不把九profile unit外推九套全native。actual package build16/47、47manifests及完整types1156/0/0/24通过。

catalog实际exit1的三条Select exercise关系错误，已在相同工作树临时恢复干净main4db源上复现同exit1/同三条，随后精确恢复候选；不归为本token引入、不改相关Spec来造绿，也不写整体验证全绿。bounded-map在&&前失败后未执行。

## 3. 新本地配对与calibration边界

同候选标签aab、同50f13884/3b425734/4bbc332f输入、同Node24.21.0/Chrome155.0.8059.39的fixed15d本地baseline为0/8、33rows/29PNG，仍3inset0/4Title box504（glyph Range0）/1runtime未提供。baseline拥有自己的原锁依赖；不是clean原tree，复制的三probe和原baseline generation产生的未跟踪输出均列明并在清理前保留。旧e439标签baseline为不同实际执行，不把其metadata改成aab。

本地匹配消除了旧官方2ca配对的Node/Chrome patch差异，但不重标为新hosted CI或独立接受。旧官方2ca仅引用前包，本包不把旧批次算作新本地成果。当前main虽已带入CURRENT闭包，历史PROBE/strict classifier依旧，calibration仍待独立维护者决定；没有任意错误allowlist或新接受表。

## 4. Sidebar仍是独立契约欠项

e439/main UI与Dialog修后aab均重跑原Contents case，都是0pass/1fail/8filtered：原logical-close 1s poll和单次focus之后，单次sidebar count0≠1。原180s/1s与全部assert保留，reportSHA/runner/process-exit/cleanup无错误。没有以Dialog8绿或CSS已merge冲销它。

此前70ca/6eb的public phase诊断仍只属其原epoch；本轮未重标旧时序为新执行。现有controller按public open=false及isPresent=false归还原树；即时首读与public-leave屏障的应用契约仍需owner明确，未擅改产品或oracle。

## 原件、归档与视觉检查

五个标准tar.gz按epoch分组，每个保留完整相对路径；相同字节用标准tar hardlink去重，正常tar解压即可还原，不改变各次capture的时间/来源归属。所有产品index.html/app.js/tokens.css/source.json、PNG/JPEG、JSON/logs、原红、独立反例和已执行源均保留。raw-public-map逐文件列raw/public SHA、派生状态与所属archive；私有用户路径使用别名，派生文本不是原执行字节或原样可运行源码。外部Chromium源码只在报告保留immutable URL/hash，原下载私有保留。

643个PNG成员是本次执行/生成的原始路径，不等于643次视觉审阅；hardlink不会把旧图改标新head。root实际查看final source/packed resize两图、替换源原render输出、aab Shadcn/WC390、Brutalist/Vue2 320及sidebar打开图共6张；其余只核hash/PNG完整性。未编辑或重编码任何原PNG/JPEG。

独立原件审计1362项零一致性finding，partial/ABSTAIN。代码/数据接受、平台review、实际合入、独立校准及剩余visual/performance债继续各自跟踪。AI assistance: Codex。
