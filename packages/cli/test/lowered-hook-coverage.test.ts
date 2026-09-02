import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanRuleStateReads } from '../src/services/lowered-hook-coverage';
import { loweredHookStates } from '../src/services/prototype-style-tokens';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOTYPE_GLOB = 'packages/prototypes/*/src/**/*.proto.ts';

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
    expect(scan.unresolved).toEqual([{ expression: 'handles.checked' }]);
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

  it('resolves every hook state a shipped rule condition reads', async () => {
    const found: Array<{ file: string; hook: string; state: string }> = [];
    const blind: string[] = [];

    for await (const entry of glob(PROTOTYPE_GLOB, { cwd: REPO_ROOT })) {
      const file = String(entry);
      const scan = scanRuleStateReads(await readFile(path.join(REPO_ROOT, file), 'utf8'), file);
      for (const usage of scan.usages) found.push({ file, ...usage });
      for (const miss of scan.unresolved) blind.push(`${file}: ${miss.expression}`);
    }

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
  });
});
