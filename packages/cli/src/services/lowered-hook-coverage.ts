import ts from 'typescript';

export type HookStateUsage = {
  hook: string;
  state: string;
};

/**
 * Traces every `w.state(x)` a rule condition reads back to the `asHook()` whose
 * state handles produced it, but only for rules the runtime actually lowers.
 * That pair is what the style extractor must resolve; when it cannot, the rule
 * contributes no variant and its tokens reach the closure unconditional.
 *
 * A rule is skipped when the runtime would keep it on the runtime plan anyway,
 * because a pair the runtime never lowers needs no static entry and reporting
 * one is a false positive:
 *   - any `w.prop(...)` dependency, which the runtime refuses outright;
 *   - an `any(...)` condition, which the runtime does not decompose;
 *   - a condition whose variants are all negative, which both sides skip.
 *
 * Prototypes bind handles in three shapes, and all three have to be followed:
 *   const { a } = asHook().stateHandles;
 *   const s = asHook().stateHandles;      const { a } = s;
 *   const h = asHook(); const s = h.stateHandles; const { a } = s;
 */
export function collectRuleStateUsages(
  sourceText: string,
  fileName = 'source.proto.ts'
): HookStateUsage[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);

  // `const h = asHook()` — the hook result itself.
  const hookResults = new Map<string, string>();
  // `const s = asHook().stateHandles` or `= h.stateHandles` — the handle bag.
  const handleBags = new Map<string, string>();
  // `const { a } = <bag>` — a single handle, plus the state name it aliases.
  const handleHook = new Map<string, string>();
  const handleState = new Map<string, string>();

  const unwrap = (node: ts.Expression): ts.Expression =>
    ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)
      ? unwrap(node.expression)
      : node;

  const hookOfCall = (node: ts.Expression): string | null => {
    const expression = unwrap(node);
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
    const name = expression.expression.text;
    return name.startsWith('as') ? name : null;
  };

  /** Resolves an initializer to the hook whose state-handle bag it denotes. */
  const bagOf = (node: ts.Expression): string | null => {
    const expression = unwrap(node);
    if (ts.isIdentifier(expression)) return handleBags.get(expression.text) ?? null;
    if (!ts.isPropertyAccessExpression(expression)) return null;
    if (expression.name.text !== 'stateHandles') return null;
    const owner = unwrap(expression.expression);
    if (ts.isIdentifier(owner)) return hookResults.get(owner.text) ?? null;
    return hookOfCall(owner);
  };

  const visitBindings = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const bag = bagOf(node.initializer);
      if (bag) {
        if (ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            const source = element.propertyName ?? element.name;
            if (ts.isIdentifier(element.name) && ts.isIdentifier(source)) {
              handleHook.set(element.name.text, bag);
              handleState.set(element.name.text, source.text);
            }
          }
        } else if (ts.isIdentifier(node.name)) {
          handleBags.set(node.name.text, bag);
        }
      } else {
        const hook = hookOfCall(node.initializer);
        if (hook && ts.isIdentifier(node.name)) hookResults.set(node.name.text, hook);
      }
    }
    ts.forEachChild(node, visitBindings);
  };
  // Three passes, so a binding that reads a name declared later in the same
  // scope still resolves regardless of the order the visitor reached them.
  visitBindings(source);
  visitBindings(source);
  visitBindings(source);

  type Leaf = { usage: HookStateUsage | null; positive: boolean };

  /** Reads one `w.state(x).eq(literal)` and resolves x back to its hook. */
  const readStateLeaf = (call: ts.CallExpression): HookStateUsage | null => {
    const argument = unwrap(call.arguments[0]);
    if (ts.isIdentifier(argument)) {
      const hook = handleHook.get(argument.text);
      const state = handleState.get(argument.text);
      return hook && state ? { hook, state } : null;
    }
    if (ts.isPropertyAccessExpression(argument)) {
      const owner = unwrap(argument.expression);
      if (ts.isIdentifier(owner)) {
        const hook = handleBags.get(owner.text);
        if (hook) return { hook, state: argument.name.text };
      }
    }
    return null;
  };

  /** Collects the condition's shape, mirroring what the runtime will accept. */
  const readCondition = (
    node: ts.Node
  ): { leaves: Leaf[]; hasProp: boolean; hasAny: boolean; hasMeta: boolean } => {
    const leaves: Leaf[] = [];
    let hasProp = false;
    let hasAny = false;
    let hasMeta = false;

    const visit = (current: ts.Node): void => {
      if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
        const member = current.expression.name.text;
        if (member === 'prop') hasProp = true;
        if (member === 'any') hasAny = true;
        if (member === 'meta') hasMeta = true;
        if (member === 'eq') {
          const receiver = unwrap(current.expression.expression);
          if (
            ts.isCallExpression(receiver) &&
            ts.isPropertyAccessExpression(receiver.expression) &&
            receiver.expression.name.text === 'state' &&
            receiver.arguments.length === 1
          ) {
            const literal = current.arguments[0];
            leaves.push({
              usage: readStateLeaf(receiver),
              positive: literal?.kind !== ts.SyntaxKind.FalseKeyword,
            });
          }
        }
      }
      ts.forEachChild(current, visit);
    };
    visit(node);

    return { leaves, hasProp, hasAny, hasMeta };
  };

  const usages: HookStateUsage[] = [];
  const visitRules = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'rule' &&
      node.arguments.length >= 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const when = node.arguments[0].properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'when'
      );
      if (when && ts.isPropertyAssignment(when)) {
        const { leaves, hasProp, hasAny, hasMeta } = readCondition(when.initializer);
        const lowerable = !hasProp && !hasAny && (hasMeta || leaves.some((leaf) => leaf.positive));
        if (lowerable) {
          for (const leaf of leaves) if (leaf.usage) usages.push(leaf.usage);
        }
      }
    }
    ts.forEachChild(node, visitRules);
  };
  visitRules(source);

  return usages;
}
