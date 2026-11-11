# React owned decoration native ref

The review on exact Search head `ee86b3cbc452abf8a92a9ff0474752975397af99` identified a stale assertion in the adapter test. The baseline file ran with 8 passes and one failure. React’s rendered VNode left `inert` undefined while the test expected `true`.

The native ref sets the physical empty span’s `inert` attribute. The corrected test checks that React omits the VNode prop and verifies the actual mounted attribute immediately after each framework’s ref or insertion hook. Vue and Vue 2 retain their original VNode assertions. The stage’s style sink and empty-leaf assertions still run.

Exact candidate `3139922b91dd94111a6a290687ab43adc479788b` changes one test file. Its adapter template, adapter stage and Search public-mode files passed 39 tests, including all 9 in the original adapter template file. This is local exact-head evidence. The prior actual browser and production results remain bound to `ee86b3cb`. Full hosted checks and formal review remain separate.

[Finding](https://github.com/Proto-UI/Proto-UI/pull/1435#discussion_r4540319375)
