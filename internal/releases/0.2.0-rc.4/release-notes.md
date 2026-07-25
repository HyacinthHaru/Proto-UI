# Proto UI 0.2.0-rc.4

> Published on July 24, 2026 under the npm `next` channel. All 37 public packages, the `v0.2.0-rc.4` tag, the GitHub prerelease, and the immutable spec snapshot share this exact release identity.

## Fixed

### Web Component Tabs Content rematerialization

- Web Component Tabs Content now becomes visible again after a previously visited panel follows the default `current -> inactive -> current` L1 lifecycle.
- The affected Proto instance and its `current` state were already preserved correctly. The disappearing panel was caused by a stale native `hidden` attribute left on the persistent custom-element owner when a fresh view epoch was revealed.
- Web Component accessibility projection may now apply the latest semantic snapshot while a rematerialized host is still protected by the reveal barrier. Focus projection remains gated until that host is ready for interaction.
- Generic L1 accessibility replay coverage and a Shadcn Tabs `A -> B -> A` Web Component integration test protect both the lifecycle boundary and the reported user path.

## Still under validation

- Additional installation, runtime, CSS, accessibility, bundle, composition, and API findings from post-publication `0.2.0-rc.4` trials will enter a later release train.
