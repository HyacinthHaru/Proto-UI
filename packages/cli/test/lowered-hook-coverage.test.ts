import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { loweredHookStates } from '../src/services/prototype-style-tokens';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOTYPE_GLOB = 'packages/prototypes/*/src/**/*.proto.ts';

type Usage = {
  file: string;
  hook: string;
  state: string;
};

/**
 * Finds every `w.state(x)` a rule condition reads, and traces `x` back to the
 * `asHook().stateHandles` it was destructured from. That is the pair the
 * extractor must be able to resolve; when it cannot, the rule contributes no
 * variant and its tokens reach the closure unconditional.
 */
function collectRuleStateUsages(file: string, sourceText: string): Usage[] {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  // local identifier -> the state name it aliases, and the hook it came from.
  const destructured = new Map<string, string>();
  const destructuredHook = new Map<string, string>();
  const objectBindings = new Map<string, string>();

  const hookNameOf = (initializer: ts.Node): string | null => {
    // `asHook().stateHandles` and `asHook<Props>().stateHandles`
    if (!ts.isPropertyAccessExpression(initializer)) return null;
    if (initializer.name.text !== 'stateHandles') return null;
    const call = initializer.expression;
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return null;
    return call.expression.text;
  };

  const visitBindings = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      // Prototypes bind the handles first and destructure after the null check,
      // so an initializer is either the call itself or an already-bound name.
      const initializer = ts.isNonNullExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      const hook =
        hookNameOf(initializer) ??
        (ts.isIdentifier(initializer) ? (objectBindings.get(initializer.text) ?? null) : null);
      if (hook) {
        if (ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            const name = element.propertyName ?? element.name;
            if (ts.isIdentifier(element.name) && ts.isIdentifier(name)) {
              destructured.set(element.name.text, name.text);
              destructuredHook.set(element.name.text, hook);
            }
          }
        } else if (ts.isIdentifier(node.name)) {
          objectBindings.set(node.name.text, hook);
        }
      }
    }
    ts.forEachChild(node, visitBindings);
  };
  // Twice, so a destructure that reads a name bound earlier in the same scope
  // resolves regardless of which order the visitor reached them.
  visitBindings(source);
  visitBindings(source);

  const usages: Usage[] = [];
  const visitRules = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'state' &&
      node.arguments.length === 1
    ) {
      const argument = node.arguments[0];
      if (ts.isIdentifier(argument)) {
        const hook = destructuredHook.get(argument.text);
        const state = destructured.get(argument.text);
        if (hook && state) usages.push({ file, hook, state });
      } else if (ts.isPropertyAccessExpression(argument) && ts.isIdentifier(argument.expression)) {
        const hook = objectBindings.get(argument.expression.text);
        if (hook) usages.push({ file, hook, state: argument.name.text });
      }
    }
    ts.forEachChild(node, visitRules);
  };
  visitRules(source);

  return usages;
}

describe('lowered hook coverage', () => {
  it('resolves every hook state a shipped rule condition reads', async () => {
    const usages: Usage[] = [];
    for await (const entry of glob(PROTOTYPE_GLOB, { cwd: REPO_ROOT })) {
      const file = String(entry);
      usages.push(
        ...collectRuleStateUsages(file, await readFile(path.join(REPO_ROOT, file), 'utf8'))
      );
    }

    // The scan must actually find work, or a refactor could silently empty it.
    expect(usages.length).toBeGreaterThan(20);

    const unresolved = usages.filter(({ hook, state }) => {
      const states = loweredHookStates(hook);
      return !states || !states.has(state);
    });

    // A missing pair is not a crash: the extractor emits the bare token and the
    // rule's condition is dropped, so the style reaches the closure applying at
    // rest. Both #472 and #482 shipped through review with this latent.
    expect(
      unresolved.map(({ file, hook, state }) => `${file}: ${hook}().${state}`),
      'rule conditions whose hook state the extractor cannot lower'
    ).toEqual([]);
  });
});
