# Follow the current Anatomy order observation root

An Anatomy subscriber moved from host root A to B and emitted the new domain order. Its next DOM reorder in B produced no notification because the subscriber still shared A's observer. The repair moves the observation lease to the resolved current root and keeps A's observer available to the other subscribers.

The exact standalone commit `8e49e640ea4ad2fe78fe942134d4af2ffb24c64f` on main `b5e41dd601d67ba48cb5d030811f93394893116d` passes 99 Module, Runtime, and four-Adapter checks. The regression on the parent reaches the first move and fails on the later reorder. All 47 public packages build. Workspace types and manifests pass.

Chrome for Testing 156.0.8078.79 compared the parent, candidate, candidate and parent with identical source inputs except for the Anatomy implementation. Each arm physically reorders B. Both parent arms miss the B delivery. Both candidate arms receive it and publish the new order. Returning to A reuses its existing observer and disconnects B.

The integration `c24218a584df7711b3dca15024d5b2c329396040` includes the same observer handoff alongside the existing family enumeration work. The packed site retains all 1,268 Matrix previews for each language and the selected Contents, Dialog, Header, CodeExample, Shadow and Liquid optics regressions pass. Both original language runs failed the 60-second readiness check before Dialog.

[Exact validation](verification.json) · [Chrome records](native-browser.json)
