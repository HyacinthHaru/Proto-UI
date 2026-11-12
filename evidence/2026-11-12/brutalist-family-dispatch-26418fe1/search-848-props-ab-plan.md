# #848 props.ts equal-write A/B plan

This is a prepared experiment. No new Search browser or native execution, candidate push, assertion change or issue checkbox was made for it.

## Fixed source and intervention

- A is the clean current #1435 `3139922b91dd94111a6a290687ab43adc479788b` on `b25229a94251398bc2f375554fcb9622dc8e79ab`. The WC props blob `f8d47ca59cf22e0bafc0e9c7475f4d324389c262` is identical on the two revisions.
- B applies the adjacent checked patch to that same source. B replays the CSSOM setter for equal nonempty custom properties at `syncOwnedSurfaceStyles`. It retains the same current-value and priority reads, standard-property and empty-value calls, owned-style bookkeeping and raw Props delivery. This isolates the proposed wakeup effect of performing the setter. It is a test variant only.
- Use two separate worktrees and the same frozen lockfile, Chrome version, OS/font inputs, resource limits and one-worker configuration. Use the original Search family Button commands and each route's fresh page/context. Every matched pair uses the same server cache condition. Alternate order over at least five matched pairs, with no runtime test retries. Preserve completed, failed and startup-blocked samples independently.

## Original verdict and causal observation

- Run the original eight Shadcn/Brutalist × light/dark × 390/1440 cases. Readiness starts at the original post-networkidle `initial-ready` stage. Retain the actual active-generation open-command predicate and its 1000ms deadline. Record `startedAt`, deadline, first `observedReadyAt`, absence/disabled state and original verdict. Keep later switch, keyboard, layout and scroll verdicts separate.
- First establish whether an equal `style.setProperty` actually changes the Chrome style attribute or delivers a native MutationObserver record on the same owned element. CSS text equality alone does not measure observer delivery. Use identical scoped observation on both arms, with target/generation identity and before/after live value/priority. Use a separate diagnostic follow-up when observation would alter test timing.
- Reconcile observer registrations and callbacks with the actual target. `site-native-controls` observes the document element, Header disclosure observes its leased Button, Previewer bootstrap observes adapter panels, and projection theme observes its scope and ancestors. A native style mutation on an unrelated target is insufficient. If a callback is observed, bind it to Search preparation/publication and active opener appearance in the same case. Keep Pagefind retry, runtime-switch getter transport and IME separate from initial opener readiness.
- Capture both exact source/tree/patch and toolchain fingerprints, original test outcomes and selected actual browser observations. Mirror the pair in the applicable exact-source CI browser lane using authorized owned verification refs. Keep production Pagefind/startup and rollback/layout/scroll as separate acceptance evidence.
- A reproducible A/B verdict difference with a matching write → observer → readiness chain would support the hypothesis on this composition. Equivalent verdicts alone are insufficient when neither arm reproduces the baseline or the relevant property/target is absent. Record missing mechanisms or mixed outcomes explicitly and leave the Issue open.

## Current #1435 review

Five inline threads are still formally open. Bootstrap materialization, shortcut-close handback and successful replacement focus have earlier author replies and source-bound evidence. The earlier preparation-failure rollback thread has an author reply at `df9eaf2f`; the later maintainer late-publication finding has distinct 3-red/3-green native evidence at `ee86b3cb`, with the product bytes preserved at `3139922b`. The remaining React inert VNode assertion is addressed by the test-only current commit with 39 focused passes. Thread resolution and maintainer re-review remain outstanding.

- [PR discussion and exact current evidence](https://github.com/Proto-UI/Proto-UI/pull/1435)
- [Current-source inert test evidence](https://github.com/HyacinthHaru/Proto-UI/tree/4ae2b18324568c9d7b09ded63f7c5c8e034d21e0/evidence/2026-11-12/search-decoration-native-ref-3139922b)
- [Late rollback native evidence](https://github.com/HyacinthHaru/Proto-UI/tree/361536a6f6ed82c5de72683e6f221ab3578e3726/evidence/2026-11-12/search-late-rollback-ee86b3cb)
- [Original #848 conditions](https://github.com/Proto-UI/Proto-UI/issues/848)
