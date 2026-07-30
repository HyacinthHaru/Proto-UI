# Proto UI 0.2.0-rc.8 (Draft)

> These notes track candidate changes after `0.2.0-rc.7` that are intended for rc.8. `0.2.0-rc.8` has not been published. Exact package versions, the BOM, Git tag, GitHub prerelease, and immutable spec snapshot must be established and verified separately by the release-train preparation.

## Added

### Base Tooltip family

- `P-BASE-TOOLTIP` catalogs Root, Trigger, Content, and the adjacent Tooltip Group protocol. Root owns controlled or uncontrolled visibility, cancellable pointer delays (default 700ms open / 100ms close), immediate focus opening, disabled state, and a unified `openChange` request channel.
- Tooltip Group coordinates one active Tooltip across siblings: the first pointer Tooltip honors `openDelay`, a sibling opens immediately during the warm window, and the group restores cold delay after `skipDelay` (default 300ms) following the last active close.
- Sibling handoff is instant for uncontrolled Tooltips: the outgoing Content ends perceptual presence in the same view reconciliation. Controlled owners receive a close request and retain final open authority.
- Additive A11y relation projection (`C-A11Y-0001-K`): Tooltip Trigger appends its content ID to `aria-describedby` without overwriting host-authored IDREF tokens, and removes only its own token on close.

### Base Scroll Area family

- `P-BASE-SCROLL-AREA` catalogs Root, Viewport, Scrollbar, and Thumb. The Scroll domain (`C-SCROLL-0001`) owns logical surface identity, portable facts, requests, and projection negotiation; a bounded host session owns geometry, input physics, and concrete projection.
- Composed chrome (`C-SCROLL-COMPOSED-CHROME-0001`) binds Viewport, directional Scrollbar, and descendant Thumb within the same Context family scope and projects passive Thumb geometry from normalized host facts.
- Move Gesture host capability (`C-MOVE-GESTURE-0001`) provides one bounded continuous-movement session for Thumb drag, producing `control-drag` requests while retaining actual surface facts as position truth.
- Web Component, React, and Vue adapters each wire the Scroll Surface host capability with adapter-profile projection preference.

### Brutalist styled prototypes

- Base Separator retained as a real transferable protocol owning semantic/decorative accessibility projection and live orientation synchronization.
- Brutalist Skeleton, Badge, and Card rebuilt as direct styled-only prototypes with no Base import: Skeleton owns `aria-hidden` tree behavior and contentless rendering; Badge owns passive `accent | info | danger` tone; Card is reduced to Root/Header/Content/Footer with directional border separators.

## Build and release

- `@proto.ui/module-scroll` is a new public package (38 public packages total, up from 37 in rc.7).
- `@proto.ui/prototypes-brutalist` remains private `0.0.0` with `protoUi.release.scan: false` and is not part of the rc.8 BOM.

## Validation

- Full workspace test suite, prototype catalog, style preset, type checks, and generated Agent-document check must pass before publication review.
- Scroll Area and Tooltip families each carry dedicated contract and adapter tests covering delay boundaries, controlled ownership, group coordination, additive A11y projection, and composed Thumb geometry.

## Upgrade notes

- Consumers using public package exports do not need to change imports. The new `@proto.ui/module-scroll` package is additive.
- Tooltip and Scroll Area are draft-status prototypes; their APIs may refine in subsequent release candidates.

## Release preparation still required

- This draft does not mean rc.8 is an installable release. Prerequisite PRs (#337, #338, #351, #352) must merge into `main` before the release-train preparation PR can finalize the BOM and pass the complete release rehearsal.
