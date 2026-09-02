import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanRuleStateReads } from '../src/services/lowered-hook-coverage';
import {
  collectProtoStyleTokens,
  collectSourceFiles,
  loweredHookStates,
} from '../src/services/prototype-style-tokens';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOTYPE_PACKAGES = path.join(REPO_ROOT, 'packages/prototypes');

/**
 * The same file set the extractor reads, taken from the extractor itself. A
 * private glob here would be free to be narrower than production, which is the
 * blind spot this gate exists to remove.
 */
async function prototypeSourceFiles(): Promise<string[]> {
  const packages = await readdir(PROTOTYPE_PACKAGES, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of packages) {
    if (!entry.isDirectory()) continue;
    const src = path.join(PROTOTYPE_PACKAGES, entry.name, 'src');
    try {
      files.push(...((await collectSourceFiles(src)) as string[]));
    } catch {
      // A prototype package without a src directory contributes nothing.
    }
  }
  return files;
}

/**
 * The scanner only reports a `rule(...)` call, so a file whose text has no such
 * call cannot produce a usage or an unresolved read. Skipping the parse for
 * those keeps the set identical to production while not building a TypeScript
 * AST for every type and index module under `src`.
 */
const RULE_CALL = /\brule\s*\(/;

const rule = (condition: string) => `def.rule({ when: (w) => ${condition}, intent: () => {} });`;

describe('lowered hook coverage', () => {
  it('follows every binding shape a prototype uses to reach a state handle', () => {
    const shapes = {
      destructured: `const { checked } = asCheckboxRoot().stateHandles;\n${rule('w.state(checked).eq(true)')}`,
      viaBag: `const s = asSelectTrigger().stateHandles;\nconst { placeholder } = s;\n${rule('w.state(placeholder).eq(true)')}`,
      viaHookResult: `const h = asTextareaRoot();\nconst s = h.stateHandles;\n${rule('w.state(s.focusVisible).eq(true)')}`,
      chained: `const checked = asCheckboxRoot().stateHandles.checked;\n${rule('w.state(checked).eq(true)')}`,
    };

    expect(scanRuleStateReads(shapes.destructured).usages).toEqual([
      { hook: 'asCheckboxRoot', state: 'checked' },
    ]);
    expect(scanRuleStateReads(shapes.viaBag).usages).toEqual([
      { hook: 'asSelectTrigger', state: 'placeholder' },
    ]);
    expect(scanRuleStateReads(shapes.viaHookResult).usages).toEqual([
      { hook: 'asTextareaRoot', state: 'focusVisible' },
    ]);
    expect(scanRuleStateReads(shapes.chained).usages).toEqual([
      { hook: 'asCheckboxRoot', state: 'checked' },
    ]);
  });

  it('reports a lowerable read it cannot trace instead of dropping it', () => {
    // A shape the scanner does not model. Before this was first-class, the leaf
    // vanished from the results and the gate stayed green while both the
    // extractor and the scan were blind to the same rule.
    const source = `const handles = pickHandles();\n${rule('w.state(handles.checked).eq(true)')}`;
    const scan = scanRuleStateReads(source);

    expect(scan.usages).toEqual([]);
    expect(scan.unresolved).toEqual([{ expression: 'handles.checked', reason: 'subject' }]);
  });

  it('reports a comparison the extractor does not lower', () => {
    // `resolveStateEqVariant` lowers the two boolean keywords and a string
    // literal. A number or a bound identifier produces no variant, so counting
    // these as covered would hide exactly the rules that emit nothing.
    const numeric = `const { step } = asSelectItem().stateHandles;\n${rule('w.state(step).eq(1)')}`;
    const identifier = `const { checked } = asCheckboxRoot().stateHandles;\n${rule('w.state(checked).eq(ENABLED)')}`;
    const enumString = `const { orientation } = asSeparatorRoot().stateHandles;\n${rule("w.state(orientation).eq('vertical')")}`;

    expect(scanRuleStateReads(numeric).usages).toEqual([]);
    expect(scanRuleStateReads(numeric).unresolved).toEqual([
      { expression: 'w.state(step).eq(1)', reason: 'comparison' },
    ]);
    expect(scanRuleStateReads(identifier).usages).toEqual([]);
    expect(scanRuleStateReads(identifier).unresolved).toEqual([
      { expression: 'w.state(checked).eq(ENABLED)', reason: 'comparison' },
    ]);
    // The string form the extractor does lower stays covered.
    expect(scanRuleStateReads(enumString).usages).toEqual([
      { hook: 'asSeparatorRoot', state: 'orientation' },
    ]);
    expect(scanRuleStateReads(enumString).unresolved).toEqual([]);
  });

  it('keeps each scope its own hook identity when a name is shadowed', () => {
    // The outer rule must stay asCheckboxRoot even though an inner block binds
    // the same identifier to a different hook.
    const nested = [
      'const state = asCheckboxRoot().stateHandles;',
      '{',
      '  const state = asSelectTrigger().stateHandles;',
      `  ${rule('w.state(state.placeholder).eq(true)')}`,
      '}',
      rule('w.state(state.checked).eq(true)'),
    ].join('\n');

    expect(scanRuleStateReads(nested).usages).toEqual([
      { hook: 'asSelectTrigger', state: 'placeholder' },
      { hook: 'asCheckboxRoot', state: 'checked' },
    ]);

    // Sibling scopes must not leak into one another either.
    const siblings = [
      'function a() {',
      '  const state = asCheckboxRoot().stateHandles;',
      `  ${rule('w.state(state.checked).eq(true)')}`,
      '}',
      'function b() {',
      '  const state = asToggle().stateHandles;',
      `  ${rule('w.state(state.active).eq(true)')}`,
      '}',
    ].join('\n');

    expect(scanRuleStateReads(siblings).usages).toEqual([
      { hook: 'asCheckboxRoot', state: 'checked' },
      { hook: 'asToggle', state: 'active' },
    ]);
  });

  it('treats a prototype-owned state as neither a hook pair nor a blind spot', () => {
    // Base prototypes declare their own states and key rules on them. Those need
    // no resolver entry, so they must not be reported as a hook pair, and they
    // must not trip the fail-closed check either.
    const source = `const hidden = def.state.bool('hidden', true);\n${rule('w.state(hidden).eq(true)')}`;
    const scan = scanRuleStateReads(source);

    expect(scan.usages).toEqual([]);
    expect(scan.unresolved).toEqual([]);
  });

  it('skips rules the runtime keeps on the runtime plan', () => {
    const withProp = `const s = asSelectContent().stateHandles;\n${rule("w.all(w.state(s.open).eq(true), w.prop('side').eq('top'))")}`;
    const allNegative = `const s = asSelectContent().stateHandles;\n${rule('w.state(s.open).eq(false)')}`;
    const anyCondition = `const s = asSelectItem().stateHandles;\n${rule('w.any(w.state(s.active).eq(true), w.state(s.hovered).eq(true))')}`;

    for (const source of [withProp, allNegative, anyCondition]) {
      const scan = scanRuleStateReads(source);
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved).toEqual([]);
    }
  });

  it('scans every source extension the extractor accepts', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'lowered-hook-coverage-'));
    try {
      // Not `.proto.ts`, and not `.ts` at all. The old glob saw neither.
      await writeFile(
        path.join(dir, 'widget.proto.mts'),
        'const { checked } = asCheckboxRoot().stateHandles;\ndef.rule({ when: (w) => w.state(checked).eq(true), intent: () => {} });\n'
      );
      await writeFile(path.join(dir, 'notes.md'), 'not a source file');

      const files = await collectSourceFiles(dir);
      expect(files.map((file: string) => path.basename(file))).toEqual(['widget.proto.mts']);
      expect(scanRuleStateReads(await readFile(files[0], 'utf8'), files[0]).usages).toEqual([
        { hook: 'asCheckboxRoot', state: 'checked' },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('lowers a state bound as a terminal handle leaf end to end', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'lowered-hook-coverage-'));
    try {
      await writeFile(
        path.join(dir, 'widget.proto.ts'),
        [
          "import { definePrototype, tw } from '@proto.ui/core';",
          "import { asCheckboxRoot } from '@proto.ui/prototypes-base/checkbox';",
          '',
          'const widget = definePrototype({',
          "  name: 'widget',",
          '  setup(def) {',
          '    const checked = asCheckboxRoot().stateHandles.checked;',
          '    def.rule({',
          '      when: (w) => w.state(checked).eq(true),',
          "      intent: (i) => i.feedback.style.use(tw('bg-primary')),",
          '    });',
          '  },',
          '});',
          '',
          'export default widget;',
        ].join('\n')
      );

      // The gate calls this shape covered; the extractor has to agree.
      expect(await collectProtoStyleTokens(dir)).toContain('data-[checked]:bg-primary');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('resolves every hook state a shipped rule condition reads', async () => {
    const found: Array<{ file: string; hook: string; state: string }> = [];
    const blind: string[] = [];

    let scanned = 0;
    for (const absolute of await prototypeSourceFiles()) {
      const file = path.relative(REPO_ROOT, absolute);
      const text = await readFile(absolute, 'utf8');
      if (!RULE_CALL.test(text)) continue;
      scanned += 1;
      const scan = scanRuleStateReads(text, file);
      for (const usage of scan.usages) found.push({ file, ...usage });
      for (const miss of scan.unresolved) blind.push(`${file}: ${miss.reason} ${miss.expression}`);
    }

    expect(scanned, 'files carrying a rule call').toBeGreaterThan(40);

    expect(found.length).toBeGreaterThan(30);
    // The two-step shape must be reached in the shipped tree, not just fixtures.
    expect(found).toContainEqual({
      file: 'packages/prototypes/brutalist/src/textarea/root.proto.ts',
      hook: 'asTextareaRoot',
      state: 'focusVisible',
    });

    // Fail closed: a shape the scanner cannot trace is a gate failure.
    expect(blind, 'lowerable rule states the scanner could not trace').toEqual([]);

    const missing = found.filter(({ hook, state }) => {
      const states = loweredHookStates(hook);
      return !states || !states.has(state);
    });

    expect(
      missing.map(({ file, hook, state }) => `${file}: ${hook}().${state}`),
      'rule conditions whose hook state the extractor cannot lower'
    ).toEqual([]);

    // A string comparison only lowers against a `data-[x]` variant. Every table
    // entry is one today; if that stops being true, the scanner's string form
    // would start counting rules the extractor drops.
    const unshaped = found.filter(({ hook, state }) => {
      const variant = loweredHookStates(hook)?.get(state) as string | undefined;
      return !variant || !/^data-\[[a-zA-Z0-9-]+\]$/.test(variant);
    });

    expect(
      unshaped.map(({ hook, state }) => `${hook}().${state}`),
      'hook states whose variant a string comparison could not lower'
    ).toEqual([]);
  }, 60_000);
});
