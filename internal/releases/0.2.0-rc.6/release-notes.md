# Proto UI 0.2.0-rc.6

> Draft changelog for changes merged after the published `0.2.0-rc.5`. The rc.6 release train, package versions, npm publication, Git tag, GitHub prerelease, and immutable spec snapshot have not been prepared or published; current installation and trial instructions remain pinned to rc.5.

## Fixed

### Shadcn Switch geometry and focus visuals

- Switch Thumb checked-state travel now accounts for the track border and padding, leaving the same 2px internal gap at both ends instead of appearing shifted to the right.
- Switch Thumb now isolates its own shadow from inherited focus-ring offsets, so only the Root changes visually when the Switch receives `focus-visible`.
- Preset and explicit Root/Thumb compositions continue to share the same prototype-owned state styling.

### Shadcn Dialog composition and cross-adapter focus

- Dialog Trigger is now an unstyled semantic wrapper, matching the established Dialog Close composition model. Button visuals come from an explicitly nested `ShadcnButton` instead of hidden Trigger variants.
- Nested Trigger/Button and Close/Button compositions now project one host focus and accessibility surface, participate once in the Dialog focus scope, and display focus-visible feedback on the actual inner Button.
- Pointer and keyboard activation now reach the same Dialog behavior owner. This fixes Web Component pointer opening and keeps native focus/blur observations local to the nested interaction surface in Web Component, React, and Vue.
- Keyboard modality is established before synchronous focus movement, preserving visible focus while tabbing through the Dialog and after clearing pointer modality and entering again.
- Closing with the keyboard now reliably restores focus to the nested Trigger Button instead of losing focus to the page start.
- The default CloseIcon now uses the upstream-aligned `top-4 right-4` placement, a 16px X icon, and a generated visible focus ring.

## Changed

### Component preset authoring

- Shadcn Switch and Dialog preset recipes are now authored in independent `preset.ts` files beside each component's prototypes, aggregated by the Shadcn prototype library, and projected into the CLI through a checked generator.
- Preset recipes describe only Root/default-part identity, structural placement, replacement, and explicit omission. Visual tokens remain owned by the referenced prototypes, and raw facades continue to coexist with convenience presets.

## Validation

- Added a shared Web conformance journey that runs the website's Shadcn Dialog demo through the same pointer-open, keyboard focus-loop, close, focus-restore, and re-entry scenario for the official Web Component, React, and Vue adapters.
- All three adapters are mandatory parameters of this scenario. The shared DOM journey complements lower-level contract tests and real-browser acceptance rather than replacing them.

## Upgrade note

- Consumers that relied on `shadcn-dialog-trigger` for an implicit button appearance must now compose an explicit `shadcn-button` inside the Trigger. Dialog Close remains unstyled and follows the same explicit composition pattern.
