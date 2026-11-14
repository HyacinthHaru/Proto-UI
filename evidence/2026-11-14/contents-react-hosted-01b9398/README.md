# Hosted Contents React publication and command timing

The signed product is `01b9398`, based on main `7d30a788`. See the [local source and original failure boundary](https://github.com/HyacinthHaru/Proto-UI/tree/c8ec7b4a2d0a1305852e83c052afd5d70434c73b/evidence/2026-11-14/contents-react-anatomy-01b9398).

## Original hosted pair

Run [43582122063](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43582122063) ran the original 1/8 and 3/8 suite lists with verified Chrome 157.0.8103.50 and the same runner within each slot pair. The two arms shared the exact diagnostic overlay. The product diff was the two Anatomy paths. The original Contents and mobile shell cases passed in each arm, with eight transitions and 24 sidebar returns. Dialog passed 8/8 and WC Shadow closeout 153/153 in each arm. All four arms hit the unchanged 900-second wrapper. Shard 1 baseline failed native manual disclosure while the candidate passed that file.

Both Shadcn React polls finished green. The original trusted click preceded poll start by about 1,100–1,103ms in baseline and 1,123–1,125ms in candidate. The original one-second window starts at poll start. On that clock the baseline runtime setter mark was +765–768ms and the candidate mark +754–756ms. The last query waited 119.604ms and 90.740ms from browser forwarding to renderer dispatch and returned React to Node at +859.653ms and +834.297ms, respectively. The four earlier queries returned WC. The third original read waited 312ms and 327ms in the two arms. The complete traces report no data loss or SDK mapping error and join clocks with bounded round trips. This pair did not reproduce the prior Contents failure. These observed pass timelines do not establish how that prior failure occurred.

The original Brutalist family polls still failed in both arms. Family writes were 97–98ms and 108–109ms late. Query dispatch followed 756.375ms and 759.752ms after the writes, with the original Node receipts at +1858.229ms and +1871.977ms on the poll clock. Anatomy family signature work was still visible under both connection and retirement. The scoped observer attachment correction independently reduces duplicate domain reads. The hosted pair does not establish end-to-end acceleration.

## Local static and S4 follow-through

The exact source and static preview each passed their 15 original selected cases. Type checking covered 1,221 Astro files with zero errors and warnings. The static build produced 679 pages. The production checker exited 1 with the same 53 diagnostics as recorded on the older `35195a6e` main, which is the available comparison.

S4 used the original zh-CN case and omitted the English case in the local diagnostic. The first run failed the original 60s predicate. It recorded the optimized entry responses delivered to Node around 6.7s after their bodies. Both large dependency requests were issued about 111s after startup-wait began and took 11–12ms to receive full bodies. The trace recorded streaming completion around the same time. The original verdict left about 1.8s after the last body. Neither associated chunk response event reached Node and no React import returned. The first capture closed its JSON but did not report a successful final flush.

A separate post-verdict continuation preserved the original 150s failure and observed for another 40s. In that run both large dependencies again completed, with no Node response or import return observed. The scheduler window reached into the diagnostic continuation but stops before delayed context close. The two runs retain their original verdicts. The same-run response-delivery-to-import interval remains open. The diagnostics were reverted and their temporary checkout removed.
