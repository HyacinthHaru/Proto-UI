# Full-page Contents runtime switching

Main `ebce9feae890d8b9b318e1da82611331ceeb0e19`. Tested candidate `e88a630aa3eb3a272851f2b5b8ee5c4b157092f2`, tree `a4077d6d5c4610e0fc687b785a7fed4172c16e01`. Node 24.21.0, pnpm 10.32.1, macOS arm64, Chromium 155.0.8059.39. All seven CodeExample blocks on the Shadcn Button page, both browser probes, and their assertion and deadline bytes match main.

- Contents original native case passed with all 24 closes and eight family/runtime entries. Shadcn React settled in 669ms, Vue in 948ms, and Vue2 in 926ms against the original 1000ms assertion. Each normal close recorded home insertion followed by marker removal. Eight other Homepage cases were filtered.
- Dialog original available-space case matrix passed 8/8, 196 observations and 120 PNGs. The unchanged three-file CURRENT probe closure still requires the independent calibration decision.
- Focused checks ran 357 tests. 356 passed. The Portal focus-history case failed with the same stack overflow on clean main. Workspace TypeScript passed and Astro reported the same 22 errors as clean main.
- Main's prior original timeout and unchanged-page/profile comparison are in the [baseline evidence](https://github.com/HyacinthHaru/Proto-UI/tree/8a788e4e7a7f5238ef0d6af95371109249d98cab/evidence/2026-11-09/sidebar-main-ebce9fea). The trial timeline and diagnostic traces are separate from clean-head results. The initial-theme guard control passed with the existing owner at construction.

The fix routes inline styles through existing DOM observers, restricts paint and scroll-only relational observation, delegates grid-track effects to installed resize observation, and keeps nested `:has()` probes syntactically balanced. It also narrows simple A11y ID lookup while preserving duplicate-ID rejection and lets the two code participants share their first watched theme read. Mixed or nested CSS declarations and CSSOM writes are covered by the focused checks. Runner receipts bind raw report SHA-256 and completed cleanup.

The two displayed PNGs are selected exact-head captures. Raw and published archive hashes are listed in the manifest. Text has local paths redacted. AI assistance: Codex.
