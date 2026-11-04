# 2026-11-04：C 组 window-blur 取消修复与原件交接

模式 human-assisted/current-user。有限独立本地复核均为partial/ABSTAIN，不作GitHub批准、独立校准或完整发行接受。

## 本轮准确结果

- 开发提交 `ee0a6b7c1be7e569006597944eae4f84d5190583`，tree `f2ac4a71a0a5bc51e01a7b6d7f7e8bfdffa844d9`，parent为main `dd621dd00f77eb1358a13c1ff94419b048deef59`。三文件：router、直接回归、事实记录；原continuous文件与全部原断言、40/100/400ms和deadline未改。
- 按draft C-EVENT-TYPE-0002-D/E修复已收到window-blur press.cancel的同一pending pointer后续click仍commit的问题。身份独立于visual contact/geometry；fresh down先退休旧身份。既有pointercancel/lostcapture后有效click、独立零detail/keyboard、Portal/Shadow与原keyboard-owner控制保留。
- 原8项1pass/7fail；首候选55绿后，扩大兼容检出4个unreadable-kind红，已复用原private reader修复。独立review再找到fresh unreadable-down旧取消残留；相同10项9/1→10/0。最终11files **215/215**，完整types **1152files/0errors/0warnings/24hints**，真实public build **44/47**、47 manifests，material原36控制及direct consumer types通过。全部早期红和review初稿保留。
- 准确ee0a提交后真实source/packed各build0、ordinary0、continuous1。两路径四runtime双臂共 **16/16 blur场景通过**：default无window blur且4→5；disabled有matching trusted down→window-target blur→up且5→5、cleanupErrors为空。之后四runtime的reduced-motion与source-revoke继续执行；完整脚本仍在原resize-paint严格等式L1000失败 `157.609 !== 157.609375`。后续未到达的场景不计通过。

packed明确为emitted public packages + private Liquid prototype source；不等于完整安装包验收。Liquid仍是Experimental，本轮通用input修复不改变其发行地位。本地Node24.21.0/macOSarm64/Chrome155.0.8059.39/Playwright1.58.2，不能重标官方Linux/Chrome156环境。

## 新触达的几何读数失败

原真实failure-state保存完整 `--pui-material-width:157.609375px`，原getComputedStyle伪元素width读数为157.609。另一个隔离、无app的同Chrome诊断真实测得：CSS定义157.609375px，computed element/pseudo width均为157.609px，而元素physical rect及CDP伪元素border quad宽均为157.609375。这支持CSSOM读数精度方向，但隔离box不是原产品paint验收，不能据此宣称所有光学尺寸正确。原真实等式、失败与输入保持，沿#1069原harness/material owner继续核对真实paint读取；未改成容差或四舍五入造绿。

两张product failure图位于更晚resize阶段，计数6包括blur之后原reduced-motion有效手势；不能把这个截图数字当作blur当时5→5的计数。后者由原逐臂JSON明确绑定。原screencast JPEG/frames在归档，encoder因813奇数高度失败，未产生可用视频，不把capture cadence计作UI性能。

## main 前进与证据复用边界

执行冻结后#1212已实际合入main `6eb8ad0c4e8ac5c05fee762d096fd6f3d25f4063`。它比DD仅增加PageFrame原5行CSS，未进入本次实验的435个记录package inputs。只读构造的合并tree `9b9134797ce929596a3c7741f9c1e0e41e5fac7c` 中435/435 Git blobs与实际ee0a输入相同；该tree没有提交、合并或执行。ee0a仍是实际运行epoch，不把旧运行重标成新main/虚拟组合执行。第三方环境另依原锁和实际工具记录，不将这435项扩称所有外部输入证明。

## Dialog：新2ca官方配对，校准未接受

Run41643601508，candidate job125943046657实际8/8、196行/120PNG；fixed15d+同三probe的baseline job125943047024实际0/8、33行/29PNG。原三inset0/四Title box504/一RuntimeNotOffered仍在；只有七项进入native产品旅程，四项glyph Range overlap为0。全部170ZIP成员/149PNG引用、service digest、report/runner SHA、三输入50f/3b425/4bbc与cleanup已对账，2629项数据核对0不一致。

严格保留原baseline job的Uncalibrated probe closure与0B分类JSON，没有登记新接受闭包。两环境不同：candidate Node24.22.2/Chrome156.0.8078.79/runner20261101.360.1，baseline24.22.1/156.0.8078.47/20261025.353.1；不归因这些差异，也不称严格同环境。

#1272实际合入父topic，尚不等于main已带入。DD/main6eb仍为旧181f/d5/4bbc。旧f1db包未混入本轮2ca证据。原ZIP字节保留，其CI workspace路径来自原件；本地派生报告另作路径别名。root只实际查看新canonical的Shadcn/WC candidate和baseline390-settled两张，其余只核数据/完整性。

## Sidebar：已合入的五行CSS与独立handback欠项

#1212 head70ca tree `dccebb7cd93e2791c4b993a13daaccb013d4f16a` 与merge main6eb整树相同，原五行CSS开发修复已合入；不代表handback断言通过。该准确70ca重新执行原case仍0pass/1fail/8filtered、exit1，原1s与180s、单次count不变，report SHA/runner/process-exit/cleanup/0errors均核实。

随后两份私有只读observer各保留同一原失败并重抛；源码临时两文件、原getter短路顺序/调用次数/值不变，只在原verdict后请求500ms相邻观测。第一份记录owner，第二份增加独立WeakMap的slot/generation/runtime标签。后者18行=16条带身份事实+2marker，first12是after18的前缀，不算30件独立事件。

同slot `site-contents-panel-1-docs-1-1` / gen1 / Shadcn WC：原getteropen=false/present=true @3326.7；原失败之后marker3335.2；present=false callback3503.4、原getterfalse与return-before3503.5；return-after3565.7时treeHome=true。Content引用在这些采样点以及post500仍connected，未记录实际detach事件。marker不是原count精确时刻，62.2ms包含move lease/scroll/log成本，500ms请求两marker实际间隔528.3ms；观察会扰动，不能替代pristine红或四runtime验收。

这支持本次实现依公开leave屏障归还的解释，仍需维护者决定“逻辑关闭首读即归还”与“public isPresent=false后归还”的应用契约。两条#1227跨PR closed-mount因果证据仍属其各自头，不混为70ca执行。本轮三个原case/诊断都没有用补充绿冲销失败。

## 原件、隐私和图片范围

archive包含本轮真实source/packed结果、失败、完整产品产物、隔离CSSOM诊断、三个sidebar执行以及新2ca官方原ZIP/日志/可读提取/独立复核。raw-public-map逐文件绑定raw与公开hash；私有本地用户路径用别名。派生文本不是原执行字节或原样可运行源码；原PNG/JPEG与canonical ZIP不编辑重编码。archive外另提供结果/报告/phase的普通文本入口。

archive中244个PNG成员（外层副本不重复计数）中，95是本轮本地执行截图，149来自既有官方2ca原件的本次检索，不计为新增本地执行。root实际看本轮两个product失败、tagged sidebar开/关及两个canonical选图，共6张；其余只核完整性，不称全图视觉、真实AT、跨引擎、安装包或完整光学/发行验收。

AI assistance: Codex。没有改旧证据或公布历史；证据分支永不合入产品。
