import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
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

export type ExposedLocalUsage = {
  /** The name the prototype declared the state under. */
  state: string;
  /** The public key it is exposed as. */
  exposedAs: string;
  /**
   * The attribute the Web runtime will use. `ExposeStateWebModuleImpl` maps the
   * declared name — the state's `__stateSemantic` — before it falls back to the
   * expose key, so this is derived from the declaration, not the key.
   */
  attribute: string;
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
  /**
   * Reads of a prototype-owned state that is exposed, and therefore lowered by
   * the Web runtime to a `data-` attribute. These are not hook pairs, so they
   * are reported separately rather than pretending they came from an `asHook`.
   */
  exposedLocals: ExposedLocalUsage[];
};

type Binding =
  | { kind: 'hookResult'; hook: string }
  | { kind: 'handleBag'; hook: string }
  | { kind: 'handle'; hook: string; state: string }
  /** `def.state.bool(...)` — owned by the prototype, not borrowed from a hook. */
  | { kind: 'localState'; declaredAs?: string; exposedAs?: string }
  /** A value a `tw(...)` argument may name, resolved where it was declared. */
  | { kind: 'token'; initializer: ts.Expression }
  /** A named import; only a relative one is something the extractor follows. */
  | { kind: 'tokenImport'; specifier: string; imported: string; from?: string }
  /** A parameter: it shadows an outer name and its origin is not recoverable. */
  | { kind: 'opaque' };

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
  const exposedLocals: ExposedLocalUsage[] = [];

  /**
   * `def.expose.state('hidden', hidden)` by handle name. The Web runtime turns
   * the exposed key into a `data-` attribute and lowers rules on that state, so
   * an exposed local is not the same as a purely internal one.
   */
  /** The same normalization `createExposeStateWebNameMap` applies. */
  const exposedDataAttributeName = (key: string): string =>
    key
      .trim()
      .replace(/\s+/g, '-')
      .replace(/\./g, '-')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

  const exposedKeys = new Map<string, string>();
  const collectExposedKeys = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'state' &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.name.text === 'expose'
    ) {
      const [nameArg, handleArg] = node.arguments;
      if (nameArg && handleArg && ts.isStringLiteralLike(nameArg) && ts.isIdentifier(handleArg)) {
        exposedKeys.set(handleArg.text, nameArg.text);
      }
    }
    ts.forEachChild(node, collectExposedKeys);
  };
  collectExposedKeys(source);

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
      const declaredArgument = initializer.arguments[0];
      declare(scope, declaration.name.text, {
        kind: 'localState',
        declaredAs:
          declaredArgument && ts.isStringLiteralLike(declaredArgument)
            ? declaredArgument.text
            : undefined,
        exposedAs: exposedKeys.get(declaration.name.text),
      });
      return;
    }

    const hook = hookOfCall(declaration.initializer);
    if (hook && ts.isIdentifier(declaration.name)) {
      declare(scope, declaration.name.text, { kind: 'hookResult', hook });
      return;
    }

    // Anything else a name can hold is a candidate token value. Keeping it in
    // the same scope chain means two blocks may each declare `TOKENS` without
    // either becoming ambiguous, which is what the extractor's scopes do.
    if (ts.isIdentifier(declaration.name)) {
      declare(scope, declaration.name.text, {
        kind: 'token',
        initializer: declaration.initializer,
      });
    }
  };

  const declareImports = (scope: Scope): void => {
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        declare(scope, element.name.text, {
          kind: 'tokenImport',
          specifier: statement.moduleSpecifier.text,
          imported: (element.propertyName ?? element.name).text,
        });
      }
    }
  };

  /**
   * Resolves the argument of a `w.state(...)` read. `null` means untraceable;
   * `'local'` means traced to a prototype-owned state, which needs no hook
   * entry and must not be reported either way.
   */
  const readState = (
    node: ts.Node,
    scope: Scope
  ): HookStateUsage | { exposedLocal: ExposedLocalUsage } | 'local' | null => {
    const argument = unwrap(node);
    if (ts.isIdentifier(argument)) {
      const binding = lookup(scope, argument.text);
      if (binding?.kind === 'handle') return { hook: binding.hook, state: binding.state };
      if (binding?.kind === 'localState') {
        if (!binding.exposedAs) return 'local';
        return {
          exposedLocal: {
            state: argument.text,
            exposedAs: binding.exposedAs,
            attribute: exposedDataAttributeName(binding.declaredAs ?? binding.exposedAs),
          },
        };
      }
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
   * Reads a relative module the way `resolveModuleFile` does, so an imported
   * token constant is judged by its own initializer rather than by the fact
   * that the import was relative. A module this cannot read fails closed.
   */
  const moduleCache = new Map<string, ts.SourceFile | null>();

  const loadRelativeModule = (specifier: string, from = fileName): ts.SourceFile | null => {
    if (!specifier.startsWith('.')) return null;
    const base = path.resolve(path.dirname(from), specifier);
    const cached = moduleCache.get(base);
    if (cached !== undefined) return cached;
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mts`,
      `${base}.js`,
      `${base}.mjs`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
      path.join(base, 'index.js'),
    ];
    for (const candidate of candidates) {
      try {
        if (!statSync(candidate).isFile()) continue;
      } catch {
        continue;
      }
      const loaded = ts.createSourceFile(
        candidate,
        readFileSync(candidate, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      moduleCache.set(base, loaded);
      return loaded;
    }
    moduleCache.set(base, null);
    return null;
  };

  const moduleScopes = new Map<ts.SourceFile, Scope>();

  const moduleRootScope = (module: ts.SourceFile): Scope => {
    const cached = moduleScopes.get(module);
    if (cached) return cached;
    const scope: Scope = { parent: null, bindings: new Map() };
    // Insert before filling so a cycle of relative modules terminates.
    moduleScopes.set(module, scope);
    for (const statement of module.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
        const named = statement.importClause?.namedBindings;
        if (named && ts.isNamedImports(named)) {
          for (const element of named.elements) {
            scope.bindings.set(element.name.text, {
              kind: 'tokenImport',
              specifier: statement.moduleSpecifier.text,
              imported: (element.propertyName ?? element.name).text,
              from: module.fileName,
            });
          }
        }
        continue;
      }
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        scope.bindings.set(declaration.name.text, {
          kind: 'token',
          initializer: declaration.initializer,
        });
      }
    }
    return scope;
  };

  const exportedInitializer = (module: ts.SourceFile, name: string): ts.Expression | null => {
    for (const statement of module.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
        return declaration.initializer ?? null;
      }
    }
    return null;
  };

  /**
   * Argument shapes `resolveExpression` turns into tokens. A `tw(...)` argument
   * the extractor cannot resolve — an arbitrary call, or a name whose value it
   * cannot reach — names a real token set at runtime and yields nothing to the
   * closure, so the rendered variant would have no CSS.
   */
  const resolvableTokenArgument = (
    node: ts.Expression,
    scope: Scope,
    seen = new Set<string>()
  ): boolean => {
    const inner = unwrap(node) as ts.Expression;
    if (ts.isStringLiteralLike(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return true;
    // `resolveExpression` requires each substitution to carry a single value;
    // a conditional resolves to several strings and the template is dropped,
    // while the runtime receives one concrete token.
    if (ts.isTemplateExpression(inner))
      return inner.templateSpans.every(
        (span) =>
          singleValuedTokenArgument(span.expression, scope) &&
          resolvableTokenArgument(span.expression, scope, seen)
      );
    if (ts.isArrayLiteralExpression(inner))
      return inner.elements.every((element) => resolvableTokenArgument(element, scope, seen));
    if (ts.isObjectLiteralExpression(inner))
      return inner.properties.every(
        (property) =>
          ts.isPropertyAssignment(property) &&
          resolvableTokenArgument(property.initializer, scope, seen)
      );
    if (ts.isConditionalExpression(inner))
      return (
        resolvableTokenArgument(inner.whenTrue, scope, seen) &&
        resolvableTokenArgument(inner.whenFalse, scope, seen)
      );
    // `[...].join(' ')` is the one call form the extractor resolves, and
    // `resolveJoinCall` reads only a literal separator — anything else falls
    // back to `,` there while the runtime joins on the real value.
    if (
      ts.isCallExpression(inner) &&
      ts.isPropertyAccessExpression(inner.expression) &&
      inner.expression.name.text === 'join'
    ) {
      const separator = inner.arguments[0];
      const readableSeparator =
        separator === undefined ||
        ts.isStringLiteralLike(separator) ||
        ts.isNoSubstitutionTemplateLiteral(separator);
      if (!readableSeparator) return false;
      return resolvableTokenArgument(inner.expression.expression, scope, seen);
    }
    if (ts.isIdentifier(inner)) {
      if (seen.has(inner.text)) return false;
      const binding = lookup(scope, inner.text);
      const next = new Set([...seen, inner.text]);
      if (binding?.kind === 'token')
        return resolvableTokenArgument(binding.initializer, scope, next);
      if (binding?.kind === 'tokenImport') {
        const module = loadRelativeModule(binding.specifier, binding.from ?? fileName);
        if (!module) return false;
        const initializer = exportedInitializer(module, binding.imported);
        if (!initializer) return false;
        // `loadModuleBindings` applies the module's own relative imports before
        // resolving its exports, so a token re-exported through a chain of
        // relative modules is extractable and must not read as opaque here.
        return resolvableTokenArgument(initializer, moduleRootScope(module), next);
      }
      return false;
    }
    if (ts.isElementAccessExpression(inner)) {
      // A member is only reachable if its owner is. Element access is the form
      // `resolveExpression` reads a token map through.
      return resolvableTokenArgument(inner.expression, scope, seen);
    }
    // Dot access resolves through `semanticMap` only, which holds hook state
    // handles rather than tokens. An ordinary token object is a `map`, so
    // `tw(TOKENS.active)` yields nothing while the runtime lowers the real one.
    return false;
  };

  /** Shapes `resolveExpression` gives a single value rather than a set. */
  const singleValuedTokenArgument = (node: ts.Expression, scope: Scope): boolean => {
    const inner = unwrap(node) as ts.Expression;
    if (ts.isStringLiteralLike(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return true;
    if (ts.isTemplateExpression(inner)) return true;
    if (ts.isIdentifier(inner)) {
      const binding = lookup(scope, inner.text);
      if (binding?.kind === 'token') return singleValuedTokenArgument(binding.initializer, scope);
      return binding?.kind === 'tokenImport';
    }
    return false;
  };

  /**
   * Every `tw(...)` in the intent, and every argument of each, has to be
   * extractable. `tw` is variadic and `collectTwTokens` reads all of them, so
   * one resolvable argument cannot vouch for the rest.
   */
  const yieldsExtractableTokens = (
    node: ts.Node,
    scope: Scope,
    intentParameter: string | null
  ): boolean => {
    // Only the handles actually handed to `feedback.style.use` carry tokens the
    // variant prefixes. A `tw(...)` sitting elsewhere in the intent is read by
    // the extractor's own walk and would otherwise vouch for a handle it has
    // nothing to do with.
    const handles: ts.Expression[] = [];
    const collect = (current: ts.Node): void => {
      if (
        ts.isCallExpression(current) &&
        intentParameter !== null &&
        chainBase(current) === intentParameter &&
        memberChain(current).join('.') === 'feedback.style.use'
      ) {
        handles.push(...current.arguments);
      }
      ts.forEachChild(current, collect);
    };
    collect(node);
    if (handles.length === 0) return false;

    return handles.every((handle) => {
      const call = unwrap(handle);
      if (
        !ts.isCallExpression(call) ||
        !ts.isIdentifier(call.expression) ||
        call.expression.text !== 'tw'
      ) {
        // A pre-bound handle gives `collectTwTokens` no call to read.
        return false;
      }
      return (
        call.arguments.length > 0 &&
        call.arguments.every((argument) => resolvableTokenArgument(argument, scope))
      );
    });
  };

  /** The identifier a member chain bottoms out at, if it is one. */
  const chainBase = (node: ts.Node): string | null => {
    let current = unwrap(node);
    while (ts.isPropertyAccessExpression(current) || ts.isCallExpression(current)) {
      current = unwrap(ts.isCallExpression(current) ? current.expression : current.expression);
    }
    return ts.isIdentifier(current) ? current.text : null;
  };

  /** The member chain of a call, e.g. `feedback.style.use`. */
  const memberChain = (node: ts.CallExpression): string[] => {
    const parts: string[] = [];
    let current: ts.Node = unwrap(node.expression);
    while (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = unwrap(current.expression);
    }
    return parts;
  };

  const parameterName = (node: ts.Node): string | null => {
    const fn = unwrap(node);
    if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return null;
    const first = fn.parameters[0];
    return first && ts.isIdentifier(first.name) ? first.name.text : null;
  };

  type Leaf = {
    usage: HookStateUsage | { exposedLocal: ExposedLocalUsage } | 'local' | null;
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
    let branchedCondition = false;
    let helperCondition = false;
    const builderParameter = parameterName(when.initializer);
    // `({ state }) => state(x).eq(true)` gives the builder no name to anchor on,
    // and `analyzeWhenVariants` reads a property access, so it emits no selector.
    if (builderParameter === null) aliasedBuilder = true;

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
      // Only one branch reaches the returned expression at runtime, so the
      // runtime lowers one condition while a walk over the source sees both and
      // the extractor combines them into a selector nothing matches.
      const CONTROL_FLOW_OPERATORS = new Set<ts.SyntaxKind>([
        ts.SyntaxKind.CommaToken,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ]);
      if (
        ts.isConditionalExpression(node) ||
        (ts.isBinaryExpression(node) && CONTROL_FLOW_OPERATORS.has(node.operatorToken.kind))
      ) {
        branchedCondition = true;
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const member = node.expression.name.text;
        // The runtime's dependency set holds the builder operations actually
        // invoked, so an unrelated call in a block-bodied callback is not a
        // dependency and must not make the rule look dynamic.
        const onBuilder = builderParameter !== null && chainBase(node) === builderParameter;
        // `w.all(w.state(a).eq(true), other(w))` — the runtime executes the
        // helper and lowers whatever it returns, while a source walk sees only
        // what is written here. The extractor has the same limit, so a helper
        // in a condition position is a blind spot rather than a leaf.
        if (onBuilder && (member === 'all' || member === 'any')) {
          for (const argument of node.arguments) {
            const inner = unwrap(argument);
            if (ts.isCallExpression(inner) && ts.isIdentifier(inner.expression)) {
              helperCondition = true;
            }
          }
        }
        if (onBuilder && !LOWERABLE_MEMBERS.has(member)) hasForeignDep = true;
        if (onBuilder && member === 'any') hasAny = true;

        if (onBuilder && member === 'eq') {
          const receiver = unwrap(node.expression.expression);
          // `when: ({ state }) => state(x).eq(true)` calls an aliased builder
          // member. `analyzeWhenVariants` reads a property access, so it emits
          // no selector while the runtime records the dependency normally.
          if (ts.isCallExpression(receiver) && ts.isIdentifier(receiver.expression)) {
            aliasedBuilder = true;
          }

          // `extractConditions` lowers exactly one meta comparison: colorScheme
          // against `dark`. Any other meta pair keeps the rule on the runtime
          // plan, so treating every meta dependency as lowerable would demand a
          // mapping the CLI never needs.
          if (
            ts.isCallExpression(receiver) &&
            ts.isPropertyAccessExpression(receiver.expression) &&
            receiver.expression.name.text === 'meta'
          ) {
            const key = receiver.arguments[0];
            const value = node.arguments[0];
            if (
              key &&
              value &&
              ts.isStringLiteralLike(key) &&
              ts.isStringLiteralLike(value) &&
              key.text === 'colorScheme' &&
              value.text === 'dark'
            ) {
              hasMeta = true;
            } else {
              hasForeignDep = true;
            }
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
    // A callback whose whole body is a helper call is the same blind spot.
    const bodyIsHelperCall = (() => {
      const fn = unwrap(when.initializer);
      if (!ts.isArrowFunction(fn) || ts.isBlock(fn.body)) return false;
      const body = unwrap(fn.body);
      return ts.isCallExpression(body) && ts.isIdentifier(body.expression);
    })();

    if (aliasedBuilder || branchedCondition || helperCondition || bodyIsHelperCall) {
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
    if (intent && ts.isPropertyAssignment(intent)) {
      // The runtime abandons a candidate as soon as an intent op is not
      // `feedback.style.use`, so a mixed intent stays on the runtime plan and
      // needs no static mapping. Demanding one would fail a valid prototype.
      const intentParameter = parameterName(intent.initializer);
      let nonStyleOperation = false;
      const inspectIntent = (node: ts.Node): void => {
        if (
          ts.isCallExpression(node) &&
          intentParameter !== null &&
          chainBase(node) === intentParameter &&
          memberChain(node).join('.') !== 'feedback.style.use'
        ) {
          nonStyleOperation = true;
        }
        ts.forEachChild(node, inspectIntent);
      };
      inspectIntent(intent.initializer);
      if (nonStyleOperation) return;

      if (!yieldsExtractableTokens(intent.initializer, scope, intentParameter)) {
        unresolved.push({ expression: intent.getText(source), reason: 'intent' });
        return;
      }
    }

    for (const leaf of leaves) {
      if (!leaf.comparison) {
        unresolved.push({ expression: leaf.text, reason: 'comparison' });
        continue;
      }
      if (leaf.usage === 'local') continue;
      if (leaf.usage && 'exposedLocal' in leaf.usage) {
        exposedLocals.push(leaf.usage.exposedLocal);
        continue;
      }
      if (leaf.usage) usages.push(leaf.usage);
      else unresolved.push({ expression: leaf.subject, reason: 'subject' });
    }
  };

  const visit = (node: ts.Node, scope: Scope): void => {
    const current = introducesScope(node)
      ? { parent: scope, bindings: new Map<string, Binding>() }
      : scope;

    // The extractor registers declarations while iterating the variable
    // statements of a statement-bearing scope, so a loop initializer or a
    // catch binding never reaches it.
    // A parameter shadows whatever the enclosing scopes bound to that name. Its
    // own origin cannot be recovered from the source, so it resolves to nothing
    // rather than falling through to an outer handle of the same name.
    if (ts.isFunctionLike(node)) {
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name))
          declare(current, parameter.name.text, { kind: 'opaque' });
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.parent &&
      ts.isVariableDeclarationList(node.parent) &&
      node.parent.parent &&
      ts.isVariableStatement(node.parent.parent)
    ) {
      declareFromInitializer(node, current);
    }

    if (
      ts.isCallExpression(node) &&
      ((ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'rule') ||
        (ts.isElementAccessExpression(node.expression) &&
          node.expression.argumentExpression &&
          ts.isStringLiteralLike(node.expression.argumentExpression) &&
          node.expression.argumentExpression.text === 'rule')) &&
      node.arguments.length >= 1
    ) {
      const spec = unwrap(node.arguments[0]);
      // The production walk matches a property access only, so `def['rule'](…)`
      // reaches the same runtime API and emits no variant. It is a blind spot
      // whatever the argument looks like.
      const viaElementAccess = ts.isElementAccessExpression(node.expression);
      if (!viaElementAccess && ts.isObjectLiteralExpression(spec)) analyzeRule(spec, current);
      // The extractor reads an object literal only. A rule handed a binding is
      // lowered by the runtime and dropped by the extractor, so it is a blind
      // spot rather than something to skip.
      else unresolved.push({ expression: node.getText(source), reason: 'spec' });
    }

    ts.forEachChild(node, (child) => visit(child, current));
  };

  const rootScope: Scope = { parent: null, bindings: new Map() };
  declareImports(rootScope);
  visit(source, rootScope);

  return { usages, unresolved, exposedLocals };
}
