import ts from 'typescript';
import {
  createHookSourceModuleContext,
  type HookSourceModule as Module,
  type HookSourceSymbol as SymbolRef,
} from './hook-source-module.js';

/** The source identity of an authored declaration. */
export type HookSourceRef = { file: string; start: number };

/** A state declaration is kept distinct from the public member which reached it. */
export type HookSourceState = {
  owner: HookSourceRef;
  declaration: HookSourceRef;
  declaredName: string;
  variant: string | null;
};

export type HookSourceValue =
  | { kind: 'state'; state: HookSourceState }
  | {
      kind: 'object';
      members: ReadonlyMap<string, HookSourceValue>;
      uncertainKeys?: boolean;
      arrayLength?: number;
    }
  | {
      kind: 'result';
      producer: HookSourceRef;
      name: string;
      stateHandles: ReadonlyMap<string, HookSourceState>;
      children: ReadonlyMap<string, HookSourceValue>;
      handle?: HookSourceValue;
    }
  | { kind: 'unknown'; reason: string };

export type HookSourceResolution = {
  /** True when the expression was an imported/local authored producer or its member. */
  matched: boolean;
  value: HookSourceValue;
};

export type HookSourceSummaryContext = {
  /** Register an already-read source, preserving caller-provided text exactly. */
  registerSource(source: ts.SourceFile): void;
  /** Resolve a source expression without executing it. */
  resolve(node: ts.Node, source: ts.SourceFile, environment?: ReadonlyMap<string, HookSourceValue>): HookSourceResolution;
  /** Resolve an authored producer call and its captured result. */
  resolveCall(node: ts.CallExpression, source: ts.SourceFile): HookSourceResolution;
  /** Verify the actual lexical producer declaration, not a same-named shadow. */
  isSameSourceBinding(node: ts.CallExpression, source: ts.SourceFile, bindingNode: ts.Node): boolean;
};

type Producer = {
  ref: HookSourceRef;
  module: Module;
  declaration: ts.Node;
  call: ts.CallExpression;
  config: ts.ObjectLiteralExpression;
};

const UNKNOWN = (reason: string): HookSourceValue => ({ kind: 'unknown', reason });

function unwrap(node: ts.Node): ts.Node {
  return ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node)
    ? unwrap(node.expression)
    : node;
}

function propertyName(name: ts.PropertyName | ts.BindingName | undefined): string | null {
  if (!name) return null;
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)
    ? name.text
    : null;
}

function memberName(node: ts.Node): string | null {
  const value = unwrap(node);
  if (ts.isPropertyAccessExpression(value)) return value.name.text;
  if (ts.isElementAccessExpression(value)) {
    const argument = value.argumentExpression;
    return argument && ts.isStringLiteralLike(argument) ? argument.text : null;
  }
  return null;
}

function memberOwner(node: ts.Node): ts.Node | null {
  const value = unwrap(node);
  return ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)
    ? value.expression
    : null;
}

function sourceRef(node: ts.Node, file = node.getSourceFile().fileName): HookSourceRef {
  return { file, start: node.getStart(node.getSourceFile()) };
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionLike(node);
}

/**
 * `def.expose.state(key, handle)`. The runtime's named-state collection reads
 * these views from the same capture frame as the raw `def.state` entries, so a
 * read through an exposed state is a genuine named state handle at runtime.
 */
function isExposeStateCall(owner: ts.Expression, defName: string): boolean {
  if (!ts.isPropertyAccessExpression(owner) || owner.name.text !== 'state') return false;
  const target = unwrap(owner.expression);
  if (!ts.isIdentifier(target) || target.text !== defName) return false;
  return true;
}

function isStringValue(node: ts.Node): node is ts.StringLiteralLike | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

/**
 * The source summary deliberately has no global AST/program cache. A caller
 * gets one context per bounded operation, while parsed modules and producer
 * summaries are shared only inside that operation.
 */
export function createHookSourceSummaryContext(): HookSourceSummaryContext {
  const moduleContext = createHookSourceModuleContext();
  const registeredSources = new Map<string, ts.SourceFile>();
  const producerCache = new Map<string, Producer | null>();
  const summaryCache = new Map<string, HookSourceValue>();
  const summaryStack = new Set<string>();
  const moduleForSource = (source: ts.SourceFile): Module => {
    const module = moduleContext.moduleForSource(source);
    const previous = registeredSources.get(module.file);
    if (previous && previous !== source) {
      producerCache.clear();
      summaryCache.clear();
      summaryStack.clear();
    }
    registeredSources.set(module.file, source);
    return module;
  };

  const registerSource = (source: ts.SourceFile): void => {
    moduleForSource(source);
  };

  const resolveSymbol = (module: Module, name: string): SymbolRef | null =>
    moduleContext.resolveLocal(module, name);

  const isDefineAsHookCall = (call: ts.CallExpression, module: Module): boolean =>
    moduleContext.isDefineAsHookReference(unwrap(call.expression), module);

  const producerForSymbol = (symbol: SymbolRef, stack = new Set<string>()): Producer | null => {
    const key = `${symbol.module.file}:${symbol.declaration.getStart(symbol.module.source)}`;
    const cached = producerCache.get(key);
    if (cached !== undefined) return cached;
    if (stack.has(key)) return null;
    const nextStack = new Set(stack).add(key);
    let declaration = symbol.declaration;
    if (ts.isVariableDeclaration(declaration)) {
      const initializer = declaration.initializer ? unwrap(declaration.initializer) : null;
      if (initializer && ts.isIdentifier(initializer)) {
        const alias = moduleContext.resolveReference(initializer, symbol.module);
        if (alias) {
          const found = producerForSymbol(alias, nextStack);
          producerCache.set(key, found);
          return found;
        }
      }
      if (
        initializer &&
        ts.isCallExpression(initializer) &&
        isDefineAsHookCall(initializer, symbol.module)
      ) {
        const config = initializer.arguments[0] ? unwrap(initializer.arguments[0]) : null;
        if (config && ts.isObjectLiteralExpression(config)) {
          const found = {
            ref: sourceRef(declaration, symbol.module.file),
            module: symbol.module,
            declaration,
            call: initializer,
            config,
          };
          producerCache.set(key, found);
          return found;
        }
      }
    }
    // A declaration may be an exported alias whose symbol points at a source
    // declaration, but never interpret arbitrary functions as producers.
    producerCache.set(key, null);
    return null;
  };

  const producerForCall = (call: ts.CallExpression, source: ts.SourceFile): Producer | null => {
    const callee = unwrap(call.expression);
    const module = moduleForSource(source);
    const symbol = moduleContext.resolveReference(callee, module);
    return symbol ? producerForSymbol(symbol) : null;
  };

  const isSameSourceBinding = (
    call: ts.CallExpression,
    source: ts.SourceFile,
    bindingNode: ts.Node
  ): boolean => {
    const module = moduleForSource(source);
    const symbol = moduleContext.resolveReference(unwrap(call.expression), module);
    if (!symbol || !producerForSymbol(symbol)) return false;
    const held = moduleContext.moduleForSource(bindingNode.getSourceFile());
    return (
      held.file === symbol.module.file &&
      bindingNode.getStart(bindingNode.getSourceFile()) ===
        symbol.declaration.getStart(symbol.module.source)
    );
  };

  const importedHookBinding = (
    module: Module,
    name: string
  ): { local: string; imported: string; specifier: string } | null => {
    for (const statement of module.source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier))
        continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        if (element.name.text !== name) continue;
        const imported = (element.propertyName ?? element.name).text;
        if (
          statement.moduleSpecifier.text === '@proto.ui/core' &&
          (imported === 'tw' || imported === 'defineAsHook')
        )
          continue;
        return { local: name, imported, specifier: statement.moduleSpecifier.text };
      }
    }
    return null;
  };

  const configProperty = (
    config: ts.ObjectLiteralExpression,
    name: string
  ): ts.PropertyAssignment | ts.MethodDeclaration | null =>
    (config.properties.find(
      (property) =>
        (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
        propertyName(property.name) === name
    ) as ts.PropertyAssignment | ts.MethodDeclaration | undefined) ?? null;

  const functionFor = (
    node: ts.Node | undefined,
    module: Module,
    seen = new Set<string>()
  ): { fn: ts.FunctionLikeDeclaration; module: Module } | null => {
    const value = node ? unwrap(node) : null;
    if (!value) return null;
    if (isFunctionLike(value)) return { fn: value, module };
    const symbol = moduleContext.resolveReference(value, module);
    if (!symbol) return null;
    const seenKey = `${symbol.module.file}:${symbol.declaration.getStart(symbol.module.source)}`;
    if (seen.has(seenKey)) return null;
    const nextSeen = new Set(seen).add(seenKey);
    if (isFunctionLike(symbol.declaration))
      return { fn: symbol.declaration, module: symbol.module };
    if (ts.isVariableDeclaration(symbol.declaration) && symbol.declaration.initializer) {
      return functionFor(symbol.declaration.initializer, symbol.module, nextSeen);
    }
    return null;
  };

  const literalString = (
    node: ts.Node | undefined,
    module: Module,
    local: ReadonlyMap<string, string>,
    stack = new Set<string>()
  ): string | null => {
    if (!node) return null;
    const value = unwrap(node);
    if (isStringValue(value)) return value.text;
    if (!ts.isIdentifier(value) || local.has(value.text)) return local.get(value.text) ?? null;
    if (stack.has(value.text)) return null;
    const symbol = moduleContext.resolveReference(value, module);
    if (!symbol || !ts.isVariableDeclaration(symbol.declaration) || !symbol.declaration.initializer)
      return null;
    return literalString(
      symbol.declaration.initializer,
      symbol.module,
      local,
      new Set(stack).add(value.text)
    );
  };

  const memberValue = (value: HookSourceValue, name: string): HookSourceResolution => {
    if (value.kind === 'object') {
      const member = value.members.get(name);
      return member
        ? { matched: true, value: member }
        : { matched: true, value: UNKNOWN(`missing member ${name}`) };
    }
    if (value.kind === 'result') {
      if (name === 'stateHandles') {
        const members = new Map<string, HookSourceValue>();
        for (const [key, state] of value.stateHandles) members.set(key, { kind: 'state', state });
        return { matched: true, value: { kind: 'object', members } };
      }
      // Runtime stores an ordered entry array here, not the contract's type map.
      // Named lookup is modeled below; an unproved physical entry index is not.
      if (name === 'asHooks')
        return { matched: true, value: UNKNOWN('unproven child entry index') };
      if (name === 'getAsHook' || name === 'getAsHookHandle') return { matched: true, value };
      return { matched: true, value: UNKNOWN(`missing result member ${name}`) };
    }
    return { matched: true, value: UNKNOWN(`not an object member ${name}`) };
  };

  const joinValues = (first: HookSourceValue, second: HookSourceValue): HookSourceValue => {
    if (first === second) return first;
    if (first.kind === 'state' && second.kind === 'state') {
      const left = first.state;
      const right = second.state;
      return left.declaredName === right.declaredName &&
        left.variant === right.variant &&
        left.owner.file === right.owner.file && left.owner.start === right.owner.start &&
        left.declaration.file === right.declaration.file &&
        left.declaration.start === right.declaration.start
        ? first
        : UNKNOWN('different reachable state declarations');
    }
    if (first.kind === 'object' && second.kind === 'object') {
      const members = new Map<string, HookSourceValue>();
      for (const [key, value] of first.members) {
        const other = second.members.get(key);
        if (other) members.set(key, joinValues(value, other));
      }
      return {
        kind: 'object', members,
        uncertainKeys: first.uncertainKeys || second.uncertainKeys,
        ...(first.arrayLength === second.arrayLength ? { arrayLength: first.arrayLength } : {}),
      };
    }
    return UNKNOWN('unproved reachable alternative');
  };

  const evaluate = (
    node: ts.Node,
    source: ts.SourceFile,
    environment: ReadonlyMap<string, HookSourceValue> = new Map()
  ): HookSourceResolution => {
    const value = unwrap(node);
    if (ts.isIdentifier(value)) {
      const held = environment.get(value.text);
      return held ? { matched: true, value: held } : { matched: false, value: UNKNOWN('unbound') };
    }
    if (ts.isObjectLiteralExpression(value)) {
      const members = new Map<string, HookSourceValue>();
      let matched = false;
      let uncertainKeys = false;
      const invalidateMembers = () => {
        uncertainKeys = true;
        for (const key of members.keys()) members.set(key, UNKNOWN('possibly overwritten member'));
      };
      for (const property of value.properties) {
        if (ts.isSpreadAssignment(property)) {
          const held = evaluate(property.expression, source, environment);
          matched ||= held.matched;
          if (held.value.kind !== 'object') invalidateMembers();
          else {
            if (held.value.uncertainKeys) invalidateMembers();
            for (const [key, member] of held.value.members) members.set(key, member);
          }
        } else if (ts.isShorthandPropertyAssignment(property)) {
          const held = evaluate(property.name, source, environment);
          matched ||= held.matched;
          members.set(property.name.text, held.value);
        } else if (ts.isPropertyAssignment(property)) {
          const key = ts.isComputedPropertyName(property.name)
            ? literalString(property.name.expression, moduleForSource(source), new Map())
            : propertyName(property.name);
          const held = evaluate(property.initializer, source, environment);
          matched ||= held.matched;
          if (key === null) {
            invalidateMembers();
            continue;
          }
          members.set(key, held.value);
        }
      }
      return { matched, value: { kind: 'object', members, uncertainKeys } };
    }
    if (ts.isConditionalExpression(value)) {
      const condition = unwrap(value.condition);
      if (condition.kind === ts.SyntaxKind.TrueKeyword)
        return evaluate(value.whenTrue, source, environment);
      if (condition.kind === ts.SyntaxKind.FalseKeyword)
        return evaluate(value.whenFalse, source, environment);
      const first = evaluate(value.whenTrue, source, environment);
      const second = evaluate(value.whenFalse, source, environment);
      return { matched: first.matched || second.matched, value: joinValues(first.value, second.value) };
    }
    if (ts.isCallExpression(value)) {
      const property = memberName(value.expression);
      const owner = memberOwner(value.expression);
      if ((property === 'getAsHook' || property === 'getAsHookHandle') && owner) {
        const base = evaluate(owner, source, environment);
        const key = literalString(value.arguments[0], moduleForSource(source), new Map());
        if (
          base.value.kind === 'result' &&
          key !== null &&
          base.value.children.has(key)
        ) {
          const entry = base.value.children.get(key)!;
          return property === 'getAsHook'
            ? { matched: base.matched, value: entry }
            : memberValue(entry, 'handle');
        }
        return { matched: base.matched, value: UNKNOWN(key === null ? 'dynamic child key' : `missing child ${key}`) };
      }
      const producer = producerForCall(value, source);
      if (producer) {
        const captured = summarize(producer);
        return captured.value.kind === 'result'
          ? { matched: true, value: captured.value.handle ?? captured.value }
          : captured;
      }
      const imported = ts.isIdentifier(unwrap(value.expression))
        ? importedHookBinding(moduleForSource(source), unwrap(value.expression).text)
        : null;
      if (imported) return { matched: true, value: UNKNOWN(`unresolved imported hook ${imported.local}`) };
      return { matched: false, value: UNKNOWN('unresolved call') };
    }
    if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
      const owner = memberOwner(value);
      const name = memberName(value);
      if (!owner || name === null) return { matched: false, value: UNKNOWN('dynamic member') };
      const base = evaluate(owner, source, environment);
      if (!base.matched) return base;
      return memberValue(base.value, name);
    }
    if (ts.isArrayLiteralExpression(value)) {
      const members = new Map<string, HookSourceValue>();
      let index: number | null = 0;
      let matched = false;
      for (const element of value.elements) {
        if (ts.isOmittedExpression(element)) {
          if (index !== null) index++;
          continue;
        }
        const held = evaluate(ts.isSpreadElement(element) ? element.expression : element, source, environment);
        matched ||= held.matched;
        if (ts.isSpreadElement(element)) {
          if (index === null || held.value.kind !== 'object' || held.value.arrayLength === undefined) {
            index = null;
            continue;
          }
          for (let offset = 0; offset < held.value.arrayLength; offset++) {
            const member = held.value.members.get(String(offset));
            if (member) members.set(String(index + offset), member);
          }
          index += held.value.arrayLength;
        } else if (index !== null) members.set(String(index++), held.value);
      }
      return {
        matched,
        value: { kind: 'object', members, ...(index === null ? { uncertainKeys: true } : { arrayLength: index }) },
      };
    }
    return { matched: false, value: UNKNOWN('unsupported expression') };
  };

  const summarize = (producer: Producer): HookSourceResolution => {
    const key = `${producer.module.file}:${producer.declaration.getStart(producer.module.source)}`;
    const cached = summaryCache.get(key);
    if (cached) return { matched: true, value: cached };
    if (summaryStack.has(key)) return { matched: true, value: UNKNOWN('producer cycle') };
    summaryStack.add(key);
    const nameProperty = configProperty(producer.config, 'name');
    const name = nameProperty && ts.isPropertyAssignment(nameProperty)
      ? literalString(nameProperty.initializer, producer.module, new Map())
      : null;
    const setupProperty = configProperty(producer.config, 'setup');
    const setupExpression = setupProperty
      ? ts.isPropertyAssignment(setupProperty)
        ? setupProperty.initializer
        : setupProperty
      : undefined;
    const setup = functionFor(setupExpression, producer.module);
    const stateHandles = new Map<string, HookSourceState>();
    const children = new Map<string, HookSourceValue>();
    const activeSetupFunctions = new Set<string>();

    const collectSetup = (fn: ts.FunctionLikeDeclaration, module: Module, active: Set<string>): void => {
      const functionKey = `${module.file}:${fn.getStart(module.source)}`;
      if (activeSetupFunctions.has(functionKey)) return;
      activeSetupFunctions.add(functionKey);
      const strings = new Map<string, string>();
      const localNames = new Set<string>();
      for (const parameter of fn.parameters) {
        if (ts.isIdentifier(parameter.name)) localNames.add(parameter.name.text);
      }

      const walk = (node: ts.Node): void => {
        if (node !== fn && isFunctionLike(node)) return;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
          localNames.add(node.name.text);
          const literal = literalString(node.initializer, module, strings);
          if (literal !== null) strings.set(node.name.text, literal);
          const initializer = unwrap(node.initializer);
          if (ts.isIdentifier(initializer) && active.has(initializer.text)) active.add(node.name.text);
        }
        if (ts.isCallExpression(node)) {
          const expression = unwrap(node.expression);
          const stateOwner = memberOwner(expression);
          const stateContainer = stateOwner ? memberOwner(stateOwner) : null;
          const stateMethod = memberName(expression);
          if (
            stateOwner &&
            stateContainer &&
            ts.isIdentifier(unwrap(stateContainer)) &&
            active.has(unwrap(stateContainer).text) &&
            stateMethod &&
            (memberName(stateOwner) === 'state' ||
              // The runtime's `collectNamedStateHandles` reads the raw
              // `def.state` captures and the `def.expose.state` views from
              // the same frame, so an exposed state is a named state handle.
              isExposeStateCall(stateOwner, unwrap(stateContainer).text))
          ) {
            if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
              const declared = literalString(node.arguments[0], module, strings);
              if (declared !== null) {
                stateHandles.set(declared, {
                  owner: producer.ref,
                  declaration: sourceRef(node),
                  declaredName: declared,
                  variant: stateMethod,
                });
              }
            }
          }
          const calleeName = ts.isIdentifier(expression) ? expression.text : null;
          const childProducer =
            calleeName && localNames.has(calleeName) ? null : producerForCall(node, module.source);
          if (childProducer) {
            const child = summarize(childProducer);
            if (child.value.kind === 'result') {
              children.set(child.value.name, {
                kind: 'object',
                members: new Map<string, HookSourceValue>([
                  ['result', child.value],
                  ['handle', child.value.handle ?? child.value],
                ]),
              });
            } else if (child.value.kind !== 'unknown') {
              const childName = childProducer.config.properties
                .map((property) =>
                  (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
                  propertyName(property.name) === 'name' &&
                  ts.isPropertyAssignment(property)
                    ? literalString(property.initializer, childProducer.module, new Map())
                    : null
                )
                .find((candidate): candidate is string => candidate !== null);
              if (childName) children.set(childName, child.value);
            }
          } else {
            const callee = ts.isIdentifier(expression)
              ? expression
              : null;
            if (callee && node.arguments.length > 0) {
              const argument = unwrap(node.arguments[0]);
              if (ts.isIdentifier(argument) && active.has(argument.text)) {
                const helper = functionFor(callee, module);
                if (helper) {
                  if (
                    helper.fn.asteriskToken ||
                    helper.fn.modifiers?.some(
                      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
                    )
                  ) {
                    ts.forEachChild(node, walk);
                    return;
                  }
                  const helperActive = new Set<string>();
                  const first = helper.fn.parameters[0];
                  if (first && ts.isIdentifier(first.name)) helperActive.add(first.name.text);
                  collectSetup(helper.fn, helper.module, helperActive);
                }
              }
            }
          }
        }
        ts.forEachChild(node, walk);
      };

      // The function parameter is the active setup definition. Calls to
      // synchronous helpers receive a fresh active parameter above; callback
      // bodies never enter this walk and therefore cannot leak later writes.
      const first = fn.parameters[0];
      if (first && ts.isIdentifier(first.name)) active.add(first.name.text);
      if (fn.body) walk(fn.body);
    };

    if (setup) collectSetup(setup.fn, setup.module, new Set());
    const result: HookSourceValue = {
      kind: 'result',
      producer: producer.ref,
      name: name ?? '<unknown-hook>',
      stateHandles,
      children,
    };

    const projectProperty = configProperty(producer.config, 'projectHandle');
    const projectExpression = projectProperty
      ? ts.isPropertyAssignment(projectProperty)
        ? projectProperty.initializer
        : projectProperty
      : undefined;
    const project = functionFor(projectExpression, producer.module);
    if (projectProperty) result.handle = UNKNOWN('unproved public projection');
    if (project && !project.fn.asteriskToken && !project.fn.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
    )) {
      const parameter = project.fn.parameters[0];
      const environment = new Map<string, HookSourceValue>();
      for (const parameter of project.fn.parameters) {
        if (ts.isIdentifier(parameter.name))
          environment.set(parameter.name.text, UNKNOWN('unproved projector argument'));
      }
      if (parameter && ts.isIdentifier(parameter.name)) environment.set(parameter.name.text, result);
      const returns: HookSourceResolution[] = [];
      let unprovedCompletion = false;
      const collectReturns = (node: ts.Node, scope: Map<string, HookSourceValue>): boolean => {
        if (ts.isBlock(node)) {
          const block = new Map(scope);
          for (const statement of node.statements) {
            if (!collectReturns(statement, block)) return false;
          }
          return true;
        }
        if (ts.isReturnStatement(node)) {
          returns.push(node.expression
            ? evaluate(node.expression, project.module.source, scope)
            : { matched: false, value: UNKNOWN('void projection') });
          return false;
        }
        if (ts.isThrowStatement(node)) return false;
        if (ts.isIfStatement(node)) {
          const condition = unwrap(node.expression);
          if (condition.kind === ts.SyntaxKind.TrueKeyword)
            return collectReturns(node.thenStatement, scope);
          if (condition.kind === ts.SyntaxKind.FalseKeyword)
            return node.elseStatement ? collectReturns(node.elseStatement, scope) : true;
          const first = collectReturns(node.thenStatement, new Map(scope));
          const second = node.elseStatement
            ? collectReturns(node.elseStatement, new Map(scope))
            : true;
          // Continuing branches may have changed a binding. Until that join is
          // represented, do not certify a later read using its old snapshot.
          if (first || second) unprovedCompletion = true;
          return first || second;
        }
        if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) {
              unprovedCompletion = true;
              continue;
            }
            scope.set(declaration.name.text, declaration.initializer
              ? evaluate(declaration.initializer, project.module.source, scope).value
              : UNKNOWN('uninitialized projector local'));
          }
          return true;
        }
        if (ts.isFunctionDeclaration(node)) {
          if (node.name) scope.set(node.name.text, UNKNOWN('projector local function'));
          return true;
        }
        if (ts.isEmptyStatement(node)) return true;
        // Calls, writes, loops and try/finally may alter values or completion;
        // a syntactic return inside them is not a proven public caller handle.
        unprovedCompletion = true;
        return true;
      };
      if (project.fn.body) {
        if (ts.isBlock(project.fn.body)) {
          const fallsThrough = collectReturns(project.fn.body, environment);
          if (fallsThrough) returns.push({ matched: false, value: UNKNOWN('projection falls through') });
        } else returns.push(evaluate(project.fn.body, project.module.source, environment));
      }
      if (!unprovedCompletion && returns.length > 0) {
        let returned = returns[0].value;
        for (let index = 1; index < returns.length; index++)
          returned = joinValues(returned, returns[index].value);
        result.handle = returned;
      }
    }
    summaryCache.set(key, result);
    summaryStack.delete(key);
    return { matched: true, value: result };
  };

  const resolveCall = (node: ts.CallExpression, source: ts.SourceFile): HookSourceResolution =>
    evaluate(node, source, new Map());

  return {
    registerSource,
    resolve: evaluate,
    resolveCall,
    isSameSourceBinding,
  };
}

