# Search selected target stays outside the viewport after End

The local combined tree `bef68094fc537aabe36302c8d9f7417d41959799` ran all 83 Search cases. Two Shadcn 200% Docs layout cases recovered with the separately scoped list bound in #1443. Eight nested-scroll cases still failed.

Two old failures stopped before selecting the target runtime. Playwright identified the Astro development toolbar intercepting the Vue and Vue 2 option clicks on the Docs Header's WC Select. A control on the same clean combination disabled the toolbar using the repository CI preference. The original clicks, assertions, Pagefind transport fixture and deadlines stayed in place. All eight cases reached Search, filled the query, pressed End and passed the existing assertion that the last option was selected. Each then failed the original viewport check. The Shadcn last-option bottom was 5626.5px against 220px. The Brutalist range was approximately 3826–3862px against approximately 213px.

The two images are original failure captures from the toolbar-disabled control. The receipt lists the scope and exact source. Close, Home and touch scrolling were unreached in this run. The separate #1443 wheel observation validates the physical list scrollport on its own source.

The result matches the existing Command and Scroll target-reveal work. The maintainer design assigns the request to Command Content, containment to Command Root and the bounded nearest-distance operation to the Scroll host. The original #848 condition remains open.

[Maintainer design](https://github.com/Proto-UI/Proto-UI/issues/907#issuecomment-6548061149) · [Command follow-up](https://github.com/Proto-UI/Proto-UI/issues/1095#issuecomment-6639076878) · [Open #848](https://github.com/Proto-UI/Proto-UI/issues/848)
