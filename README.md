# Proto UI

**Proto UI is a framework-independent component interaction protocol and a toolchain for projecting the same prototype into different hosts.**

A Proto UI _prototype_ describes the identity and interaction semantics of a component. Adapters translate that protocol into React, Vue, Web Components, and, over time, other platforms. The goal is to make interaction logic explicit, testable, reusable, and portable across ecosystems.

English | [中文](README.zh-CN.md)

> **Status:** Proto UI is in its v0 prerelease stage. The exact `0.2.0-rc.7` ecosystem release is available on npm under the `next` channel for reproducible trials. It is not the stable `latest` onboarding path and is not recommended for critical production workloads.

## The core idea

Component implementations change across frameworks, but the interactive subject should remain recognizable. Proto UI separates those layers:

```text
Prototype protocol -> Adapter -> Host component instance
```

The prototype owns portable behavior and semantic identity. The Adapter owns translation into a host. Applications continue to compose and use the resulting components through their native framework.

This is deliberately different from inventing another application framework: Proto UI is intended to work with the stack you already have.

A compiler-based path remains a longer-term direction:

```text
Prototype protocol -> Compiler -> Host component code
```

The current release is Adapter-based. Compiler output and zero-runtime delivery are not current shipped guarantees.

## Try the current release candidate

Use the exact version so the CLI, Adapter, Prototype packages, and trial result all belong to the same release train:

```sh
npx @proto.ui/cli@0.2.0-rc.7 --help
npx @proto.ui/cli@0.2.0-rc.7 init
npx @proto.ui/cli@0.2.0-rc.7 add react shadcn-button
```

Run `init` and `add` from an existing application project. The CLI creates a local `proto-ui/` workspace, installs the matching official packages, writes style presets, and generates host-specific component facades.

Follow the complete [0.2 RC Trial](https://proto-ui.com/en/start-here/rc-trial/) for generated paths, style imports, typed component usage, multiple hosts, and the current limitations. See the [v0.2.0-rc.7 release](https://github.com/Proto-UI/Proto-UI/releases/tag/v0.2.0-rc.7) for immutable release evidence.

## What exists today

- Official Adapters for **React**, **Vue**, and **Web Components**.
- A Base prototype library for reusable interaction protocols.
- A Shadcn-derived prototype library that layers a design-language surface over Base protocols.
- A Lucide-derived icon prototype library with per-icon import paths.
- A CLI for initialization, exact-version package installation, style generation, and host component facades.
- A machine-validated spec catalog connecting knowledge, decisions, contracts, prototypes, modules, host capabilities, conformance cases, and executable test paths.

## Current boundaries

- APIs, generated structure, and some protocol details may still change before stable `0.2.0`.
- The current CLI installs official Prototype packages and generates local component facades; it does not yet vendor styled prototype source into the application for direct editing.
- Shadcn compatibility is intentional but incomplete. Proto UI deliberately does not expose Radix-style `asChild` in the current model.
- The Adapter architecture carries a runtime. Compiler output and zero-runtime delivery remain future work.
- Documentation, real-project trial evidence, SSR coverage, accessibility validation, and bundle analysis are still being expanded.
- Most catalog entities are still `draft`; catalog presence should not be confused with a stable public guarantee.

Proto UI is currently best suited to experiments, controlled projects, component-system research, and contributors who are comfortable evaluating prerelease behavior.

## Project truth and documentation

Proto UI uses versioned entities under [`spec/**`](spec/) as its machine-governed source of truth. Entity lifecycle matters: `active` records a current stable guarantee, while `draft` records cataloged work in progress.

The older [`internal/contracts/**`](internal/contracts/) documents are being progressively superseded. They remain useful for explanation and for subjects that are not fully cataloged, but they do not override an applicable spec entity. Short-term direction and daily engineering history live under [`internal/records/**`](internal/records/) and are intentionally non-normative.

For contributors and Agents:

- [Agent repository guide](AGENTS.md)
- [Spec catalog guide](spec/README.md)
- [Generated project understanding](internal/agent/PROJECT-UNDERSTANDING.zh-CN.md)
- [Contributing guide](CONTRIBUTING.md)

## Repository map

- [`spec/`](spec/): machine-governed project entities.
- [`packages/spec/`](packages/spec/): schema, validation, snapshots, and graph tooling.
- [`packages/core/`](packages/core/): core protocol syntax and primitives.
- [`packages/runtime/`](packages/runtime/): Adapter-era runtime and orchestration.
- [`packages/modules/`](packages/modules/): reusable semantic modules.
- [`packages/adapters/`](packages/adapters/): React, Vue, Web Component, and shared Adapter implementations.
- [`packages/prototypes/`](packages/prototypes/): Base, Shadcn, and Lucide prototype libraries.
- [`packages/cli/`](packages/cli/): project initialization, facade generation, and style tooling.
- [`apps/www/`](apps/www/): public documentation and demos.
- [`apps/workspace/`](apps/workspace/): internal spec workspace UI.
- [`internal/governance/`](internal/governance/): release and package governance.
- [`internal/releases/`](internal/releases/): release notes, BOMs, and evidence.

## Local development

Use the pnpm version declared in `package.json`; it is aligned with the lockfile and CI.

```sh
corepack pnpm@10.32.1 install --frozen-lockfile
corepack pnpm@10.32.1 docs:dev
```

Common repository checks:

```sh
corepack pnpm@10.32.1 check:types
corepack pnpm@10.32.1 test
```

## Near-term direction

The immediate focus is to exercise `0.2.0-rc.7` in real projects, fix onboarding or semantic blockers, improve the documentation paths exposed by those trials, and close the `0.2` release line without expanding the Prototype surface indiscriminately.

Module, Host Capability, and Adapter catalog work will continue through coherent vertical slices informed by real consumption evidence. Compiler-oriented and editable local styled-prototype workflows remain longer-term directions rather than current release promises.

Roadmap direction is recorded under [`internal/records/**`](internal/records/); release identity and stable semantics remain governed by spec and release evidence.

## Who may find it useful

- Component library and design system authors
- Frontend engineers focused on interaction quality
- HCI practitioners and researchers
- Adapter, compiler, and cross-platform tooling authors
- Contributors exploring foundational UI architecture

## Contributing and discussion

- **Website:** [proto-ui.com](https://proto-ui.com)
- **GitHub Issues:** [Proto-UI/Proto-UI](https://github.com/Proto-UI/Proto-UI/issues)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Discord:** [Join the community](https://discord.gg/MrWQd7h34R)
- **Email:** guangliang2018@foxmail.com

Contributions to protocols, tests, Adapters, Prototype libraries, documentation, and consumer evidence are welcome.

## License

MIT
