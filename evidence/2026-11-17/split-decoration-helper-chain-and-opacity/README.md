# Split opacity and transitive setup ownership

[PR #1484](https://github.com/Proto-UI/Proto-UI/pull/1484) at `c71bd59185db50f604d1e1757da300401f18ea3b` recognizes function-valued canonical setup properties and follows proven synchronous helper call chains. Helper paths with opaque callers or cycles lack that proof and retain Root preflight. Split surface reuse includes zero inline opacity in its concealment check. Nonzero opacity remains mutable.

The same 99 tests reproduced four failures at the preceding exact head and passed after the corrections. The related selection passed 295 tests across ten files. Workspace types and both package builds passed. The actual compiled fixture combines a function-valued setup, an imported outer helper and an inner helper. Chrome measured 64px padding from the generated 10% decoration rule. Unchanged and translucent controls retained native caller input, focus and slot. Inline display none, visibility hidden and zero opacity each rejected reuse.
