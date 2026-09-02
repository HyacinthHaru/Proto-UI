import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { collectRuleStateUsages } from '../src/services/lowered-hook-coverage';
import { loweredHookStates } from '../src/services/prototype-style-tokens';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOTYPE_GLOB = 'packages/prototypes/*/src/**/*.proto.ts';

function unresolved(usages: Array<{ hook: string; state: string }>): string[] {
  return usages
    .filter(({ hook, state }) => {
      const states = loweredHookStates(hook);
      return !states || !states.has(state);
    })
    .map(({ hook, state }) => `${hook}().${state}`);
}

describe('lowered hook coverage', () => {
  it('follows all three shapes a prototype uses to bind state handles', () => {
    const direct = `
      const { checked } = asCheckboxRoot().stateHandles;
      def.rule({ when: (w) => w.state(checked).eq(true), intent: () => {} });
    `;
    const viaBag = `
      const state = asSelectTrigger().stateHandles;
      const { placeholder } = state;
      def.rule({ when: (w) => w.state(placeholder).eq(true), intent: () => {} });
    `;
    // The shape the first version of this gate missed entirely.
    const viaHookResult = `
      const textarea = asTextareaRoot();
      const state = textarea.stateHandles;
      def.rule({ when: (w) => w.state(state.focusVisible).eq(true), intent: () => {} });
    `;

    expect(collectRuleStateUsages(direct)).toEqual([{ hook: 'asCheckboxRoot', state: 'checked' }]);
    expect(collectRuleStateUsages(viaBag)).toEqual([
      { hook: 'asSelectTrigger', state: 'placeholder' },
    ]);
    expect(collectRuleStateUsages(viaHookResult)).toEqual([
      { hook: 'asTextareaRoot', state: 'focusVisible' },
    ]);
  });

  it('turns red when a resolver pair reached through the two-step shape is missing', () => {
    // `asTextareaRoot().focusVisible` resolves today, so the gate is quiet.
    const covered = `
      const textarea = asTextareaRoot();
      const state = textarea.stateHandles;
      def.rule({ when: (w) => w.state(state.focusVisible).eq(true), intent: () => {} });
    `;
    expect(unresolved(collectRuleStateUsages(covered))).toEqual([]);

    // Same shape, a state the resolver has no entry for. If the gate could not
    // see through `const h = asHook()`, this would come back empty and a real
    // drift would ship green.
    const drifted = `
      const textarea = asTextareaRoot();
      const state = textarea.stateHandles;
      def.rule({ when: (w) => w.state(state.notAMappedState).eq(true), intent: () => {} });
    `;
    expect(unresolved(collectRuleStateUsages(drifted))).toEqual([
      'asTextareaRoot().notAMappedState',
    ]);
  });

  it('resolves every hook state a shipped rule condition reads', async () => {
    const found: Array<{ file: string; hook: string; state: string }> = [];
    for await (const entry of glob(PROTOTYPE_GLOB, { cwd: REPO_ROOT })) {
      const file = String(entry);
      const text = await readFile(path.join(REPO_ROOT, file), 'utf8');
      for (const usage of collectRuleStateUsages(text, file)) found.push({ file, ...usage });
    }

    // The scan must actually find work, or a refactor could silently empty it.
    expect(found.length).toBeGreaterThan(30);
    // And it must reach the two-step shape in the shipped tree, not just the
    // synthetic fixtures above.
    expect(found).toContainEqual({
      file: 'packages/prototypes/brutalist/src/textarea/root.proto.ts',
      hook: 'asTextareaRoot',
      state: 'focusVisible',
    });

    const missing = found.filter(({ hook, state }) => {
      const states = loweredHookStates(hook);
      return !states || !states.has(state);
    });

    // A missing pair is not a crash: the extractor emits the bare token and the
    // rule's condition is dropped, so the style reaches the closure applying at
    // rest.
    expect(
      missing.map(({ file, hook, state }) => `${file}: ${hook}().${state}`),
      'rule conditions whose hook state the extractor cannot lower'
    ).toEqual([]);
  });
});
