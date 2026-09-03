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
   * `intent` — the intent carries no `tw(...)` the extractor can read, so the
   *   rule has no token for a variant to prefix.
   * `spec` — the rule was not given as an object literal, or its `when` and
   *   `intent` were not plain property assignments, which neither analyzer reads.
   * `condition` — the condition is shaped in a way the extractor's selector
   *   analysis does not recognize, such as an aliased builder call.
   */
  reason: 'subject' | 'comparison' | 'intent' | 'spec' | 'condition';
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
 *   - any dependency the runtime's `isStateMetaDeps` refuses, which is every
 *     kind but `state` and `meta` — `prop` and `ctx` alike;
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

  /** Matches `getPropertyName` in the extractor, which accepts a quoted key. */
  const propertyName = (name: ts.PropertyName): string | null =>
    ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null;

  /**
   * Argument shapes `resolveExpression` can turn into tokens. A `tw(...)` whose
   * argument is an arbitrary call — `tw(getRuleTokens())` — names a real token
   * set at runtime and yields nothing to the extractor, so the rendered variant
   * would have no CSS.
   */
  const resolvableTokenArgument = (node: ts.Expression): boolean => {
    const inner = unwrap(node) as ts.Expression;
    if (ts.isStringLiteralLike(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return true;
    if (ts.isTemplateExpression(inner))
      return inner.templateSpans.every((span) => resolvableTokenArgument(span.expression));
    if (ts.isArrayLiteralExpression(inner))
      return inner.elements.every((element) => resolvableTokenArgument(element));
    if (ts.isIdentifier(inner) || ts.isPropertyAccessExpression(inner)) return true;
    if (ts.isElementAccessExpression(inner)) return true;
    if (ts.isConditionalExpression(inner))
      return resolvableTokenArgument(inner.whenTrue) && resolvableTokenArgument(inner.whenFalse);
    // `[...].join(' ')` is the one call form the extractor resolves.
    if (
      ts.isCallExpression(inner) &&
      ts.isPropertyAccessExpression(inner.expression) &&
      inner.expression.name.text === 'join'
    )
      return resolvableTokenArgument(inner.expression.expression);
    return false;
  };

  const yieldsExtractableTokens = (node: ts.Node): boolean => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'tw'
    ) {
      const argument = node.arguments[0];
      return Boolean(argument) && resolvableTokenArgument(argument);
    }
    return ts.forEachChild(node, yieldsExtractableTokens) ?? false;
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
    // `{ when, intent }` and `{ when() {} }` are valid specs the runtime calls
    // normally, while both `collectRuleVariantTokens` and this scanner read
    // plain property assignments only. Skipping them would leave no trace.
    const shorthand = config.properties.find(
      (property) =>
        (ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
        (propertyName(property.name) === 'when' || propertyName(property.name) === 'intent')
    );
    if (shorthand) {
      unresolved.push({ expression: config.getText(source), reason: 'spec' });
      return;
    }

    const when = config.properties.find(
      (property) => ts.isPropertyAssignment(property) && propertyName(property.name) === 'when'
    );
    if (!when || !ts.isPropertyAssignment(when)) return;

    const leaves: Leaf[] = [];
    let hasForeignDep = false;
    let hasAny = false;
    let hasMeta = false;
    let aliasedBuilder = false;

    /**
     * Everything the two lowering paths understand. `isStateMetaDeps` accepts
     * only `state` and `meta` dependencies and `extractConditions` only `eq`
     * and `all`, so anything else keeps the rule on the runtime plan. Naming
     * what is understood rather than what is refused means a builder method
     * added later defaults to not lowerable instead of being silently assumed
     * static.
     */
    const LOWERABLE_MEMBERS = new Set(['all', 'any', 'eq', 'state', 'meta']);

    const visitCondition = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const member = node.expression.name.text;
        if (!LOWERABLE_MEMBERS.has(member)) hasForeignDep = true;
        if (member === 'any') hasAny = true;
        if (member === 'meta') hasMeta = true;
        if (member === 'eq') {
          const receiver = unwrap(node.expression.expression);
          // `when: ({ state }) => state(x).eq(true)` calls an aliased builder
          // member. `analyzeWhenVariants` reads a property access, so it emits
          // no selector while the runtime records the dependency normally.
          if (ts.isCallExpression(receiver) && ts.isIdentifier(receiver.expression)) {
            aliasedBuilder = true;
          }
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
    if (aliasedBuilder) {
      unresolved.push({ expression: when.initializer.getText(source), reason: 'condition' });
      return;
    }

    const lowerable =
      !hasForeignDep &&
      !hasAny &&
      (hasMeta || leaves.some((leaf) => leaf.comparison !== 'negative'));
    if (!lowerable) return;

    // The variant is a prefix on the tokens the intent yields. `collectTwTokens`
    // reads a `tw(...)` call, so an intent that passes a pre-bound handle gives
    // the closure nothing to prefix and the rendered variant has no CSS.
    const intent = config.properties.find(
      (property) => ts.isPropertyAssignment(property) && propertyName(property.name) === 'intent'
    );
    if (intent && ts.isPropertyAssignment(intent) && !yieldsExtractableTokens(intent.initializer)) {
      unresolved.push({ expression: intent.getText(source), reason: 'intent' });
      return;
    }

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
      node.arguments.length >= 1
    ) {
      const spec = unwrap(node.arguments[0]);
      if (ts.isObjectLiteralExpression(spec)) analyzeRule(spec, current);
      // The extractor reads an object literal only. A rule handed a binding is
      // lowered by the runtime and dropped by the extractor, so it is a blind
      // spot rather than something to skip.
      else unresolved.push({ expression: node.getText(source), reason: 'spec' });
    }

    ts.forEachChild(node, (child) => visit(child, current));
  };

  visit(source, { parent: null, bindings: new Map() });

  return { usages, unresolved };
}
