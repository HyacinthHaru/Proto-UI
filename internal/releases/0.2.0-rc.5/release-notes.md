# Proto UI 0.2.0-rc.5

> Published on July 25, 2026 under the npm `next` channel. All 37 public packages, the `v0.2.0-rc.5` tag, the GitHub prerelease, and the immutable spec snapshot share this exact release identity.

## Fixed

### Dialog and component-preset initialization

- Generated Web Component presets now establish the owning Root runtime and context before connecting an already-resolved default part.
- Adding `shadcn-dialog` no longer lets the default CloseIcon connect before its Dialog context exists and fail with `CONTEXT_PROVIDER_MISSING`.
- The default part still mounts exactly once; the fix does not recover by remounting after an initial failure.

### Switch checked-state movement

- Shadcn Switch Root now keeps symmetric track padding instead of expressing checked position through alternating Root padding.
- Switch Thumb now translates from `translate-x-0` to `translate-x-5` using its inherited checked state in preset and explicit Root/Thumb compositions.
- Generated style CSS now renders spacing-based translate utilities, and packed React, Vue, and Web Component consumer smoke tests cover Switch and Dialog preset paths.

## Still under validation

- Additional installation, runtime, CSS, accessibility, bundle, composition, and API findings from post-publication `0.2.0-rc.5` trials will enter a later release train.
