# Hosted result and S4 scheduler follow-up

The signed product is `569bd7b4`, based on the current main `7d30a788`. Its earlier trace decomposition, local source validation and reviewed native captures are in the [first evidence packet](https://github.com/HyacinthHaru/Proto-UI/tree/6e92ef126ab7a64e1db46db657b754df34944528/evidence/2026-11-14/brutalist-postqueue-569bd7b4).

## Original hosted workloads

Run [43538428160](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43538428160) replayed the exact two original 12-file suite lists. Both arms ran consecutively on the same runner for each slot, with verified Chrome 157.0.8103.50 and Ubuntu image 20261111.196.1. The owned comparison used the same diagnostic selection overlay in both arms. An earlier dispatch was cancelled before either browser execution step because a new upstream test had changed the shard assignments.

Contents and mobile shell passed in both arms, with eight switches and 24 ordered sidebar returns. Dialog passed 8/8 and WC Shadow closeout 153/153 in both arms. Both arms on both slots reached the original 900s wrapper limit. The candidate Chinese S4 startup failed and its English terminal result was unavailable at that limit.

The original Brutalist 1s poll failed in both arms. In this pair both writes were late, by 134–135ms on the baseline and 128–130ms on the candidate. The original queries returned after +1,882/+1,912ms on the poll clock. Write-to-renderer-dispatch was 741.830/778.476ms. Most of each interval belonged to the same long renderer task. The narrow Header correction eliminates an independently reproduced duplicate mutation. This pair establishes no hosted speedup. The previous 524ms trace came from a different hosted pair and its absolute timings are not directly comparable.

## Local static validation

Exact source and static preview each passed the same 15 original selected cases. The static build emitted 679 pages. Its checker failed on the same full set of 53 diagnostics retained on the older clean main `35195a6e`. Type checking covered 1,221 Astro files with zero errors, zero warnings and 30 hints. All nine original CodeExamples on the tested page remain.

## Separate S4 scheduling evidence

The original bilingual S4 cases continued to fail. The first two collection attempts had CDP trace drainage failures. A Chrome startup trace control verified the time mark and scheduler task records. A later bilingual case captured the Chinese responses arriving at Node 59.799s after the two full bodies, with no React import return before the original verdict. That run yielded no scheduling file. The shorter Chinese trace captured a 7.130s renderer task originating at `ScheduledActionSendBeginMainFrame` after both bodies had completed. That trace had no observed chunk response delivery or import return and ended before the original verdict. Its recorded task gaps cannot establish renderer idleness. English was deliberately unselected in the shorter control.

The raw evidence and patch hashes are retained locally. The observed response delivery and the observed renderer task belong to different runs. The response-to-import scheduling interval remains open. The temporary S4 patch was reversed and its checkout removed.
