# @proto.ui/adapter-vue2

Draft package boundary for a Vue 2.6-first Proto UI adapter.

## Status

This package is intentionally private while the Vue 2.6 feasibility path is being validated. It must not replace `@proto.ui/adapter-vue`, which remains the Vue 3 adapter.

## Scope

- Target Vue 2.6 first.
- Keep Vue runtime injection through an adapter factory.
- Do not rely on Vue 2.7 Composition API in the first implementation pass.
- Validate the minimum path with Base Button before expanding to more complex prototypes.

## References

- `internal/records/2026-08-05-vue2-adapter-feasibility.zh-CN.md`
- `internal/contracts/adapter-vue/adapter-vue.v0.md`
- `packages/adapters/vue`
