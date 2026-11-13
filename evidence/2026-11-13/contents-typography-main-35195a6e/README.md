# Contents and Typography against main 35195a6e

## Current product

PR #1438 includes Collection main 35195a6e via signed merge 4bcf4301. The signed Typography change b9c83922 skips selection offset reads only when their endpoint is null. Its test preserves native owner identity and focus across activation and release, with the unnecessary offset reads reduced to zero. The browser fixture change 155da9df checks only the list item's direct Typography carrier and independently proves the authored paragraph retains its own projection. Neither change removes authored content.

Product 1c21bcc9 also skips an inline Website projection theme setter when the existing custom-property value and priority already agree. The two-property repeat changes from two writes to zero. Real changed values and important priority still get replaced by the existing owner. This does not change the WC Adapter props.ts hypothesis. The three-file focused comparison preserves the same five WC Switch palette lifecycle failures on the parent and candidate. The new focused test passes.

On the clean 1c21bcc9 checkout, 284 focused cases passed and those five inherited cases failed. The 14 selected Chromium Contents, Dialog, compact and preference cases passed, with four Homepage cases filtered. All eight runtime switches, 24 ordered sidebar returns, all eight Dialog tests and the original narrow focus-ring observations were retained. The local Brutalist family check passed at 570.491ms. Workspace and Astro types passed with 1,215 files, 0 errors, 0 warnings and 30 hints. Full coverage remains red. The Typography source-only comparison removes one stale fingerprint diagnostic with no new diagnostic.

## Hosted controls

The scheduled main 35195a6e run 43316320185 recorded a failed original family poll at +1000.566ms. The family was written at +713.020–713.900ms and the third original query returned at +1125.411ms. [Scheduled main](https://github.com/Proto-UI/Proto-UI/actions/runs/43316320185)

Fork 43342572818 used the exact 4bcf4301 product and the same default-CPU trace overlay in the original 1/8 and 3/8 shard selections. The original family assertion rejected at +1001.137ms. The write was +1223.950–1225.454ms. The fourth original query waited 1554.984ms from Chrome forward to renderer dispatch and returned to Node at +1922.244ms. Both named Contents and Dialog passed and both enclosing shards exited 124. [Hosted composition](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43342572818)

Fork 43345187178 used exact 155da9df product with the unchanged diagnostic overlay and also ran shard 2/8 for Typography. Family poll still rejected at +1001.015ms. The same-run family write was +1057.663–1058.792ms, Chrome forward-to-dispatch 1331.562ms and the fourth original query returned +1662.165ms. This sample records a shorter wait and still misses the deadline. It does not isolate a performance effect. Named Contents and Dialog passed and each containing shard exited 124.

All eight named native Typography cases in shard 2 passed with Noto Sans CJK SC. They include the original text nodes, native selection and Clipboard checks in WC, React, Vue and Vue 2 for Shadcn and Brutalist. Main's whole Typography file has 7/34 passes, this fork has 15/34, and the same other 19 named cases remain failed. The retained macOS native comparison reached all eight original selection/Clipboard assertions after correcting the LI/P fixture. Four Shadcn cases then failed the unchanged Linux Noto requirement under macOS PingFang. [Hosted Typography](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43345187178)

Fork 43347480175 is the separate exact-product 1c21bcc9 hosted run. Its result is pending at this checkpoint. [Theme replay follow-up](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43347480175)

## Search #1435 and #848

The five inline threads remain unresolved. The existing props.ts A/B patch still applies to the exact author head and the newer main composition retains the same props.ts blob. An isolated div CSSOM control under Chrome 156 produced no MutationObserver record for equal nonempty custom-property writes at unchanged priority. Two priority-change controls produced a record. This checks the narrow CSSOM mechanism, with no Search product execution. The at-least-five paired A/B plus CI, original deadline, layout/scroll and rollback acceptance remain open.
