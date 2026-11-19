# Caller text rollback after rejected split upgrade

The previous integration fixture missed nested caller text when the host's filtered walker skipped over element containers. The snapshot now traverses the caller tree and records its text nodes. In actual Chrome the previous rollback restored the caller's logical range and offsets, but the failed initial upgrade left an empty ShadowRoot and the visible selection string was empty.

When the caller rollback on an already connected split upgrade succeeds, the adapter restores the native caller slot after releasing the failed view. The upgrade still reports its original error. A subsequent successful connection retires the temporary slot and projects through its own view.

The same native suite subset reports three failures against 4def607269ccf1f23e7bff1a807009908dd5d369. On signed 8d4abf48a82756a8a7c1d85684a3dcc06df1149b, all 181 native closeout tests and all 61 owned-decoration integration tests pass, including the new reconnect control. The standalone package, manifest, catalog and workspace checks pass.

The local composition 3fc2a509fb131ddee3bf0de5cbc6028046579822 retains 9 CodeExamples, passes 34 selected packed browser cases, and uses all 1,268 previews in each original S4 locale. Its actual S4 results and separate page-error totals are recorded in verification.json.
