# ChatUI and SaaS component expansion design

**Date:** 2026-07-25 **Status:** approved direction from user request; implementation remains draft until catalog entities and tests are active

## Goal

Expand Proto UI toward a mature SaaS surface while preserving its prototype architecture:

1. Complete the Brutalist styled delta required to assemble a production ChatUI page.
2. Add reusable communication primitives to Base, Shadcn, and Brutalist.
3. Keep behavior in Base; Shadcn and Brutalist inherit through `asHook` and add style feedback only.
4. Keep specs, executable tests, package exports, generated style-token closure, presets, and public docs synchronized.

## Current inventory

The merged upstream Base and Shadcn libraries cover the official shadcn/ui catalog, including Avatar, Badge, Card, Input, Textarea, Scroll Area, Separator, Skeleton, Tooltip, Item, Input Group, Field, Button, Dialog, and the remaining official component families.

Brutalist currently covers Button, Toggle, Switch, Tabs, Hover Card, Dropdown Menu, Select, and Dialog. Re-implementing official Base/Shadcn families would duplicate the source of truth; the missing work is a Brutalist styled delta over those existing Base hooks.

## Delivery matrix

### Brutalist parity for ChatUI

| Family | ChatUI/SaaS role | Base authority | Brutalist delta |
| --- | --- | --- | --- |
| Avatar | participant identity | existing Base Avatar | square ink border, hard shadow, paper fallback |
| Badge | role/status/unread count | existing Base Badge | compact mono label, flat semantic palette |
| Card | conversation/sidebar panels | existing Base Card | square paper surface, 2px ink border, hard shadow |
| Input | search/title fields | existing Base Input | explicit label-compatible focus, hard inset/offset treatment |
| Textarea | message composer body | existing Base Textarea | non-rounded paper editor with visible focus and invalid state |
| Scroll Area | conversation and history panes | existing Base Scroll Area | square viewport and high-contrast scrollbar/thumb |
| Separator | message/date grouping | existing Base Separator | 2px ink rule, orientation preserved |
| Skeleton | message/loading placeholders | existing Base Skeleton | stepped flat blocks without soft glow |
| Tooltip | icon-action help | existing Base Tooltip | offset square bubble, ink border, no soft motion |

### New reusable families across all three libraries

#### Message

A semantic communication item usable for chat, comments, support tickets, activity feeds, and audit discussions.

Anatomy:

- `MessageRoot`: owns direction (`incoming | outgoing | system`), status (`sending | sent | failed`), and semantic article/listitem projection.
- `MessageAvatar`: optional participant identity slot.
- `MessageHeader`: author and timestamp grouping.
- `MessageContent`: message body slot.
- `MessageActions`: optional contextual actions.
- `MessageStatus`: delivery/error announcement.

Base owns states, data attributes, a11y semantics, context, and part relationships. Styled libraries only consume Base hooks.

#### Composer

A generic content-composition shell usable for chat, comments, notes, issue replies, and support responses.

Anatomy:

- `ComposerRoot`: owns disabled, busy, invalid, and submission lifecycle.
- `ComposerInput`: multiline input semantics and value state.
- `ComposerToolbar`: attachment/format controls.
- `ComposerActions`: action grouping.
- `ComposerSubmit`: official trigger for submission.
- `ComposerError`: announced validation/submission error.

Base must reuse existing Textarea/Button/Field contracts where composition is sufficient. It must not duplicate text-entry or button semantics.

#### CodeBlock

A semantic code display primitive for AI/chat answers, documentation, audit logs, and developer SaaS.

Anatomy:

- `CodeBlockRoot`: owns language label and code text.
- `CodeBlockHeader`: optional title/language/actions.
- `CodeBlockCode`: semantic `pre > code` projection.
- `CodeBlockActions`: copy/download/action slot.

Base owns code semantics and copy exposure; styled libraries own visual tokens. Syntax highlighting is host/application responsibility and not required by the prototype.

## Design language

Brutalist components use the existing Yandu-aligned palette and grammar:

- paper and ink as structural defaults;
- Canary for decisive active controls;
- Mint for success/ready state;
- Lavender for focus and annotation;
- Coral for error, warning, and active press feedback;
- Sky for discovery and selected surfaces;
- square geometry, 2px ink borders, hard offset shadows, no gradients, glass, blur glow, or spring-like soft motion.

Dark mode must preserve ink/paper contrast and semantic color roles rather than merely invert every color.

## Architecture and invariants

1. Every new styled prototype imports and calls the corresponding Base `asHook`.
2. Styled prototypes do not create replacement interaction state, event routing, portal ownership, or accessibility semantics.
3. Every new family receives catalog prototype and test entities before it is presented as stable.
4. Generated token and preset files are changed only through their generators.
5. Web, React, Vue, and Web Component semantics remain equivalent unless a spec explicitly permits a host difference.
6. Public docs show composition examples and both light/dark Brutalist projections.
7. A component phase is complete only after focused tests, catalog checks, type checks, generated artifact checks, commit, push, and PR comment.

## ChatUI assembly target

A reference page must be constructible from:

- Sidebar: Card + Input + ScrollArea + Item + Avatar + Badge + Separator.
- Conversation: Card + MessageList composition over ScrollArea + Message + Avatar + Tooltip.
- Composer: Composer + Textarea + Button + Tooltip.
- Loading/error: Skeleton + Alert/Badge + retry Button.
- AI/developer content: Message + CodeBlock.

The reference is a composition proof, not a second component framework.

## Non-goals

- No application-specific conversation store, transport, retry policy, streaming protocol, markdown renderer, syntax highlighter, or attachment uploader.
- No duplicated Base/Shadcn official component families.
- No Tailwind-only behavior that bypasses Proto UI feedback rules or adapter translation.
