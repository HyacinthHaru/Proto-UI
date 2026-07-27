# Brutalist Button foundation review response (2026-07-27)

Non-normative engineering record for #335 request-changes.

## Decisions taken in response

1. **Release identity**: keep `@proto.ui/prototypes-brutalist` private `0.0.0` with `protoUi.release.scan: false` until a later release train publishes it. Do not rewrite `internal/releases/0.2.0-rc.6/package-bom.json`.
2. **Button API**: drop Shadcn-shaped `outline`/`reverse`. Public surface is:
   - `variant`: `solid` | `surface` | `destructive` (default `solid`)
   - `color`: `main` | `mint` | `lavender` | `coral` | `sky` (default `main`; applies to `solid` only)
   - `size`: `default` | `sm` | `lg` | `icon` (default `default`)
3. **Paired fills**: every fill carries its own foreground. Accent fills always use black text tokens regardless of host theme. Remove the blanket dark `text-foreground` override.
4. **Live theme**: theme-dependent surfaces use CSS variables (`bg-secondary-background`/`text-foreground`); host theme changes update mounted controls without pointer refresh. Accent pairs are theme-invariant by design.
5. **Contract chain**: expand `P-BRUTALIST-BUTTON` criteria and `T-BRUTALIST-BUTTON-0001` cases 1:1 with criterion-ID comments in the prototype.

## Design source

Authoritative design write-up restored at `docs/superpowers/specs/2026-07-24-brutalist-design-system-design.md` (commit `f3448b04`).
