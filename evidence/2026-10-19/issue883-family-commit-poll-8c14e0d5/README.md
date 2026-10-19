# PR #921 — original family-commit poll evidence

This additive packet binds the observation-only commit **8c14e0d56c4402e9e54401c6d12ef994e0bde526**, tree **3ddd326b5891c5cb230cadaa75ccdabf10cb95ae**, on accepted main **042f1e5740e1a809b9ca238593f5bb01a1f8a8e3**. The latest commit changes one browser test,61 additions/2 deletions; it does not repair production performance or Portal ownership. The request was to capture the original initial-family poll, follow the Form invalid-label collector gap, preserve original assertions/owner controls and verify the exact combination.

## What the original hosted poll actually recorded

CI39252003235,job118059224444,checked out **02f6ff42e92e019033c3a64683b021817e5269c6**, whose tree is exactly the candidate tree. The case failed at **family-commit**, before its runtime/breakpoint/owner loop. Relative to the Node poll-start observation:

| Original getAttribute call |     Start |   Returned | Returned value |
| -------------------------- | --------: | ---------: | -------------- |
| 1                          |   0.335ms |    7.002ms | shadcn         |
| 2                          |  57.777ms |  314.328ms | shadcn         |
| 3                          | 364.826ms | 1134.289ms | brutalist      |

The catch observed the original rejection at **1001.650ms**. Its frozen rejection snapshot includes call3's start but no returned time/value. The same query was subsequently observed returning **132.639ms after rejection**. There were zero dropped calls and no observer error. Stdout,actual failure JSON and lifecycle JSON agree. The original1000ms matcher stays red; its later ready screenshot does not change that result.

These are **Node API-observation times**,not the browser's DOM assignment or click-to-commit time. They establish an observation deadline firing before the third response was recorded,not whether the DOM committed before or after one second. The case never reached the reconnect assertions,so this does not establish a Portal reconnect defect. No business-state,semantic-owner,wait/deadline or CSS repair is inferred from these times.

The one original query Promise is returned unchanged; a side reaction records its result. The original171 matcher methods/expected arguments,308 awaits,197 existing browser API call expressions,case names/deadlines and keyboard-owner source remain. Side observation adds clock/memory/microtask work and is not claimed zero-interference. Current Node executions contain all17 owner cases passing. The64-record cap exposes dropped count rather than claiming an unlimited trace.

The actual current failure artifact is **12187263780**,58,270,570bytes,SHA256`5d4b18f5192f7d64e5bda3ca3042d94d6044d51e118dfd88059c590c7c8201e6`;its central directory has231members. Only four verified source/failure members and their receipts are mirrored. The large ZIP stays private; its hash binds the preserved source. The separately included historical67 failure retains its own2026-10-18 source/time and is not transferred to8c.

## Executed controls and unresolved evidence

| Actual source/environment | Result and boundary |
| --- | --- |
| 67+saved candidate,precommit,test-owned dev | Original complete Brutalist1pass/8filtered,40records,poll422.384250ms;types934files/0errors/0warnings/14hints. Not a postcommit run |
| Clean8c Node129files,max2 | 1802pass/5fail:four Checkbox authored-token failures plus one Dialog logical-origin removal isConnected assertion |
| Clean original Dialog pair,max1 | 2/2pass;original20ms and assertions unchanged |
| Clean8c same129files,max1 | 1803pass/4token failures;does not erase max2 red |
| 8c+private failure-only Dialog catch,same129/max2 | 1803pass/4fail,no failure capture triggered. This is not an unmodified max2 pass. Original source restored byte-for-byte;root cause remains unknown |
| Clean8c original native,own dev server | Shadow111+Homepage9=120pass/0fail;Brutalist40records,poll400.262292ms |
| Clean8c tests on exact official artifact,plain localhost | Original Homepage/Contents/settings/complete Brutalist journeys4pass/16filtered;40records,poll26.681167ms with one original query. Server/process cleanup completed |
| Current CLI isolated actual-source probe | Two FormField invalid-token expectations fail,two plain Error controls pass. Current collector/scanner and four inputs bind to8c/67/main |

The three positive poll intervals above are not click-to-commit measurements or an explanation of hosted red. Both dev executions retain the React hreflang warning;the official-artifact execution has consoleErrors empty. The Dialog failure is logical-origin removal,not the earlier externally moved-target premise. No failure-time lease/DOM snapshot was captured in the private positive control,so neither a worker cause nor a production fix is established. No original20ms/assertion or production code was changed.

The CLI probe observes `field.stateHandles!.invalid` as unresolved with reason`subject`;the invalid-prefixed tokens are missing while plain ink tokens are collected. This is isolated source collection,not complete package import,Runtime or current native Form execution. #906 carries Form acceptance but is not a proven collector claim;#889 HT.G4 is a different import-stat issue. Generic collector coverage belongs to its existing workstream;no C Field-state owner,component-name whitelist,hand-written CSS fallback or Compiler/IR takeover is added. Old0ec Form native failures and67 CSS scans remain historical via the prior packet.

## Actual preview and CI boundaries

The new official preview producer39252002967/job118057828610/artifact12185508935 was downloaded once:21,139,555bytes,SHA256`3c9b5ac0440660763ce365aea876edd6d66713cd0bf7cc621b76795100a5e43c`. The existing guard/downloader/extractor/sanitizer admitted and preserved every **3835file/669HTML/104,046,139expanded bytes** under unchanged limits. It did not run the unfiltered publisher CLI or deploy a remote site. Local execution of those actual bytes is not remote/CSP,all-page optical or AT acceptance.

At the complete paginated read **2026-10-19 12:54:27 UTC**,CI39252003235 is FAILURE:22jobs13success/9failure;all36workflows terminal26success/10failure;104checks69success/35failure. Browser2 ends124 after its Homepage file completes8pass/1fail. Five fully summarized shards1/3/4/5/6 report652pass/32fail/15skip;2/7/8 exit124 without full summaries. These are not all-eight totals. General stops at78public-doc drift reports before ordinary Vitest;it supplies no proof that current unit controls ran.

Canonical package118058348699 builds44/47packages,checks47manifests and passes9policy tests. The existing Finf advisory policy reports4PASS/5ADVISORY. Its nine gzip/minified/hash measurements equal explicitly historical canonical measurements;this is not strict all-budget compliance,an extra local build,or gzip-file byte equality. Other current canonical failures remain recorded without blanket prior/new-C attribution.

[records.zip](records.zip) preserves selected records;[raw-public-map.json](raw-public-map.json) binds raw/public hashes and transformations. [packet.json](packet.json) has exact counts;[manifest.json](manifest.json) covers outer files and excludes itself. All selected PNGs keep original bytes. Eight new official Contents images and the new hosted failure image were individually viewed;Shadcn Vue2's sparse installation section remains visible. The historical67 image keeps its earlier review/source. No all-page or comprehensive visual/AT acceptance is claimed.

Public text/source is sanitized derived evidence,not represented as exact execution bytes or standalone recipes. ModelTrace samples/context,authorization/handoffs,credentials,large ZIPs,site trees and caches are excluded. Peer reviews remain human-assisted/unassessed/partial/ABSTAIN. No independent GitHub APPROVE,merge,Issue closure,complete C/Finf acceptance or passing original deadline is claimed. Earlier evidence remains immutable at fe56c9bbca7cc4194ea842e3029b0767327aec3d.

Append-only count correction `8C-PACKET-PACKAGE-COUNT-001`: actual current8c job118058348699 and historical67 job117728901281 each print44 per-package rows and `complete:44/47`. Earlier derived summaries/author prose mistakenly carried42 from the older f30 job117709736543,whose own42/47 summary remains correct. The original erroneous derived files and old public packet are preserved; the new correction binds each raw log SHA/line and supersedes only that count. Manifests,policy/budget and test/timing results are unchanged.
