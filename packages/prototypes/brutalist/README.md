# @proto.ui/prototypes-brutalist

Contributor-authored Neo-Brutalist Proto UI style library.

## Purpose

Provides a design-language foundation on top of Proto UI Base: square geometry, strong structural borders, hard offset shadows, flat colors, and explicit light/dark theme variables.

This package is not owned by or claimed to be compatible with a named third-party component system. It uses only general Neo-Brutalist visual references.

## Foundation scope

This slice intentionally includes only:

- shared Brutalist style tokens and theme grammar;
- the reference Brutalist Button projection over Base Button;
- package and CLI style-preset integration.

Additional prototype families are split into focused follow-up PRs.

## Family import

```ts
import { brutalistButton } from '@proto.ui/prototypes-brutalist/button';
```

## Maintenance

The contributor maintains the initial split sequence. Release inclusion and long-term ownership remain subject to Proto UI governance.

## Related packages

- `@proto.ui/core`
- `@proto.ui/prototypes-base`

## License

MIT
