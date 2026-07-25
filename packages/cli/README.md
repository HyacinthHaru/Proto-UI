# @proto.ui/cli

Proto UI command line tooling for initializing a local `proto-ui/` workspace, generating adapter-specific component facades, and writing Proto UI style preset files.

## Usage

Initialize the local workspace:

```bash
npx @proto.ui/cli@0.2.0-rc.5 init
```

Add a component for a host adapter:

```bash
npx @proto.ui/cli@0.2.0-rc.5 add react shadcn-button
```

The generated component facade is written under:

```txt
proto-ui/components/<host>/index.ts
```

For example, React users can import from the generated host entry:

```tsx
import { ShadcnButton } from '../proto-ui/components/react';
```

## Commands

```bash
proto-ui init [--root-dir <dir>] [--styles-dir <dir>] [--no-styles] [--no-interactive]
proto-ui add <host> <component> [--root-dir <dir>] [--no-install] [--no-interactive]
```

Supported hosts:

- `react`
- `vue`
- `wc`

The CLI also writes concrete Proto UI CSS for prototype style tokens:

```bash
proto-ui shadcn --styles-dir ./src/styles
proto-ui tokens --input ./packages/prototypes --out ./src/styles/proto-ui-tokens.generated.css
proto-ui style --out ./src/styles/proto-ui-style.css
proto-ui theme shadcn --out ./src/styles/shadcn-theme.css
```

The generated Shadcn theme follows `prefers-color-scheme` when the application does not declare a theme. Applications can override the system preference on the root element with `data-theme="light"` / `data-theme="dark"` or the compatible `.light` / `.dark` classes.

The generated token CSS also gives elements carrying `data-pui-style` (and their pseudo-elements) a scoped `box-sizing: border-box` baseline. It does not install a document-wide CSS reset or change unrelated application elements.

## Current Scope

The v0 CLI installs Proto UI adapter/prototype packages through the project package manager and generates local component facade files. This prerelease README pins `0.2.0-rc.5` for reproducible trials; the CLI saves required official packages at its own exact version so a consumer cannot accidentally mix release trains.

Prototype packages remain the installation and versioning unit. Generated facades import the selected anatomy family through a package subpath such as `@proto.ui/prototypes-shadcn/button`, so unrelated prototype families do not enter the consumer module graph.

It does not yet vendor styled prototype source into the user project. That remains a planned follow-up path for editable styled libraries such as shadcn.
