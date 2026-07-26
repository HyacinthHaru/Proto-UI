# Base Tooltip and Scroll Area behavior design

Status: approved for implementation  
Incubation parent: Proto-UI/Proto-UI#323  
Related shell PRs: #340 (Tooltip shell), #339 (Scroll Area shell)

## Goal

Upgrade the current anatomy/visual shells into demo-ready interactive Base protocols so later Proto UI application demos can rely on them as library foundations.

## Ownership

Both behavior PRs are split slices under incubation PR #323. They do not form an independent product track.

## PR split

1. `split/base-tooltip-behavior` — Base Tooltip interaction (+ Brutalist visual inheritance remains)
2. `split/base-scroll-area-behavior` — Base Scroll Area metrics/thumb behavior (+ Brutalist visual inheritance remains)

Shell PRs #339/#340 remain historical/visual shells and may be superseded or stacked under by these behavior PRs.

## Tooltip behavior

### Model

Mirror Base Hover Card:

- Root owns controlled/uncontrolled `open`, delays, disabled, and `openChange`
- Trigger reports pointer/focus intent into context
- Content consumes open state through `asOverlay` + optional presence
- Portal remains an anatomy part; Content may still portal via overlay config
- Arrow remains visual-only in v1

### API surface (v1)

Root props:

- `open?: boolean`
- `defaultOpen?: boolean`
- `disabled?: boolean`
- `delayDuration?: number` (open delay; close uses a short fixed or same delay first)

Root exposes:

- `open`
- methods: open/close/toggle equivalents via open-state helper
- event: `openChange`

Content props:

- `side?: 'top' | 'right' | 'bottom' | 'left'`
- `align?: 'start' | 'center' | 'end'`
- `sideOffset?: number`
- `alignOffset?: number`

### Behavior rules

1. pointer enter trigger schedules open after delay
2. pointer leave trigger schedules close unless content is hovered
3. focus trigger can open; blur closes if no pointer bridge remains
4. Escape closes when open
5. controlled mode emits `openChange` and does not local-set unless uncontrolled
6. Content open drives overlay open/close and presence

### Out of scope for v1

- shared tooltip provider / skip delay group
- forceMount
- rich collision boundary objects
- long-press mobile policy beyond basic pointer events

## Scroll Area behavior

### Model

- Viewport is the real scroll container (`overflow: auto`) and metrics owner
- Scrollbar/Thumb are projected controls bound to viewport metrics
- Thumb drag writes scroll position back to viewport
- Native wheel/touch scrolling is accepted through the viewport

### API surface (v1)

Viewport exposes metrics states:

- `scrollTop`, `scrollLeft`
- `scrollHeight`, `scrollWidth`
- `clientHeight`, `clientWidth`

Scrollbar:

- `orientation: 'vertical' | 'horizontal'`

Thumb:

- no value ownership; geometry derived from metrics

### Behavior rules

1. viewport listens to scroll/resize (or layout observation) and publishes metrics
2. thumb size ratio = client/scroll extent, clamped to a minimum
3. thumb offset ratio = scroll position / max scroll
4. pointer drag on thumb updates viewport scroll
5. vertical is first-class; horizontal uses the same model

### Out of scope for v1

- virtualization
- custom inertia
- auto-hide animation policy
- complete RTL edge matrix

## Evidence required per PR

- focused unit/module tests
- package build for base (+ brutalist if projection touched)
- browser verification on docs demo route
- CI green before ready-for-review

## Success criteria for demo foundation

- Tooltip can annotate icon-only actions in a ChatUI/SaaS demo
- Scroll Area can host conversation history / long panels with visible, draggable thumb
