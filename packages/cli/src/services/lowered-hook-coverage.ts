import ts from 'typescript';

export type HookStateUsage = {
  hook: string;
  state: string;
};

export type UnresolvedStateRead = {
  /** Source text of the part the scanner could not resolve. */
  expression: string;
  /**
   * `subject` — the `w.state(...)` argument did not trace to a hook handle.
   * `comparison` — the right-hand side is not a form the extractor lowers.
   */
  reason: 'subject' | 'comparison';
};

export type RuleStateScan = {
  /** Reads traced to a hook and state the extractor must be able to resolve. */
  usages: HookStateUsage[];
  /**
   * Reads inside a lowerable rule that the scanner could not trace. These fail
   * the gate rather than disappearing. A read is only counted here when it is
   * neither a hook handle nor a state the prototype declares itself, so it
   * means the scanner has met a shape it does not understand — exactly when the
   * static extractor is most likely to be silently missing the same rule.
   */
  unresolved: UnresolvedStateRead[];
};

type Binding =
  | { kind: 'hookResult'; hook: string }
  | { kind: 'handleBag'; hook: string }
  | { kind: 'handle'; hook: string; state: string }
  /** `def.state.bool(...)` — owned by the prototype, not borrowed from a hook. */
  | { kind: 'localState' };

type Scope = {
  parent: Scope | null;
  bindings: Map<string, Binding>;
};

function lookup(scope: Scope | null, name: string): Binding | null {
  for (let current = scope; current; current = current.parent) {
    const binding = current.bindings.get(name);
    if (binding) return binding;
  }
  return null;
}

function introducesScope(node: ts.Node): boolean {
  return (
    ts.isSourceFile(node) ||
    ts.isBlock(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isFunctionLike(node)
  );
}

/**
 * Traces every `w.state(x)` a rule condition reads back to the `asHook()` whose
 * state handles produced it, for rules the runtime actually lowers.
 *
 * Bindings resolve through a lexical scope chain rather than one flat table, so
 * a nested or sibling declaration that reuses a name cannot change the hook
 * identity of a usage in an enclosing scope.
 *
 * A rule is skipped when the runtime would keep it on the runtime plan anyway,
 * because a pair the runtime never lowers needs no static entry:
 *   - any `w.prop(...)` dependency, which the runtime refuses outright;
 *   - an `any(...)` condition, which the runtime does not decompose;
 *   - a condition whose variants are all negative, which both sides skip.
 *
 * A comparison the extractor does not lower is not one of those: the scanner
 * cannot tell whether the rule wanted a static entry, so it reports the leaf
 * rather than deciding for itself.
 */
export function scanRuleStateReads(
  sourceText: string,
  fileName = 'source.proto.ts'
): RuleStateScan {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const usages: HookStateUsage[] = [];
  const unresolved: UnresolvedStateRead[] = [];

  const unwrap = (node: ts.Node): ts.Node =>
    ts.isNonNullExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node)
      ? unwrap(node.expression)
      : node;

  const hookOfCall = (node: ts.Node): string | null => {
    const call = unwrap(node);
    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return null;
    const name = call.expression.text;
    return name.startsWith('as') ? name : null;
  };

  /** Resolves an expression to the hook whose state-handle bag it denotes. */
  const bagHook = (node: ts.Node, scope: Scope): string | null => {
    const expression = unwrap(node);
    if (ts.isIdentifier(expression)) {
      const binding = lookup(scope, expression.text);
      return binding?.kind === 'handleBag' ? binding.hook : null;
    }
    if (!ts.isPropertyAccessExpression(expression)) return null;
    if (expression.name.text !== 'stateHandles') return null;
    const owner = unwrap(expression.expression);
    if (ts.isIdentifier(owner)) {
      const binding = lookup(scope, owner.text);
      return binding?.kind === 'hookResult' ? binding.hook : null;
    }
    return hookOfCall(owner);
  };

  const declare = (scope: Scope, name: string, binding: Binding): void => {
    scope.bindings.set(name, binding);
  };

  const declareFromInitializer = (declaration: ts.VariableDeclaration, scope: Scope): void => {
    if (!declaration.initializer) return;
    const bag = bagHook(declaration.initializer, scope);

    if (bag) {
      if (ts.isObjectBindingPattern(declaration.name)) {
        for (const element of declaration.name.elements) {
          const property = element.propertyName ?? element.name;
          if (ts.isIdentifier(element.name) && ts.isIdentifier(property)) {
            declare(scope, element.name.text, {
              kind: 'handle',
              hook: bag,
              state: property.text,
            });
          }
        }
      } else if (ts.isIdentifier(declaration.name)) {
        declare(scope, declaration.name.text, { kind: 'handleBag', hook: bag });
      }
      return;
    }

    // `const checked = asHook().stateHandles.checked` and `= bag.checked`
    const initializer = unwrap(declaration.initializer);
    if (ts.isPropertyAccessExpression(initializer) && ts.isIdentifier(declaration.name)) {
      const owner = bagHook(initializer.expression, scope);
      if (owner) {
        declare(scope, declaration.name.text, {
          kind: 'handle',
          hook: owner,
          state: initializer.name.text,
        });
        return;
      }
    }

    // `const hidden = def.state.bool('hidden', true)` — a prototype-owned state.
    if (
      ts.isCallExpression(initializer) &&
      ts.isPropertyAccessExpression(initializer.expression) &&
      ts.isPropertyAccessExpression(initializer.expression.expression) &&
      initializer.expression.expression.name.text === 'state' &&
      ts.isIdentifier(declaration.name)
    ) {
      declare(scope, declaration.name.text, { kind: 'localState' });
      return;
    }

    const hook = hookOfCall(declaration.initializer);
    if (hook && ts.isIdentifier(declaration.name)) {
      declare(scope, declaration.name.text, { kind: 'hookResult', hook });
    }
  };

  /**
   * Resolves the argument of a `w.state(...)` read. `null` means untraceable;
   * `'local'` means traced to a prototype-owned state, which needs no hook
   * entry and must not be reported either way.
   */
  const readState = (node: ts.Node, scope: Scope): HookStateUsage | 'local' | null => {
    const argument = unwrap(node);
    if (ts.isIdentifier(argument)) {
      const binding = lookup(scope, argument.text);
      if (binding?.kind === 'handle') return { hook: binding.hook, state: binding.state };
      if (binding?.kind === 'localState') return 'local';
      return null;
    }
    if (ts.isPropertyAccessExpression(argument)) {
      const owner = bagHook(argument.expression, scope);
      if (owner) return { hook: owner, state: argument.name.text };
    }
    return null;
  };

  /**
   * The extractor's `resolveStateEqVariant` lowers exactly three right-hand
   * sides: the two boolean keywords, and a string literal whose text is a legal
   * data-attribute value. `null` means the extractor produces no variant, which
   * the scanner reports rather than reading as covered.
   */
  const comparisonOf = (node: ts.Expression | undefined): 'positive' | 'negative' | null => {
    if (!node) return null;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'positive';
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'negative';
    if (ts.isStringLiteralLike(node) && /^[a-zA-Z0-9_-]+$/.test(node.text)) return 'positive';
    return null;
  };

  type Leaf = {
    usage: HookStateUsage | 'local' | null;
    /** The `w.state(...)` argument. */
    subject: string;
    /** The whole `w.state(...).eq(...)` leaf. */
    text: string;
    comparison: 'positive' | 'negative' | null;
  };

  const analyzeRule = (config: ts.ObjectLiteralExpression, scope: Scope): void => {
    // The extractor reads this key through `getPropertyName`, which accepts a
    // quoted name as well as an identifier. Requiring an identifier here would
    // let a quoted rule pass the gate while the extractor still lowers it.
    const propertyName = (name: ts.PropertyName): string | null =>
      ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null;

    const when = config.properties.find(
      (property) => ts.isPropertyAssignment(property) && propertyName(property.name) === 'when'
    );
    if (!when || !ts.isPropertyAssignment(when)) return;

    const leaves: Leaf[] = [];
    let hasProp = false;
    let hasAny = false;
    let hasMeta = false;

    const visitCondition = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const member = node.expression.name.text;
        if (member === 'prop') hasProp = true;
        if (member === 'any') hasAny = true;
        if (member === 'meta') hasMeta = true;
        if (member === 'eq') {
          const receiver = unwrap(node.expression.expression);
          if (
            ts.isCallExpression(receiver) &&
            ts.isPropertyAccessExpression(receiver.expression) &&
            receiver.expression.name.text === 'state' &&
            receiver.arguments.length === 1
          ) {
            leaves.push({
              usage: readState(receiver.arguments[0], scope),
              subject: receiver.arguments[0].getText(source),
              text: node.getText(source),
              comparison: comparisonOf(node.arguments[0]),
            });
          }
        }
      }
      ts.forEachChild(node, visitCondition);
    };
    visitCondition(when.initializer);

    // An unlowerable comparison counts here too: only an all-negative condition
    // is provably skipped by both sides.
    const lowerable =
      !hasProp && !hasAny && (hasMeta || leaves.some((leaf) => leaf.comparison !== 'negative'));
    if (!lowerable) return;

    for (const leaf of leaves) {
      if (!leaf.comparison) {
        unresolved.push({ expression: leaf.text, reason: 'comparison' });
        continue;
      }
      if (leaf.usage === 'local') continue;
      if (leaf.usage) usages.push(leaf.usage);
      else unresolved.push({ expression: leaf.subject, reason: 'subject' });
    }
  };

  const visit = (node: ts.Node, scope: Scope): void => {
    const current = introducesScope(node)
      ? { parent: scope, bindings: new Map<string, Binding>() }
      : scope;

    if (ts.isVariableDeclaration(node)) declareFromInitializer(node, current);

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'rule' &&
      node.arguments.length >= 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      analyzeRule(node.arguments[0], current);
    }

    ts.forEachChild(node, (child) => visit(child, current));
  };

  visit(source, { parent: null, bindings: new Map() });

  return { usages, unresolved };
}
