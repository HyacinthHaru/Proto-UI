# Issue #663 最终独立本地证据对账

同一准确提交 `28eccdb24efb76faa9d6f43a4f8aefbe157860ef` 的最终对账未发现新的可执行修订项，初始源码审查也没有未关闭 finding。基线为 `9eb93e9ba96fe1f88e9dade194fa838fbdc2c18f`，当前 tree 为 `37a1f1b90a2b9c18eb295efaae10357182a073f2`，产品工作树干净，仍仅修改 `apps/www/astro.config.mjs` 与新增 `apps/www/test/proto-ui-source.test.ts`。

这是 `review-bounded-regression` 的 **partial / ABSTAIN** 本地报告，不可提交为 GitHub Review。没有 canonical PR v3 输入，也没有填造 PR、正式 packet 或 approval。路由 eligibility 已重新检查，仍明确限制为 partial/ABSTAIN。

| 已回读的证据 | 核实结果 |
| --- | --- |
| 可移植 resolver 回归 | 修复前 POSIX 通过、Windows 失败；候选两例通过；原生 Windows 的同一测试也为两例通过。 |
| 普通文档生产构建 | 245 页，退出 0。 |
| POSIX 普通构建浏览器 | 58/58，实际 WC/React/Vue，零 page/console error。 |
| 原生 Windows 普通构建浏览器 | 58/58，实际 WC/React/Vue，零 AsHook/page/console error。 |
| 公共包构建 | 43/43，退出 0。 |
| 完整类型检查 | 退出 0；Astro 231 个文件，0 error、0 warning、0 hint。 |
| 完整 `pnpm test` 主阶段 | 488 个文件通过、3 个既有文件跳过；2,582 项通过、34 TODO。该阶段包括真实 Chromium Scroll 六项和新的 resolver 两项。 |
| 完整测试的独立浏览器阶段 | 26 个文件、136 项全部通过。整个 `pnpm test` 退出 0。 |
| 包预算 | 9 项 PASS；Runtime gzip **60,000 / 60,000 字节，余量 0**。 |

`commands.json` 记录完整测试调用为 `corepack pnpm@10.32.1 test`，没有追加测试选择参数。仅设置 `VITEST_MAX_THREADS/FORKS=2`、`VITEST_MIN_THREADS/FORKS=1`。已回读未变的默认两阶段计划：主阶段排除固定浏览器清单，随后顺序运行该 26-suite 清单；本任务没有额外筛选或调整 timeout。不能把主阶段称作全部非浏览器测试。

原生 Windows 客户端图从基线的两份 retained Core internal ID 收敛为一份，保留全部 8 个 exports、renderedLength 878。普通与 diagnostic 的 `_astro/adapt.B1J8vIjo.js` 已独立比对：均为 332,424 字节，SHA-256 `6b31b6dd5381e48b3f27851f3e7c81cd9f619e351b2b87755019ec47ee8d8462`。整套资产仍有 7 项差异，所以诊断图继续作为独立变体；没有宣称整图完全相同，也没有把 SSR 与 client 相加为重复实例。

已比对基线普通构建与候选普通构建的 10 项 CSS 资产清单，全部一致；候选实际 CSS 字节也与清单哈希一致。config、lockfile、Core internal/prototype 与 Runtime instance 的记录均匹配准确提交的 Git blob；由其 LF 字节转换为 CRLF 可重现 Windows 记录的所有原生 SHA-256。生成 CSS 的 source-after 字节与 Git LF blob 相同，diff 为空。

Windows 原始输入记录为 33 条 trusted 加 1 条 WC Button 对外语义 `CustomEvent('click')`。已回读 Button 的 `run.expose.emit('click')`、WC Adapter 的 CustomEvent sink 及站点消费说明；不能写成所有捕获事件都 trusted。三个 Pagefind 导航 `ERR_ABORTED` 仍保留，零 page/console error 不代表全部网络请求成功。

Root 已逐张检查 10 张实际组件 PNG；本审查者只独立核对十张文件的 SHA-256 与该记录一致，未独立视觉检查。所有构建、测试及浏览器运行均由主线程或其原生验证执行，本审查者只回读日志、源码和资产，没有重跑测试或修改产品/证据。

源码结论保持不变：修复仅在原生存在性检查之后统一模块 ID；回归执行真实配置 resolver，并未把归一化写入替身。测试的 `path.resolve` 忽略参数，因此不独立覆盖全部 export mapping 或构建器注册，这一范围已由独立原生构建证据补充。没有新增语义、依赖、预算、生命周期或 Core context workaround。

本地与原生验证的初始待办已完成对账。最终公开材料在本次委托时尚未推送，PR、可信精确 head CI、独立维护者审查和实际合并仍待后续完成；本报告不将它们算作已完成。完整观察、输入哈希与初始报告对账保存在 `independent-review-final.json`。
