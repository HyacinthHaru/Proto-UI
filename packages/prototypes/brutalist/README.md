# @proto.ui/prototypes-brutalist

Neo-Brutalist Proto UI prototype library for adapter-driven components.

## Purpose

Provides a design-language prototype library that inherits Base interaction protocols and layers a Neo-Brutalist visual surface: square corners, black borders, hard offset shadows, flat colors, and light/dark theme variables.

## Visual Contract

- `border-radius: 0` everywhere.
- 2-3px black structural borders.
- Hard zero-blur offset shadows.
- Light paper `#f4f1ea`; dark warm paper `#1c1914`.
- Accent `#ffd23f` with black foreground.
- No gradients, blur, glass, rounded cards, or soft elevation.

## Family Imports

```ts
import { brutalistButton } from '@proto.ui/prototypes-brutalist/button';
```

## Related Internal Packages

- `@proto.ui/core`
- `@proto.ui/prototypes-base`

## License

MIT
