import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OFFICIAL_EXPOSED_STATE_NAMES } from '../../modules/expose-state-web/src/utils';
import { collectProtoStyleTokens } from '../src/services/prototype-style-tokens';

describe('collectProtoStyleTokens', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'proto-style-tokens-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('resolves template literal interpolation and cross-file constant imports', async () => {
    await writeFile(
      path.join(dir, 'style.ts'),
      [
        "export const HOVER_TOKENS = '-translate-x-0.5 -translate-y-0.5 shadow-[8px_8px_0_0_var(--pui-foreground)]';",
        "export const PANEL_TOKENS = 'z-50 w-64 p-4';",
      ].join('\n')
    );
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asButton } from '@proto.ui/prototypes-base/button';",
        "import { HOVER_TOKENS, PANEL_TOKENS } from './style';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        '    def.feedback.style.use(tw(`fixed ${PANEL_TOKENS} border-2`));',
        '    const { hovered } = asButton().stateHandles;',
        '    def.rule({',
        '      when: (w) => w.state(hovered).eq(true),',
        '      intent: (i) => i.feedback.style.use(tw(HOVER_TOKENS)),',
        '    });',
        '  },',
        '});',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    // Template literal interpolation must contribute both literal and imported tokens.
    expect(tokens).toContain('fixed');
    expect(tokens).toContain('border-2');
    expect(tokens).toContain('z-50');
    expect(tokens).toContain('w-64');
    expect(tokens).toContain('p-4');
    // Imported constants referenced by identifier must contribute their tokens.
    expect(tokens).toContain('-translate-x-0.5');
    expect(tokens).toContain('-translate-y-0.5');
    expect(tokens).toContain('shadow-[8px_8px_0_0_var(--pui-foreground)]');
    // Single-state rules serialize on the web adapter as data-state variants,
    // so the static CSS must contain matching data-variant tokens.
    expect(tokens).toContain('data-[hovered]:-translate-x-0.5');
    expect(tokens).toContain('data-[hovered]:shadow-[8px_8px_0_0_var(--pui-foreground)]');
  });

  it('maps asButton pressed rules to the data-[pressed] web serialization', async () => {
    await writeFile(
      path.join(dir, 'press.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asButton } from '@proto.ui/prototypes-base/button';",
        '',
        'const pressable = definePrototype({',
        "  name: 'pressable',",
        '  setup(def) {',
        '    const { pressed } = asButton().stateHandles;',
        '    def.rule({',
        '      when: (w) => w.state(pressed).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('translate-x-[5px] translate-y-[5px] shadow-none')),",
        '    });',
        '  },',
        '});',
        'export default pressable;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    expect(tokens).toContain('data-[pressed]:translate-x-[5px]');
    expect(tokens).toContain('data-[pressed]:translate-y-[5px]');
    expect(tokens).toContain('data-[pressed]:shadow-none');
    expect(tokens).not.toContain('active:translate-x-[5px]');
  });

  it('maps asTextareaRoot state rules to their web data attributes', async () => {
    await writeFile(
      path.join(dir, 'textarea.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asTextareaRoot } from '@proto.ui/prototypes-base/textarea';",
        '',
        'const textarea = definePrototype({',
        "  name: 'styled-textarea',",
        '  setup(def) {',
        '    const hook = asTextareaRoot();',
        '    const state = hook.stateHandles;',
        '    if (!state) throw new Error("missing state handles");',
        '    def.rule({',
        '      when: (w) => w.state(state.disabled).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('cursor-not-allowed opacity-50')),",
        '    });',
        '    def.rule({',
        '      when: (w) => w.state(state.focusVisible).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('ring-[7px]')),",
        '    });',
        '  },',
        '});',
        'export default textarea;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    expect(tokens).toContain('data-[disabled]:cursor-not-allowed');
    expect(tokens).toContain('data-[disabled]:opacity-50');
    expect(tokens).toContain('data-[focus-visible]:ring-[7px]');
  });

  it('maps asSeparatorRoot enum rules to data-orientation value selectors', async () => {
    await writeFile(
      path.join(dir, 'separator.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asSeparatorRoot } from '@proto.ui/prototypes-base/separator';",
        '',
        'const separator = definePrototype({',
        "  name: 'styled-separator',",
        '  setup(def) {',
        '    const { orientation } = asSeparatorRoot().stateHandles;',
        '    def.rule({',
        "      when: (w) => w.state(orientation).eq('horizontal'),",
        "      intent: (i) => i.feedback.style.use(tw('h-0.5 w-full')),",
        '    });',
        '    def.rule({',
        "      when: (w) => w.state(orientation).eq('vertical'),",
        "      intent: (i) => i.feedback.style.use(tw('h-12 w-0.5')),",
        '    });',
        '  },',
        '});',
        'export default separator;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    expect(tokens).toContain('data-[orientation=horizontal]:h-0.5');
    expect(tokens).toContain('data-[orientation=horizontal]:w-full');
    expect(tokens).toContain('data-[orientation=vertical]:h-12');
    expect(tokens).toContain('data-[orientation=vertical]:w-0.5');
  });

  it('maps asAsyncRegionRoot busy rules to the data-busy web serialization', async () => {
    await writeFile(
      path.join(dir, 'async-region.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asAsyncRegionRoot } from '@proto.ui/prototypes-base/async-region';",
        '',
        'const asyncRegion = definePrototype({',
        "  name: 'styled-async-region',",
        '  setup(def) {',
        '    const { busy } = asAsyncRegionRoot().stateHandles;',
        '    def.rule({',
        '      when: (w) => w.state(busy).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('opacity-50 cursor-wait')),",
        '    });',
        '  },',
        '});',
        'export default asyncRegion;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    expect(tokens).toContain('data-[busy]:opacity-50');
    expect(tokens).toContain('data-[busy]:cursor-wait');
  });
  it('keeps commas inside arbitrary tokens when an array literal is joined', async () => {
    await writeFile(
      path.join(dir, 'field.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const BASE_TOKENS = [',
        "  'flex',",
        "  'transition-[color,box-shadow]',",
        "  'duration-150',",
        "].join(' ');",
        '',
        'const field = definePrototype({',
        "  name: 'styled-field',",
        '  setup(def) {',
        '    def.feedback.style.use(tw(BASE_TOKENS));',
        '  },',
        '});',
        'export default field;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    // The comma belongs to the token, not to the element list, so joining must
    // not hand the splitter an element boundary it never had.
    expect(tokens).toContain('transition-[color,box-shadow]');
    expect(tokens).not.toContain('transition-[color');
    expect(tokens).not.toContain('box-shadow]');
    expect(tokens).toContain('flex');
    expect(tokens).toContain('duration-150');
  });
  it('lowers checkbox mixed and guarded dark conditions into the closure', async () => {
    await writeFile(
      path.join(dir, 'box.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asCheckboxRoot } from '@proto.ui/prototypes-base/checkbox';",
        '',
        'const box = definePrototype({',
        "  name: 'styled-checkbox',",
        '  setup(def) {',
        '    const { checked, indeterminate } = asCheckboxRoot().stateHandles;',
        '    def.rule({',
        '      when: (w) => w.state(indeterminate).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-primary')),",
        '    });',
        '    def.rule({',
        '      when: (w) =>',
        '        w.all(',
        "          w.meta('colorScheme').eq('dark'),",
        '          w.state(checked).eq(false),',
        '          w.state(indeterminate).eq(false)',
        '        ),',
        "      intent: (i) => i.feedback.style.use(tw('bg-input/30')),",
        '    });',
        '  },',
        '});',
        'export default box;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    // Without the checkbox entries in the hook table neither rule contributes a
    // variant, and the tint reaches the closure as a plain `dark:` token that
    // also covers the filled box.
    expect(tokens).toContain('data-[indeterminate]:bg-primary');
    expect(tokens).toContain('dark:not-[data-checked]:not-[data-indeterminate]:bg-input/30');
    expect(tokens).not.toContain('dark:bg-input/30');
  });

  it('lowers a rule on an exposed prototype-owned state', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const hidden = def.state.bool('hidden', true);",
        // The expose call is what gives the state a host attribute, so it is
        // also what tells the extractor the selector.
        "    def.expose.state('hidden', hidden);",
        '    def.rule({',
        '      when: (w) => w.state(hidden).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('hidden')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[hidden]:hidden');
  });

  it('normalizes an exposed key the way the Web runtime does', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const dragOver = def.state.bool('dragOver', false);",
        "    def.expose.state('dragOver', dragOver);",
        '    def.rule({',
        '      when: (w) => w.state(dragOver).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    // `createExposeStateWebNameMap` kebab-cases an unannotated key.
    expect(await collectProtoStyleTokens(dir)).toContain('data-[drag-over]:bg-accent');
  });

  it('uses the declared state name rather than the expose key', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const flag = def.state.bool('internalFlag', false);",
        // `StateKernel` stores the declared name as `__stateSemantic`, and
        // `ExposeStateWebModuleImpl` maps that before the expose key.
        "    def.expose.state('visible', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[internal-flag]:bg-accent');
    expect(tokens).not.toContain('data-[visible]:bg-accent');
  });

  it('registers an exposure declared after the rule that reads it', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const hidden = def.state.bool('hidden', true);",
        '    def.rule({',
        '      when: (w) => w.state(hidden).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('hidden')),",
        '    });',
        // The runtime builds its exposed-state map after setup returns, so
        // source order does not decide whether the rule lowers.
        "    def.expose.state('hidden', hidden);",
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[hidden]:hidden');
  });

  it('resolves a constant expose key', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const key = 'hidden';",
        "    const hidden = def.state.bool('hidden', true);",
        '    def.expose.state(key, hidden);',
        '    def.rule({',
        '      when: (w) => w.state(hidden).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('hidden')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[hidden]:hidden');
  });

  it('keeps an official semantic when the state is exposed under another key', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const hovered = def.state.fromInteraction('hovered');",
        // The runtime maps the official semantic before it would fall back to
        // the exposed key, so the key must not win here either.
        "    def.expose.state('isHot', hovered);",
        '    def.rule({',
        '      when: (w) => w.state(hovered).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('hover:bg-accent');
    expect(tokens).not.toContain('data-[is-hot]:bg-accent');
  });

  it('registers an exposure however it is written', async () => {
    // Each of these reaches the same runtime exposure, so each must lower.
    const shapes: Record<string, string[]> = {
      wrapped: ["    def.expose.state('visible', flag as never);"],
      elementAccess: ["    def.expose['state']('visible', flag);"],
      aliased: ['    const publicFlag = flag;', "    def.expose.state('visible', publicFlag);"],
      nested: ['    if (enabled) {', "      def.expose.state('visible', flag);", '    }'],
      constantName: [],
    };

    for (const [label, exposeLines] of Object.entries(shapes)) {
      const declaration =
        label === 'constantName'
          ? [
              "    const name = 'internalFlag';",
              '    const flag = def.state.bool(name, false);',
              "    def.expose.state('visible', flag);",
            ]
          : ["    const flag = def.state.bool('internalFlag', false);", ...exposeLines];
      await writeFile(
        path.join(dir, 'widget.proto.ts'),
        [
          "import { definePrototype, tw } from '@proto.ui/core';",
          '',
          'const widget = definePrototype({',
          "  name: 'widget',",
          '  setup(def) {',
          ...declaration,
          '    def.rule({',
          '      when: (w) => w.state(flag).eq(true),',
          "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
          '    });',
          '  },',
          '});',
          '',
          'export default widget;',
        ].join('\n')
      );

      expect(await collectProtoStyleTokens(dir), label).toContain('data-[internal-flag]:bg-accent');
    }
  });

  it('keeps sibling alias names apart', async () => {
    // Two setups in one file may each bind `publicFlag`; a file-wide alias map
    // would attribute the first exposure to the second handle.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'export const first = definePrototype({',
        "  name: 'first',",
        '  setup(def) {',
        "    const flag = def.state.bool('firstFlag', false);",
        '    const publicFlag = flag;',
        "    def.expose.state('visible', publicFlag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export const second = definePrototype({',
        "  name: 'second',",
        '  setup(def) {',
        "    const other = def.state.bool('secondFlag', false);",
        '    const publicFlag = other;',
        "    def.expose.state('shown', publicFlag);",
        '  },',
        '});',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[first-flag]:bg-accent');
  });

  it('emits nothing for a declared name it cannot evaluate', async () => {
    // `__stateSemantic` is the call's result at runtime and takes precedence,
    // so the expose key would be the wrong selector rather than a safe default.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { makeStateName } from './names';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        '    const flag = def.state.bool(makeStateName(), false);',
        "    def.expose.state('visible', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).not.toContain('data-[visible]:bg-accent');
  });

  it('lowers a discrete-number comparison on an exposed state', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const step = def.state.numberDiscrete('step', 0);",
        "    def.expose.state('step', step);",
        '    def.rule({',
        '      when: (w) => w.state(step).eq(1),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    // The Web runtime stringifies the literal the way it does for enums.
    expect(await collectProtoStyleTokens(dir)).toContain('data-[step=1]:bg-accent');
  });

  it('keeps sibling blocks from sharing an alias', async () => {
    // Two blocks in one setup may legally reuse `publicFlag` for different
    // handles; a function-scoped map would let the later one overwrite.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    {',
        '      const publicFlag = first;',
        "      def.expose.state('a', publicFlag);",
        '    }',
        '    {',
        '      const publicFlag = second;',
        "      def.expose.state('b', publicFlag);",
        '    }',
        '    def.rule({',
        '      when: (w) => w.state(first).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[first-flag]:bg-accent');
  });

  it('keeps an exposure bound to the alias in effect where it was written', async () => {
    // The runtime captured `first` at the expose call; a later `var` rebinding
    // must not retarget it.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    var publicFlag = first;',
        "    def.expose.state('visible', publicFlag);",
        '    var publicFlag = second;',
        '    def.rule({',
        '      when: (w) => w.state(first).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[first-flag]:bg-accent');
  });

  it('lowers a state exposed through the generic entry', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const ready = def.state.bool('ready', false);",
        // `ExposeStateModuleImpl` recognizes a state handle here as well.
        "    def.expose('ready', ready);",
        '    def.rule({',
        '      when: (w) => w.state(ready).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[ready]:bg-accent');
  });

  it('lowers a signed discrete-number comparison', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const step = def.state.numberDiscrete('step', 0);",
        "    def.expose.state('step', step);",
        // `-1` parses as a prefix unary expression, not a numeric literal.
        '    def.rule({',
        '      when: (w) => w.state(step).eq(-1),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[step=-1]:bg-accent');
  });

  it('resolves each alias hop where that hop was created', async () => {
    // `publicFlag` captured `current` while `current` still meant `first`; a
    // later `var current = second` must not retarget the exposure.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    var current = first;',
        '    const publicFlag = current;',
        '    var current = second;',
        "    def.expose.state('visible', publicFlag);",
        '    def.rule({',
        '      when: (w) => w.state(first).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[first-flag]:bg-accent');
    expect(tokens).not.toContain('data-[second-flag]:bg-accent');
  });

  it('follows an alias reassigned before the exposure', async () => {
    // The runtime captured whatever `publicFlag` held at the expose call, and a
    // plain assignment moves the handle just as a declaration does.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    let publicFlag = first;',
        '    publicFlag = second;',
        "    def.expose.state('visible', publicFlag);",
        '    def.rule({',
        '      when: (w) => w.state(second).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[second-flag]:bg-accent');
  });

  it('reads the declared name through a wrapped initializer', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const flag = (def.state.bool('internalFlag', false)) as never;",
        "    def.expose.state('visible', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[internal-flag]:bg-accent');
    expect(tokens).not.toContain('data-[visible]:bg-accent');
  });

  it('sees an alias reassigned inside a nested block', async () => {
    // The assignment targets the outer binding, so an exposure written after
    // the block has to see it.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    let publicFlag = first;',
        '    {',
        '      publicFlag = second;',
        '    }',
        "    def.expose.state('visible', publicFlag);",
        '    def.rule({',
        '      when: (w) => w.state(second).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[second-flag]:bg-accent');
  });

  it('records every branch of a conditional alias', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    const publicFlag = enabled ? first : second;',
        "    def.expose.state('visible', publicFlag);",
        "    def.rule({ when: (w) => w.state(second).eq(true), intent: (i) => i.feedback.style.use(tw('bg-accent')) });",
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[second-flag]:bg-accent');
  });

  it('treats a var alias as function scoped', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    var publicFlag = first;',
        '    {',
        '      var publicFlag = second;',
        '    }',
        "    def.expose.state('visible', publicFlag);",
        "    def.rule({ when: (w) => w.state(second).eq(true), intent: (i) => i.feedback.style.use(tw('bg-accent')) });",
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[second-flag]:bg-accent');
  });

  it('reads a handle exposed through a property', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const ready = def.state.bool('ready', false);",
        '    const controls = { ready };',
        "    def.expose.state('ready', controls.ready);",
        "    def.rule({ when: (w) => w.state(ready).eq(true), intent: (i) => i.feedback.style.use(tw('bg-accent')) });",
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[ready]:bg-accent');
  });

  it('reads a state declared through element access', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const flag = def.state['bool']('internalFlag', false);",
        "    def.expose.state('visible', flag);",
        "    def.rule({ when: (w) => w.state(flag).eq(true), intent: (i) => i.feedback.style.use(tw('bg-accent')) });",
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[internal-flag]:bg-accent');
    expect(tokens).not.toContain('data-[visible]:bg-accent');
  });

  it("does not let one prototype's exposure reach a sibling's same-named state", async () => {
    // A sibling that independently declares `flag` and never exposes it must
    // keep its rule on the runtime plan.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'export const exposed = definePrototype({',
        "  name: 'exposed',",
        '  setup(def) {',
        "    const flag = def.state.bool('firstFlag', false);",
        "    def.expose.state('visible', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export const internal = definePrototype({',
        "  name: 'internal',",
        '  setup(def) {',
        "    const flag = def.state.bool('secondFlag', false);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-muted')),",
        '    });',
        '  },',
        '});',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[first-flag]:bg-accent');
    expect(tokens).not.toContain('data-[second-flag]:bg-muted');
  });

  it('mirrors the official exposed-state names the Web projection uses', async () => {
    // The extractor duplicates this map to stay free of runtime dependencies,
    // so the copy has to be provably identical.
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(
      path.join(process.cwd(), 'packages/cli/src/services/prototype-style-tokens.ts'),
      'utf8'
    );
    const block = source.match(
      /const OFFICIAL_EXPOSED_STATE_NAMES = Object\.freeze\(\{([\s\S]*?)\}\);/
    );
    if (!block) throw new Error('the extractor must carry an official-name map');

    const mirrored: Record<string, string> = {};
    for (const [, key, value] of block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
      mirrored[key] = value;
    }
    expect(mirrored).toEqual({ ...OFFICIAL_EXPOSED_STATE_NAMES });
  });

  it('maps an official semantic before normalizing the name', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const flag = def.state.bool('@accessibility/checked', false);",
        "    def.expose.state('visible', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[checked]:bg-accent');
    expect(tokens).not.toContain('data-[accessibility-checked]:bg-accent');
  });

  it('keeps a shadowed object from answering for an outer one', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const first = def.state.bool('firstFlag', false);",
        "    const second = def.state.bool('secondFlag', false);",
        '    const controls = { ready: first };',
        '    {',
        '      const controls = { ready: second };',
        '      void controls;',
        '    }',
        "    def.expose.state('visible', controls.ready);",
        '    def.rule({',
        '      when: (w) => w.state(first).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[first-flag]:bg-accent');
  });

  it('registers a declaration under single-statement control flow', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    if (true) var flag = def.state.bool('gated', false);",
        "    def.expose.state('gated', flag);",
        '    def.rule({',
        '      when: (w) => w.state(flag).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    expect(await collectProtoStyleTokens(dir)).toContain('data-[gated]:bg-accent');
  });

  it('serializes a discrete number the way the runtime does', async () => {
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    const step = def.state.numberDiscrete('step', 0);",
        "    def.expose.state('step', step);",
        // The runtime lowers with `String(literal)`, and `String(-0)` is `0`.
        '    def.rule({',
        '      when: (w) => w.state(step).eq(-0),',
        "      intent: (i) => i.feedback.style.use(tw('bg-accent')),",
        '    });',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('data-[step=0]:bg-accent');
    expect(tokens).not.toContain('data-[step=-0]:bg-accent');
  });

  it('keeps every binding a legal redeclaration installs', async () => {
    // The exposure pre-pass must not flatten sequential declaration scope.
    await writeFile(
      path.join(dir, 'widget.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        '',
        'const widget = definePrototype({',
        "  name: 'widget',",
        '  setup(def) {',
        "    var T = 'bg-red';",
        '    def.feedback.style.use(tw(T));',
        "    var T = 'bg-blue';",
        '    def.feedback.style.use(tw(T));',
        '  },',
        '});',
        '',
        'export default widget;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);
    expect(tokens).toContain('bg-red');
    expect(tokens).toContain('bg-blue');
  });

  it('lowers the Scroll Area Viewport focus condition into the closure', async () => {
    await writeFile(
      path.join(dir, 'surface.proto.ts'),
      [
        "import { definePrototype, tw } from '@proto.ui/core';",
        "import { asScrollAreaViewport } from '@proto.ui/prototypes-base/scroll-area';",
        '',
        'const surface = definePrototype({',
        "  name: 'styled-scroll-area-viewport',",
        '  setup(def) {',
        '    const { focusVisible } = asScrollAreaViewport().stateHandles;',
        '    def.rule({',
        '      when: (w) => w.state(focusVisible).eq(true),',
        "      intent: (i) => i.feedback.style.use(tw('ring-2 ring-inset')),",
        '    });',
        '  },',
        '});',
        'export default surface;',
      ].join('\n')
    );

    const tokens = await collectProtoStyleTokens(dir);

    // Without the Viewport entry in the hook table the rule contributes no
    // variant, and the ring reaches the closure unconditional.
    expect(tokens).toContain('data-[focus-visible]:ring-2');
    expect(tokens).toContain('data-[focus-visible]:ring-inset');
  });
});
