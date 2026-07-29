# @proto.ui/prototypes-brutalist

Contributor-authored Neo-Brutalist Proto UI style library.

> **Release status:** private workspace package (`0.0.0`, `protoUi.release.scan: false`). Not part of the published `0.2.0-rc.6` package set. Publication is deferred to a later release train.

## Purpose

Provides a design-language foundation on top of Proto UI Base: square geometry, strong structural borders, hard offset shadows, flat paired colors, and explicit light/dark theme variables.

This package is not owned by or claimed to be compatible with a named third-party component system. It uses only general Neo-Brutalist visual references.

## Workspace scope

The private workspace currently includes:

- shared Brutalist style tokens and theme grammar;
- the reference Brutalist Button projection over Base Button;
- a static five-part Tooltip anatomy and visual shell;
- package and CLI style-preset integration.

The Tooltip subpath is non-launch and non-interactive. It exposes Root, Trigger, Portal, Content, and Arrow anatomy for review, while deferring open state, interaction routing, delay, accessibility semantics, presence, renderer portal ownership, and positioning to a separate Base behavior change.

Additional prototype families are split into focused follow-up PRs.

## Button public API

| Prop       | Values                                             | Default             |
| ---------- | -------------------------------------------------- | ------------------- |
| `variant`  | `solid` \| `surface` \| `destructive`              | `solid`             |
| `color`    | `main` \| `mint` \| `lavender` \| `coral` \| `sky` | `main` (solid only) |
| `size`     | `default` \| `sm` \| `lg` \| `icon`                | `default`           |
| `disabled` | `boolean`                                          | `false`             |

Every fill co-selects its foreground. Solid accents keep black text in both Light and Dark. There is no `outline` variant: structural 2px borders are part of the shared grammar.

## Family imports

```ts
import { brutalistButton } from '@proto.ui/prototypes-brutalist/button';
import { BrutalistTooltipContent } from '@proto.ui/prototypes-brutalist/tooltip';
```

## Maintenance

The contributor maintains the initial split sequence. Release inclusion and long-term ownership remain subject to Proto UI governance.

## Related packages

- `@proto.ui/core`
- `@proto.ui/prototypes-base`

## License

MIT
