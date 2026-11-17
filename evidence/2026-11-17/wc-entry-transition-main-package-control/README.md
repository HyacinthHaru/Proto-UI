# Additional main WC package failure control

Agent request paraphrase: continue the authorized C-group work after official CI skips full test/package execution, retain actual failures and distinguish new regressions from parent-source behavior. This addendum does not change the two-path transition repair or its prior evidence.

Exact candidate9427750cc760e092914087f2e88d365d115ccad9, parent0f0955a9d624e0ef5e250f56a0eaa0fc52bbfb53. Full WC **non-browser** selection:160files,155pass/5fail;1182passing/8failing tests, plus one load error. The affected files were then run unchanged with onlyWCmodules temporarily restored to its exact parent blob (actualHEADremains942, other trackedruntime source unchanged):5files,48pass/8fail, identical eight failed assertion IDs and identical load error. This is not falsely labeled a full160file parent run or exact0fHEADCI. The candidate source was restored clean in finally.

| Original failing file | Retained observation on both variants |
| --- | --- |
| previewer.demo-renderer.test.ts | Missing registered base-dropdown-group and shadcn-style-scope prerequisites in three real demo controls |
| shadow-s2-admission.test.ts | Button companion missing select-none; Switch unresolved transition-transform inventory expectation differs |
| shadow-split-effects.test.ts | Two existing assertions expect animated-border used-value-rounding rejection; queueStyle does not throw |
| shadow-split-prototype-admission.test.ts | Old Dialog Mask companion reaches mount.mounted despite original negative admission assertion |
| view-operation-receipt.test.ts | File fails to load: The URL must be of scheme file; this is a loader error, not a parsed assertion pass |

The original assertions, test selection and maxWorkers2/minWorkers1 remain identical across the failure control. No new native/browser execution occurs here, including #848. All failure details, selected commands and raw report hashes are retained in the sanitized JSON. The internal registry/admission/loader state walkthrough above is evidence of these actual failures; no visible UI or complete Adapter pass is fabricated.

**Disposition: package check remains red.** The same failures occur under the parent-source control, so they are not attributed to the new transition filter on this evidence. This does not prove universal nonregression or satisfy full trusted acceptance. Continue verified C-group baseline repairs separately, preserving these original assertions. PR1496's focused339/source-native/installed-native/scopedWebsite passes remain separately bounded; independent review/integration still pending.
