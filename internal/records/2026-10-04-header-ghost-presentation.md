# Header ghost presentation (2026-10-04)

The user identified an inconsistent control language: the shared Header Search looked unframed while its Selects looked like boxed form fields. The accepted consumer rule is quiet Header commands with clear hover/focus, while labelled compact preferences and ordinary form fields retain their field surfaces.

The existing public API had no unframed Select appearance in either family, nor a Brutalist Button ghost variant. The user-directed scope explicitly admitted minimum additive visual inputs on these existing Base-derived prototypes, not a website-only prototype or private CSS paint override:

- Shadcn Select Trigger: `appearance: default | ghost`, default `default`.
- Brutalist Select Trigger: `appearance: flat | elevated | ghost`, default `flat`.
- Brutalist Button: existing `variant` adds `ghost`, default remains `solid`.

All three continue to call their original Base as-hook once. Existing default, flat/elevated and solid/surface/destructive behavior and appearance remain. Ghost changes presentation only: transparent resting border/fill, no resting hard shadow, readable family foreground, family-neutral interaction feedback and retained focus/disabled semantics. Active appearance changes withdraw previous paint and movement. These are explicitly Proto UI additions, not claims of pinned-upstream parity. No new package export, dependency, release, lifecycle admission or theme palette was added.

The Header consumes these props. Desktop Selects are ghost; compact labelled preferences restore their family default through public props without replacing the Select owner. Header command Buttons use ghost. The existing explicit elevated module fixture remains available to prove compatibility. The hosted Header suite now exercises ghost/default, real hover/press/focus, popup, runtime and compact reparenting; its immutable historical flat negative stays source-bound.

Before publication, three new public ghost tests failed against the unchanged implementation, then passed after the visual rules landed. The public primitive/theme suite passed29 tests; the consumer suite passed93, including two families across all four installed Adapter runtimes. The evidence callback contracts passed18 and the prototype catalog passed. Full exact-head types/general and hosted visual acceptance remain pending. This is not a completed visual or release claim.

The preceding9578 source passed the full mobile matrix, native links, source selection, Copy and grammar. Its separate density probe still selected a hidden duplicate TOC link; that probe now limits owner reads to visible navigation. The actual visible current was correct in its screenshot. Search retained a real1329ms readiness failure under the unchanged1000ms deadline. A separate post-failure CPU-profile navigation is added only as diagnostic evidence; it never runs during or replaces the original acceptance observation.
