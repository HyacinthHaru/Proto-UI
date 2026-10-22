# Exact35 natural Search/Docs failure timing

Current35 shard1 genuinely passed CJK setup and ran its original browser step. It ended17:16:51UTC after the original900s budget (exit124, no fullshard summary). Its Search file completed14pass/16fail:7initialreadiness failures plus9Docsrole failures. This is not the earlier b2 setupblock or normal local calibration.

The preserved complete artifact is12444711362,7,999,181bytes,SHA256b114138289cf04936a44a0b78dd1062e6c2b0af423f4ab51758c91d7d34e9c22. All312members were enumerated and CRC/SHA checked;21textmembers were extracted. The fullZIP remains intact. NoPNGpixels were viewed. Artifactname,run39818721613,attempt1,slotbrowser-1-of-8 and source-sha ab3020973fe0f7d760ac146ad668e9bf518a852d match. GitAPI proves the checkout treead39 equals35.

All9failedDocs cases hadoneactual query1/request pendingat the original1000ms verdict. Every failedcase had already finished fast selector parsing, but was still awaiting `resolveInjectedForSelector`. Its original utility evaluator was dispatched only after that recordedverdict. Six failures then captured the samecallId/attempt1 browserselector/getter returningcombobox; three Shadcn1280/1440/2048 cases exhausted the separate1000ms observationbudget and closed thecontext before anybrowserbatch wascaptured. Their eventualTargetClosed rejection is not a successful DOMread.

| Case | Verdict | Resolve await ms | Evaluate dispatch after verdict ms | Browser getter span | Mapping |
| --- | --- | --: | --: | --- | --- |
| brutalist/320 | pass | 934.343 | -62.388 | 0.000 ms at recorded resolution | complete |
| shadcn/320 | fail | 1692.044 | 701.304 | 0.000 ms at recorded resolution | complete |
| brutalist/390 | fail | 1049.389 | 51.094 | 0.000 ms at recorded resolution | complete |
| shadcn/390 | fail | 1574.215 | 575.177 | 0.100 ms at recorded resolution | complete |
| brutalist/1280 | fail | 1317.234 | 317.766 | 0.000 ms at recorded resolution | complete |
| shadcn/1280 | fail | 2060.347 | 1061.534 | missing | incomplete |
| brutalist/1440 | fail | 1316.881 | 318.561 | 0.000 ms at recorded resolution | complete |
| shadcn/1440 | fail | 2073.532 | 1074.771 | missing | incomplete |
| brutalist/2048 | fail | 1479.082 | 480.138 | 0.000 ms at recorded resolution | complete |
| shadcn/2048 | fail | 2090.833 | 1091.124 | missing | incomplete |

The6completefailedmappings establish late execution by same-request causal order: browsercallback occurs after originalSDK-evaluate dispatch, which is already after the Nodeverdict. No guessed Node/browser clockoffset is needed for that bounded after-verdict conclusion. Selectorparse is about0.009–0.023ms; the six browserselector spans are a fewmilliseconds and recordedgetterspans are0 or0.1ms. Equal sampled times do not mean zeroCPU or a measuredclocktick.

The long observed await lies inside `resolveInjectedForSelector` after parsing. That function awaits frame resolution, the actual utility context and its injectedscript. This capture does not separate those awaits, Nodecompletion scheduling or observeroverhead. It therefore locates the first divergence before the actual getter without proving anengine orPUIproduction cause. It does not establish whether the DOMrole was alreadycorrect before thedeadline.

The7initialReadiness failures enteredthebrowserbody52–1251ms after the recordeddeadline under same-host Date.now alignment; each firstsamplefound0commands andhadnullgettertimestamps. No pre-entryDOMtruth is known. Theonepositive initialcase entered74ms beforedeadline andlaterobservedthecommand. These are separatepredicates fromDocsrole.

All10diagnostics report0errors/drops andmatchingSDKsourcebindings;7havecompleteboundedmapping(6failed+1passed),3areexplicitlyincomplete. `transportComplete=false` remains. Originalmatcherfailure, observationbudgetexpiry, cleanuprejection and overallshard124 remain distinct.

The narrow next observation, if authorized, is to bracket the actual per-instance `resolveFrameForSelector`, `frame._context` and `context.injectedScript` awaits under the existingcallId while preservingoriginalPromises. Do not warmtheutilityworld or add a readinessawait before theoriginalpoll. No newtests or sourceedits were performed in this read. Disposition: partial/ABSTAIN.
