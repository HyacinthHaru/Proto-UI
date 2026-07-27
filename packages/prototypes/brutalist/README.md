# @proto.ui/prototypes-brutalist

Contributor-authored Neo-Brutalist Proto UI style library.

## Purpose

Provides a design-language foundation on top of Proto UI Base: square geometry, strong structural borders, hard offset shadows, flat colors, and explicit light/dark theme variables.

This package is not owned by or claimed to be compatible with a named third-party component system. It uses only general Neo-Brutalist visual references.

## Current shipped families

This package currently includes:

- shared Brutalist style tokens and theme grammar;
- package and CLI style-preset integration;
- Button as the reference family;
- Scroll Area visual projection over Base Scroll Area anatomy.

Additional prototype families continue to land through focused split PRs under incubation #323.

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
