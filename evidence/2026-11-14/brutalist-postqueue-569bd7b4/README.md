# Brutalist renderer dispatch after family publication

The requested scope was to follow the original Brutalist reconnect query after family publication, remove independently reproducible redundant work, preserve all examples and deadlines, and track S4 separately.

## Source-bound 524ms breakdown

The candidate trace from run 43469554292 records 523.726ms from the completed family setter to the same query entering its renderer thread. A single 673.398ms renderer task began 149.950ms before that write. After the setter, 511.835ms remained within the animation frame callback, then 11.613ms elapsed to the task end and 0.278ms to command dispatch. The command took 1.657ms inside the renderer. The attribute getter had zero elapsed time at the page clock's resolution.

Overlapping work inside that task includes the synchronous Header rectangle read under Homepage publication, weighted 87.643ms in the V8 samples, and WC disconnect checkpoints and connection callbacks with 169.032ms and 107.220ms of independently unioned wall intervals. Owner retirement and reconnect stacks include Anatomy reconciliation. Palette notification had a separate 35.635ms wall interval union. Trace intervals and samples overlap and cannot be summed as independent savings. The trace does not identify the amount, if any, of layout work attributable to the redundant visibility mutation.

## Exact repair

The signed candidate preserves the actual synchronous placement and publication boundaries. Header disclosure now avoids reassigning identical `hidden` state. The focused replacement control observed a redundant desktop-nav mutation on the parent and no visibility mutation with the fix. It still verifies real visibility changes and focus return on close. The broader Header, Contents and surface unit selection passed 102 cases.

The exact local Chrome source run passed 15 original cases, including eight Contents switches, 24 sidebar returns, eight Dialog cases and the narrow RuntimeBox case. Nine cases were unselected. At both 320px and 390px, trusted clicks yielded a first-frame panel top of 61px and Header bottom of 56px. Geometry was sampled separately from hosted timing. All nine upstream Shadcn Button CodeExamples are present with the original browser assertions and deadlines.

The original hosted comparison was restarted after the updated main's test inventory changed which files the shard indices select. The first diagnostic run was cancelled before either browser execution step. The diagnostic-only carrier pinned both original 12-file lists. It did not modify product CI, the test cases or their deadlines.
