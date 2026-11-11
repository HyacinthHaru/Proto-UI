# Search enlarged-scroll observations

This test-only diagnostic binds product source `a7ed62929ead8e63e069af7a413338dc05a882f9` in [#1435](https://github.com/Proto-UI/Proto-UI/pull/1435). The isolated worktree added observations to the original twelve selected 200 percent cases. Two passed and ten failed. The original keyboard actions, geometry assertions and deadlines were exercised.

In six cases the same native editor received a trusted End key, the final result became the active descendant, and both recorded scroll offsets stayed at zero. At 32px root font the Shadcn results were 290px tall inside a 56.5px visible scrolling body. The measured Brutalist results were about 177–184px in about 90–94px of visible body. The current full-row containment expectation therefore includes a layout constraint in addition to revealing the active result. Two Vue cases stopped earlier at the runtime option click.

Two unmodified failure frames and the before/after native geometry receipts appear here. These observations are from the development harness.

AI assistance: Codex.
