本次是准确35同失败原件的只读复核，partial / ABSTAIN。未运行测试、浏览器、下载或新增RPC；未改已发布包。

原artifact12444711362共312成员，compressedSHA b114138289cf04936a44a0b78dd1062e6c2b0af423f4ab51758c91d7d34e9c22。独立核对完整压缩文件SHA和21选中文本成员；synthetic checkout ab3020973fe0f7d760ac146ad668e9bf518a852d 的tree等于35/ad39。

Docs10项为9红1绿；所有9红冻结verdict时，parse已结束、观测resolve区间尚未结束，utility.evaluate.dispatch尚未出现。下表单位均为ms，verdict是finally冻结标记，不是内部计时器精确触发点。

| case | verdict−query | resolve区间 | dispatch−verdict | Node结果−verdict | browser getter采样差 | 结果 |
| --- | --: | --: | --: | --: | --: | --- |
| brutalist/1280 | 1000.809 | 1317.234 | 317.766 | 334.196 | 0.000 | 原红/后到combobox |
| brutalist/1440 | 999.725 | 1316.881 | 318.561 | 334.613 | 0.000 | 原红/后到combobox |
| brutalist/2048 | 1000.262 | 1479.082 | 480.138 | 500.497 | 0.000 | 原红/后到combobox |
| brutalist/320 | 998.166 | 934.343 | -62.388 | -0.092 | 0.000 | 原绿 |
| brutalist/390 | 999.797 | 1049.389 | 51.094 | 71.601 | 0.000 | 原红/后到combobox |
| shadcn/1280 | 1000.279 | 2060.347 | 1061.534 | 1077.665 | 无batch | 原红/后TargetClosed |
| shadcn/1440 | 1000.405 | 2073.532 | 1074.771 | 1089.314 | 无batch | 原红/后TargetClosed |
| shadcn/2048 | 1000.986 | 2090.833 | 1091.124 | 1103.261 | 无batch | 原红/后TargetClosed |
| shadcn/320 | 1000.031 | 1692.044 | 701.304 | 756.002 | 0.000 | 原红/后到combobox |
| shadcn/390 | 1000.394 | 1574.215 | 575.177 | 631.285 | 0.100 | 原红/后到combobox |

六个红例有完整同call/query/attempt/browserbatch，后到combobox不改变原红。三个Shadcn宽屏没有browserbatch，后来的pending0/settledtrue来自TargetClosed，不是成功读取，也不能证明getter从未执行。

getter的0/0.1采样差仅是时钟读数，不能叫0cost。无需跨时钟就能确认：同Node时钟上，9红的utilitydispatch都晚于冻结verdict。报告另给了依同call因果包络推导的条件offset区间；不把timeOrigin/DateNow差当作精确同步或量化误差上限。

7个readiness红首次browserentry在stage后1052–2251ms，已超过原1000ms。每个只有一次实际sample，commandCount0、getter两戳null、owner/gen null、timerSamplefalse；因此是到达后没目标且没有调用属性getter，不是一个目标缺attribute，也不证明此前全1s都无目标。

resolve区间仍合并SDKawait、Node调度、reaction及观测器开销；不能定某个SDKawait、引擎、资源或C生产实现根因。Browser1原900s最后exit124，无完整整片总数。Search文件实际30项14/16与原件9Docs+7readiness失败相符。

仅将失败后的独立drain预算1s改2s可作为一次授权取证控制，但须保留原1s verdict/error、原case deadline与单一绝对尾段预算；延长context存活是条件变化，不能回填旧红或承诺补齐。应记录真实close开始，不能以cleanup完成代替。此处没有实施。
