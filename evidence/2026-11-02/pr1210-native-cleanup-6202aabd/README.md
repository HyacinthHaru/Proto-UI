# PR1210: full native script and cleanup on6202

Exact clean head6202aabd11b7964614a4cad4e7aa0afbeb4c3409, tree3e13d7f0f650e1d5fad66c9ce3f0b9382008142c. This includes the mergedb277 lifecycle fixture and6202 shared stopServer change. New execution, not retagged984 evidence.

## Real scope and result

Original `node --import tsx apps/www/scripts/capture-mobile-interaction-evidence.ts --revision-kind candidate --expected-revision 6202aabd11b7964614a4cad4e7aa0afbeb4c3409 --out <output>` completed exit0. No quick-preview, case filters, assertion changes or deadline changes. Six-minute360s outer watchdog never fired; wall elapsed136.151s. Source hash unchanged; tracked worktree clean before/after. Astro devToolbar was disabled by its existing CLI as in the workflow; ignored preference only.

All11 original cases passed: eight homepage390/430×zh-cn/en×light/dark, original Docs500×761 and two320px/text200% stress. Failures array empty. Eight home plus Docs cases have explicit pageErrors:[]; stress cases do not expose that field, so no blanket pageerror-zero claim for them.

Docs retained Search has naturally connected combobox/listbox under display:none ancestry. Real Menu click, Enter/Space and Escape close/refocus pass; actual nested Select consumes first Escape and returns focus to its Trigger, second Escape closes Header. Separate Contents Dialog control passes. Five actual Docs stage PNGs exposed here were visually inspected; all73 original PNGs remain unchanged in ZIP, not claimed all individually inspected. The full metrics retain DOM/ARIA observations and case-level limits.

## Actual cleanup observations

- browser-close-started13:49:51.638Z → finished13:49:51.694Z:56ms.
- server-stop-started13:49:51.695Z → finished13:49:51.709Z:14ms.
- assertions-complete13:49:51.710Z → process-before-exit13:49:51.726Z:16ms, activeResources:[]. No Timer in the recorded stop/assertion stages.

These are one local run's measured intervals. They do not prove a universal timing bound or the old hosted timeout's sole cause. Original2780 timeout and984 roughly5s tail remain historical. The separate239/239 seven-file unit result is published elsewhere; not rerun or summed into these11 native cases.

## Environment and binding

Node24.21.0, pnpm10.32.1, Chromium155.0.8059.39/macOSarm64; original shared browser helper/configuration. This starts its own real Vite dev server and browser (no static-server override). Mobile cases use the script's original mobile simulation/reduced-motion/clipboard settings, not physical-device or full-AT testing. Original Docs route uses500×761/DPR1. This differs from hosted Linux/Chrome156/Node24.22.1 and does not replace exact-head hosted CI or independent acceptance.

Script and scriptRevision both bind6202; script raw SHA256 d0fba7cd9a6171c92ca85c354d4d98f2460a28b319ee3af57ff1ebbdbc257542. source-map.json.txt maps raw/public bytes. Logs/source/receipts only sanitize machine paths and ANSI; public derivative filenames end.txt to preserve exact bytes through formatting hooks. PNGs unchanged. ZIP contains all74 original observation files plus launcher/log/receipt and original capture script. No source changed, new product fix, GitHub APPROVE, merge or Issue closure claimed. AI assistance: Codex, user-directed validation.
