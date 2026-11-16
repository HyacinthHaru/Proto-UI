# Full S4 on the three composed repairs

A clean local merge `3580a31e` comprises [#1483](https://github.com/Proto-UI/Proto-UI/pull/1483), [#1484](https://github.com/Proto-UI/Proto-UI/pull/1484) and [#1485](https://github.com/Proto-UI/Proto-UI/pull/1485), based on `7780dba2`. It ran the original full S4 browser test in Chinese and English with one worker and pinned Chrome 156, with no additional diagnostic patch.

Both cases reached their original 150-second bound before entering the interaction journey. Each recorded zero page and console errors. The last emitted startup-state change in both cases showed the initialized Base Accordion React host as the first pending preview, with no children and startup still pending. The original predicate counted all 1,268 previews. The final attempted query rejected after the context closed.

The measured bounded S4 interactions on the separate standalone scene are available in the [scrollport evidence](https://github.com/HyacinthHaru/Proto-UI/tree/b6d3e3de74b89dd89a2781b5a272476eaad6d025/evidence/2026-11-17/split-root-vertical-scroll-cdba4fe2). The full-run receipt keeps the remaining React startup condition visible.
