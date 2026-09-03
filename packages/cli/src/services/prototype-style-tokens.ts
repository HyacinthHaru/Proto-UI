// @ts-nocheck
// Recursive ts.Node AST walking extracted from the legacy CLI so source-token
// collection is shared by both user commands and generated preset manifests.
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import { canonicalizeLoweredVariants } from '../generated/lowered-variant-order.js';

export async function collectProtoStyleTokens(root) {
  const files = await collectSourceFiles(root);
  const tokens = new Set();
  const moduleCache = new Map();

  for (const file of files) {
    const sourceFile = await parseSourceFile(file);
    const scope = createScope();
    await applyImportBindings(file, sourceFile, scope, moduleCache, []);
    walk(sourceFile, scope, tokens, collectExposures(sourceFile));
  }

  return Array.from(tokens).sort();
}

async function parseSourceFile(file) {
  const sourceText = await fs.readFile(file, 'utf8');
  return ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(file)
  );
}

// Named imports from relative modules (e.g. a local style.ts holding shared
// token constants) are resolved so cross-file token constants stay visible
// to tw(...) calls and rule intent extraction.
async function applyImportBindings(file, sourceFile, scope, moduleCache, stack) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const specifier = stmt.moduleSpecifier;
    if (!ts.isStringLiteralLike(specifier)) continue;
    if (!specifier.text.startsWith('.')) continue;
    const resolved = await resolveModuleFile(path.dirname(file), specifier.text);
    if (!resolved || stack.includes(resolved)) continue;
    const clause = stmt.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const bindings = await loadModuleBindings(resolved, moduleCache, stack);
    for (const element of clause.namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      const value = bindings.get(importedName);
      if (value) scope.bindings.set(element.name.text, value);
    }
  }
}

async function resolveModuleFile(dir, specifier) {
  const base = path.resolve(dir, specifier);
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
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function loadModuleBindings(file, moduleCache, stack) {
  const cached = moduleCache.get(file);
  if (cached) return cached;
  // Insert before recursing so circular imports terminate.
  const bindings = new Map();
  moduleCache.set(file, bindings);
  const sourceFile = await parseSourceFile(file);
  const scope = createScope();
  await applyImportBindings(file, sourceFile, scope, moduleCache, [...stack, file]);
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      // An imported module holds token constants, not this component's states.
      registerDeclaration(decl, scope, undefined);
    }
  }
  for (const [name, value] of scope.bindings) bindings.set(name, value);
  return bindings;
}
function createScope(parent = null, node = null) {
  return { parent, bindings: new Map(), node };
}

function walk(node, scope, tokens, exposures) {
  if (createsScope(node)) {
    const nextScope = createScope(scope, node);

    if (hasStatements(node)) {
      // Sequential, so a legal redeclaration still registers each binding for
      // the statements that follow it. Exposures need no ordering because they
      // are collected from the whole source before the walk begins.
      for (const stmt of node.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            registerDeclaration(decl, nextScope, exposures);
            if (decl.initializer) walk(decl.initializer, nextScope, tokens, exposures);
          }
          continue;
        }
        walk(stmt, nextScope, tokens, exposures);
      }
      return;
    }

    ts.forEachChild(node, (child) => walk(child, nextScope, tokens, exposures));
    return;
  }

  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'tw'
  ) {
    for (const arg of node.arguments) {
      const value = resolveExpression(arg, scope);
      for (const token of value.strings.flatMap(splitTokens)) {
        tokens.add(token);
      }
    }
  }

  if (ts.isCallExpression(node) && isPropertyNamed(node.expression, 'rule')) {
    collectRuleVariantTokens(node, scope, tokens, exposures);
  }

  ts.forEachChild(node, (child) => walk(child, scope, tokens, exposures));
}

function createsScope(node) {
  return (
    ts.isSourceFile(node) ||
    ts.isBlock(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

function hasStatements(node) {
  return ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node);
}

function registerDeclaration(decl, scope, exposures) {
  if (!decl.initializer) return;

  if (ts.isIdentifier(decl.name)) {
    const binding = resolveBinding(decl.initializer, scope);
    scope.bindings.set(decl.name.text, applyExposure(decl.name.text, binding, scope, exposures));
    return;
  }

  if (ts.isObjectBindingPattern(decl.name)) {
    const value = resolveBinding(decl.initializer, scope);
    if (!value.semanticMap) return;

    for (const element of decl.name.elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const propertyName = element.propertyName
        ? getPropertyName(element.propertyName)
        : element.name.text;
      if (!propertyName) continue;

      const semantic = value.semanticMap.get(propertyName);
      if (!semantic) continue;
      scope.bindings.set(element.name.text, asSemanticValue(semantic));
    }
  }
}

function resolveExpression(node, scope) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return asStringValue([node.text]);
  }

  if (ts.isTemplateExpression(node)) {
    const parts = [node.head.text];
    for (const span of node.templateSpans) {
      const value = resolveExpression(span.expression, scope);
      if (value.single == null) return emptyValue();
      parts.push(value.single, span.literal.text);
    }
    return asStringValue([parts.join('')]);
  }

  if (ts.isArrayLiteralExpression(node)) {
    const parts = [];
    for (const element of node.elements) {
      const value = resolveExpression(element, scope);
      if (!value.single) return emptyValue();
      parts.push(value.single);
    }
    // Keep the element list: a comma-joined string cannot tell an element
    // boundary from a comma inside an arbitrary token such as
    // `transition-[color,box-shadow]`.
    return { ...asStringValue([parts.join(',')]), elements: parts };
  }

  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'join'
  ) {
    return resolveJoinCall(node, scope);
  }

  if (ts.isIdentifier(node)) {
    return lookup(node.text, scope);
  }

  if (ts.isCallExpression(node)) {
    const stateHandles = resolveKnownAsHookStateHandles(node);
    if (stateHandles) return asSemanticMapValue(stateHandles);
  }

  if (ts.isPropertyAccessExpression(node) && node.name.text === 'stateHandles') {
    const stateHandles = resolveKnownAsHookStateHandles(node.expression);
    if (stateHandles) return asSemanticMapValue(stateHandles);
    if (ts.isIdentifier(node.expression)) {
      const hookHandle = lookup(node.expression.text, scope);
      if (hookHandle.semanticMap) return hookHandle;
    }
  }

  // `asHook().stateHandles.checked` bound straight to a name. Without this the
  // leaf resolves to nothing and `w.state(checked)` emits no variant, while the
  // same read through a destructure or through the bag resolves fine.
  if (ts.isPropertyAccessExpression(node)) {
    const owner = resolveExpression(node.expression, scope);
    const semantic = owner.semanticMap?.get(node.name.text);
    if (semantic) return asSemanticValue(semantic);
  }

  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    // `asHook().stateHandles!` — the bag is optional on the hook result type,
    // so authors reach it through a non-null assertion.
    ts.isNonNullExpression(node)
  ) {
    return resolveExpression(node.expression, scope);
  }

  if (ts.isObjectLiteralExpression(node)) {
    const entries = new Map();
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = getPropertyName(prop.name);
        if (!key) continue;
        const value = resolveExpression(prop.initializer, scope);
        if (value.strings.length > 0) entries.set(key, value.strings);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        const value = lookup(prop.name.text, scope);
        if (value.strings.length > 0) entries.set(prop.name.text, value.strings);
      }
    }
    return asMapValue(entries);
  }

  if (ts.isElementAccessExpression(node)) {
    const base = resolveExpression(node.expression, scope);
    if (!base.map) return emptyValue();

    if (node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) {
      return asStringValue(base.map.get(node.argumentExpression.text) ?? []);
    }

    const out = new Set();
    for (const strings of base.map.values()) {
      for (const value of strings) out.add(value);
    }
    return asStringValue(Array.from(out));
  }

  if (ts.isConditionalExpression(node)) {
    const values = new Set([
      ...resolveExpression(node.whenTrue, scope).strings,
      ...resolveExpression(node.whenFalse, scope).strings,
    ]);
    return asStringValue(Array.from(values));
  }

  return emptyValue();
}

function resolveJoinCall(node, scope) {
  const separatorArg = node.arguments[0];
  const separator =
    separatorArg &&
    (ts.isStringLiteralLike(separatorArg) || ts.isNoSubstitutionTemplateLiteral(separatorArg))
      ? separatorArg.text
      : ',';
  const base = resolveExpression(node.expression.expression, scope);
  if (base.elements) return asStringValue([base.elements.join(separator)]);
  if (!base.single) return emptyValue();
  return asStringValue([base.single.split(',').join(separator)]);
}

function lookup(name, scope) {
  let current = scope;
  while (current) {
    const value = current.bindings.get(name);
    if (value) return value;
    current = current.parent;
  }
  return emptyValue();
}

function resolveBinding(node, scope) {
  const semantic = resolveSemanticBinding(node);
  const value = resolveExpression(node, scope);
  const declared = resolveDeclaredStateName(node, scope);
  const withName = declared ? { ...value, stateName: declared } : value;
  return semantic ? { ...withName, semantic } : withName;
}

/**
 * `def.state.bool('hidden', …)` — the name the prototype declared. `StateKernel`
 * stores it as `__stateSemantic`, and `ExposeStateWebModuleImpl` maps that
 * before it would fall back to the expose key, so this is the name the Web
 * attribute comes from.
 */
/** Parentheses, `as`, and non-null assertions name the same expression. */
function unwrapTransparent(node) {
  return ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node)
    ? unwrapTransparent(node.expression)
    : node;
}

/** `x.name` and `x['name']` reach the same member. */
function memberIs(node, name) {
  const target = unwrapTransparent(node);
  if (ts.isPropertyAccessExpression(target)) return target.name.text === name;
  if (ts.isElementAccessExpression(target)) {
    const argument = target.argumentExpression;
    return Boolean(argument) && ts.isStringLiteralLike(argument) && argument.text === name;
  }
  return false;
}

function memberOwner(node) {
  const target = unwrapTransparent(node);
  return ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)
    ? target.expression
    : null;
}

function resolveDeclaredStateName(initializer, scope) {
  const node = unwrapTransparent(initializer);
  if (!ts.isCallExpression(node)) return null;
  const owner = memberOwner(node.expression);
  if (!owner || !memberIs(owner, 'state')) return null;
  const first = node.arguments[0];
  if (!first) return null;
  // The name may be a constant the runtime resolves to a real string. A name
  // this cannot evaluate is still a name at runtime, so it is reported as
  // unknown rather than absent — the expose key must not stand in for it.
  const resolved = ts.isStringLiteralLike(first)
    ? first.text
    : resolveExpression(first, scope).single;
  return resolved ?? UNKNOWN_STATE_NAME;
}

/** A `def.state.*` declaration whose name the extractor cannot evaluate. */
const UNKNOWN_STATE_NAME = Symbol('unknown-state-name');

/**
 * The same normalization `createExposeStateWebNameMap` applies to an
 * unannotated exposed key before it becomes a data attribute.
 */
function exposedDataAttributeName(key) {
  return key
    .trim()
    .replace(/\s+/g, '-')
    .replace(/\./g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Every `def.expose.state(key, handle)` in a source, resolved to the handle it
 * ultimately names.
 *
 * Exposure is component-wide at runtime rather than block-scoped, and the
 * exposed-state map is built after setup returns, so neither the block a call
 * sits in nor its position relative to a rule decides whether the rule lowers.
 * Aliases are followed because two references to one handle carry one state id.
 */
function collectExposures(root) {
  // Alias edges carry their scope and source position, so two sibling scopes
  // may bind the same name and a later redeclaration cannot rewrite what an
  // earlier expose call captured.
  const aliasEdges = [];
  const declaredIn = new Map();
  const exposures = [];

  const unwrapExpression = (node) =>
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node)
      ? unwrapExpression(node.expression)
      : node;

  const namesExposeState = (callee) => {
    if (ts.isPropertyAccessExpression(callee)) {
      return callee.name.text === 'state' && namesExposeOwner(callee.expression);
    }
    if (ts.isElementAccessExpression(callee)) {
      const argument = callee.argumentExpression;
      return (
        Boolean(argument) &&
        ts.isStringLiteralLike(argument) &&
        argument.text === 'state' &&
        namesExposeOwner(callee.expression)
      );
    }
    return false;
  };

  const namesExpose = (callee) => {
    if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 'expose';
    if (ts.isElementAccessExpression(callee)) {
      const argument = callee.argumentExpression;
      return Boolean(argument) && ts.isStringLiteralLike(argument) && argument.text === 'expose';
    }
    return false;
  };

  const namesExposeOwner = (node) => {
    const owner = unwrapExpression(node);
    if (ts.isPropertyAccessExpression(owner)) return owner.name.text === 'expose';
    if (ts.isElementAccessExpression(owner)) {
      const argument = owner.argumentExpression;
      return Boolean(argument) && ts.isStringLiteralLike(argument) && argument.text === 'expose';
    }
    return false;
  };

  // `const controls = { ready }; def.expose.state('ready', controls.ready)`
  /**
   * Every handle an initializer may end up naming. A conditional selects one at
   * runtime, so both are recorded: over-approximating gives each candidate its
   * variant, which is safe, while recording neither leaves the chosen one
   * without CSS.
   */
  const aliasTargets = (node) => {
    const value = unwrapExpression(node);
    if (ts.isIdentifier(value)) return [value.text];
    if (ts.isConditionalExpression(value)) {
      return [...aliasTargets(value.whenTrue), ...aliasTargets(value.whenFalse)];
    }
    return [];
  };

  const objectMembers = new Map();

  const resolveHandleIdentifier = (node) => {
    const value = unwrapExpression(node);
    if (ts.isIdentifier(value)) return value.text;
    const owner = memberOwner(value);
    if (!owner) return null;
    const base = unwrapExpression(owner);
    if (!ts.isIdentifier(base)) return null;
    const members = objectMembers.get(base.text);
    if (!members) return null;
    for (const [key, target] of members) {
      if (memberIs(value, key)) return target;
    }
    return null;
  };

  const visit = (node, chain) => {
    // Every scope the extractor itself creates, so two sibling blocks in one
    // setup may reuse an alias name without either edge overwriting the other.
    const nextChain = createsScope(node) ? [node, ...chain] : chain;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      // `var` binds to the enclosing function however deeply it is nested, so a
      // redeclaration inside a block is the same binding seen from outside it.
      const isVar =
        ts.isVariableDeclarationList(node.parent) &&
        !(node.parent.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const));
      const enclosingFunctionBody = isVar
        ? ts.findAncestor(node, (candidate) => ts.isFunctionLike(candidate))?.body
        : undefined;
      const owner =
        (enclosingFunctionBody && nextChain.includes(enclosingFunctionBody)
          ? enclosingFunctionBody
          : nextChain[0]) ?? root;
      if (!declaredIn.has(owner)) declaredIn.set(owner, new Set());
      declaredIn.get(owner).add(node.name.text);
      if (node.initializer) {
        const literal = unwrapExpression(node.initializer);
        if (ts.isObjectLiteralExpression(literal)) {
          const members = new Map();
          for (const property of literal.properties) {
            if (ts.isShorthandPropertyAssignment(property)) {
              members.set(property.name.text, property.name.text);
            } else if (
              ts.isPropertyAssignment(property) &&
              (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
            ) {
              const value = unwrapExpression(property.initializer);
              if (ts.isIdentifier(value)) members.set(property.name.text, value.text);
            }
          }
          objectMembers.set(node.name.text, members);
        }
        for (const target of aliasTargets(node.initializer)) {
          aliasEdges.push({ owner, name: node.name.text, target, at: node.getStart() });
        }
      }
    }
    // A plain reassignment moves the handle just as a declaration does.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      // An assignment does not declare, so it belongs to whichever scope owns
      // the binding — otherwise a reassignment inside a nested block would be
      // invisible to an exposure written outside it.
      const owner =
        [...nextChain, root].find((candidate) => declaredIn.get(candidate)?.has(node.left.text)) ??
        nextChain[0] ??
        root;
      for (const target of aliasTargets(node.right)) {
        aliasEdges.push({ owner, name: node.left.text, target, at: node.getStart() });
      }
    }
    if (
      ts.isCallExpression(node) &&
      (namesExposeState(unwrapExpression(node.expression)) ||
        // `def.expose('ready', state)` — the generic entry wraps a state handle,
        // so the Web optimizer lowers rules on it just the same.
        namesExpose(unwrapExpression(node.expression)))
    ) {
      const [nameArg, handleArg] = node.arguments;
      const handle = handleArg && resolveHandleIdentifier(handleArg);
      if (nameArg && handle) {
        exposures.push({
          handle,
          key: nameArg,
          chain: [...nextChain, root],
          at: node.getStart(),
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, nextChain));
  };
  visit(root, []);

  // The edge in effect where the exposure was written, nearest scope first.
  // Every edge written at the latest position at or before `at`, nearest scope
  // first. A conditional contributes several edges at one position.
  const lookupAliases = (name, chain, at) => {
    for (const owner of chain) {
      const candidates = aliasEdges.filter(
        (edge) => edge.owner === owner && edge.name === name && edge.at <= at
      );
      if (candidates.length === 0) continue;
      const latest = Math.max(...candidates.map((edge) => edge.at));
      return candidates.filter((edge) => edge.at === latest);
    }
    return [];
  };

  // Each hop resolves where that edge was created, not where the exposure was
  // written: an alias captured its target at its own initialization, so a later
  // redeclaration of the intermediate name cannot retarget it.
  // A conditional alias records one edge per branch, so resolution fans out
  // rather than picking one: whichever handle the runtime selects has a variant.
  const rootNames = (name, chain, at, seen = new Set()) => {
    if (seen.has(name)) return [name];
    const edges = lookupAliases(name, chain, at);
    if (edges.length === 0) return [name];
    const next = new Set([...seen, name]);
    return edges.flatMap((edge) => rootNames(edge.target, chain, edge.at, next));
  };

  // An exposure names a binding, and a binding lives in one scope. Recording it
  // by name alone would let a sibling prototype that reuses the same local name
  // inherit an exposure its own runtime never registers.
  const declaringScope = (name, chain) =>
    chain.find((candidate) => declaredIn.get(candidate)?.has(name)) ?? chain[chain.length - 1];

  const byScope = new Map();
  for (const { handle, key, chain, at } of exposures) {
    // Both the alias and the handle it names carry the same state id.
    for (const name of new Set([handle, ...rootNames(handle, chain, at)])) {
      const owner = declaringScope(name, chain);
      if (!owner) continue;
      const scoped = byScope.get(owner) ?? new Map();
      if (!scoped.has(name)) scoped.set(name, key);
      byScope.set(owner, scoped);
    }
  }
  return byScope;
}

/**
 * The Web attribute comes from `__stateSemantic` — the declared name — and only
 * falls back to the expose key, so a state exposed under a different key still
 * lowers to its declared name. A handle that already carries an official
 * semantic keeps it, which is the same precedence the runtime applies.
 */
function applyExposure(name, binding, scope, exposures) {
  if (!exposures || binding.semantic) return binding;
  let key;
  for (let current = scope; current && key === undefined; current = current.parent) {
    if (current.node) key = exposures.get(current.node)?.get(name);
  }
  if (!key) return binding;
  // `__stateSemantic` wins at runtime, so a declared name this cannot read
  // leaves no safe selector to emit; the expose key would be the wrong one.
  if (binding.stateName === UNKNOWN_STATE_NAME) return binding;
  const exposedKey = ts.isStringLiteralLike(key) ? key.text : resolveExpression(key, scope).single;
  const attribute = exposedDataAttributeName(binding.stateName ?? exposedKey ?? '');
  if (!attribute) return binding;
  return { ...binding, semantic: `data-[${attribute}]` };
}

function resolveSemanticBinding(node) {
  if (
    !ts.isCallExpression(node) ||
    !isPropertyAccessChain(node.expression, ['state', 'fromInteraction'])
  ) {
    if (
      !ts.isCallExpression(node) ||
      !isPropertyAccessChain(node.expression, ['state', 'fromAccessibility'])
    ) {
      return null;
    }
  }

  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  const kind = node.expression.name.text === 'fromInteraction' ? 'interaction' : 'accessibility';
  const firstArg = node.arguments[0];
  if (!firstArg || !ts.isStringLiteralLike(firstArg)) return null;
  const name = firstArg.text;

  if (kind === 'interaction') {
    return (
      {
        hovered: 'hover',
        pressed: 'active',
        disabled: 'data-[disabled]',
        focused: 'data-[focused]',
        focusVisible: 'data-[focus-visible]',
      }[name] ?? null
    );
  }

  return (
    {
      expanded: 'data-[expanded]',
      invalid: 'data-[invalid]',
      selected: 'data-[selected]',
      checked: 'data-[checked]',
      current: 'data-[current]',
    }[name] ?? null
  );
}

function resolveKnownAsHookStateHandles(node) {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return null;

  const hookName = node.expression.text;
  const COMMAND_STATE_VARIANTS = [
    ['disabled', 'data-[disabled]'],
    ['hovered', 'data-[hovered]'],
    ['focused', 'data-[focused]'],
    ['focusVisible', 'data-[focus-visible]'],
    ['pressed', 'data-[pressed]'],
  ];

  if (
    hookName === 'asDialogTrigger' ||
    hookName === 'asDialogClose' ||
    hookName === 'asDropdownTrigger' ||
    hookName === 'asHoverCardTrigger'
  ) {
    return new Map(COMMAND_STATE_VARIANTS);
  }

  if (hookName === 'asSelectTrigger') {
    // Select Trigger is the one command surface that also reports whether it is
    // still showing its placeholder.
    return new Map([...COMMAND_STATE_VARIANTS, ['placeholder', 'data-[placeholder]']]);
  }

  if (hookName === 'asDropdownItem') {
    return new Map([...COMMAND_STATE_VARIANTS, ['active', 'data-[active]']]);
  }

  if (hookName === 'asSelectItem') {
    return new Map([
      ...COMMAND_STATE_VARIANTS,
      ['active', 'data-[active]'],
      ['selected', 'data-[selected]'],
    ]);
  }

  if (hookName === 'asButton') {
    return new Map([
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['pressed', 'data-[pressed]'],
      ['focusVisible', 'data-[focus-visible]'],
    ]);
  }

  if (hookName === 'asCheckboxRoot') {
    return new Map([
      ['checked', 'data-[checked]'],
      ['indeterminate', 'data-[indeterminate]'],
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['pressed', 'data-[pressed]'],
    ]);
  }

  if (hookName === 'asCheckboxIndicator') {
    return new Map([
      ['checked', 'data-[checked]'],
      ['indeterminate', 'data-[indeterminate]'],
    ]);
  }

  if (hookName === 'asScrollAreaViewport') {
    return new Map([
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
    ]);
  }

  if (hookName === 'asSwitchRoot') {
    return new Map([
      ['checked', 'data-[checked]'],
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['pressed', 'data-[pressed]'],
    ]);
  }

  if (hookName === 'asSwitchThumb') {
    return new Map([
      ['checked', 'data-[checked]'],
      ['disabled', 'data-[disabled]'],
    ]);
  }

  if (hookName === 'asToggle') {
    return new Map([
      ['active', 'data-[active]'],
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['pressed', 'data-[pressed]'],
    ]);
  }

  if (hookName === 'asTabsTrigger') {
    return new Map([
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['pressed', 'data-[pressed]'],
      ['selected', 'data-[selected]'],
    ]);
  }

  if (hookName === 'asTabsContent') {
    return new Map([
      ['current', 'data-[current]'],
      ['hidden', 'data-[hidden]'],
    ]);
  }

  if (
    hookName === 'asDialogMask' ||
    hookName === 'asDialogContent' ||
    hookName === 'asHoverCardContent'
  ) {
    return new Map([['open', 'data-[open]']]);
  }

  if (hookName === 'asDialogTrigger' || hookName === 'asDialogClose') {
    return new Map([
      ['disabled', 'data-[disabled]'],
      ['hovered', 'data-[hovered]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['pressed', 'data-[pressed]'],
    ]);
  }

  if (hookName === 'asTextareaRoot') {
    return new Map([
      ['value', 'data-[value]'],
      ['disabled', 'data-[disabled]'],
      ['readOnly', 'data-[read-only]'],
      ['focused', 'data-[focused]'],
      ['focusVisible', 'data-[focus-visible]'],
      ['composing', 'data-[composing]'],
    ]);
  }

  if (hookName === 'asAsyncRegionRoot') {
    return new Map([['busy', 'data-[busy]']]);
  }

  if (hookName === 'asSeparatorRoot') {
    return new Map([['orientation', 'data-[orientation]']]);
  }

  return null;
}

/**
 * Asks the same resolver the extractor uses, so a coverage gate cannot drift by
 * keeping its own copy of the hook list. Returns null when the hook has no
 * entry, which is exactly the case where a rule keyed on its state handles
 * silently produces no variant token.
 */
export function loweredHookStates(hookName) {
  const probe = ts.factory.createCallExpression(
    ts.factory.createIdentifier(hookName),
    undefined,
    []
  );
  const resolved = resolveKnownAsHookStateHandles(probe);
  return resolved ? new Map(resolved) : null;
}

function collectRuleVariantTokens(node, scope, tokens, exposures) {
  const config = node.arguments[0];
  if (!config || !ts.isObjectLiteralExpression(config)) return;

  const whenProp = config.properties.find(
    (prop) => ts.isPropertyAssignment(prop) && getPropertyName(prop.name) === 'when'
  );
  const intentProp = config.properties.find(
    (prop) => ts.isPropertyAssignment(prop) && getPropertyName(prop.name) === 'intent'
  );
  if (
    !whenProp ||
    !intentProp ||
    !ts.isPropertyAssignment(whenProp) ||
    !ts.isPropertyAssignment(intentProp)
  ) {
    return;
  }

  const variants = analyzeWhenVariants(whenProp.initializer, scope);
  if (variants.length === 0) return;

  const intentTokens = collectTwTokens(intentProp.initializer, scope, exposures);
  for (const token of intentTokens) {
    tokens.add(`${variants.join(':')}:${token}`);
  }
}

function analyzeWhenVariants(node, scope) {
  const out = new Set();

  visit(node);
  const variants = canonicalizeLoweredVariants(Array.from(out));
  if (variants.length > 0 && variants.every(isNegativeDataVariant)) return [];
  return variants;

  function visit(current) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      visit(current.body);
      return;
    }

    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current)
    ) {
      visit(current.expression);
      return;
    }

    if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
      const method = current.expression.name.text;

      if (method === 'all' || method === 'any') {
        for (const arg of current.arguments) visit(arg);
        return;
      }

      if (method === 'eq') {
        const subject = current.expression.expression;
        if (ts.isCallExpression(subject) && ts.isPropertyAccessExpression(subject.expression)) {
          const subjectMethod = subject.expression.name.text;
          if (subjectMethod === 'state') {
            const firstArg = subject.arguments[0];
            const expected = current.arguments[0];
            if (firstArg) {
              const semantic = resolveStateHandleSemantic(firstArg, scope);
              const variant = resolveStateEqVariant(semantic, expected);
              if (variant) out.add(variant);
            }
            return;
          }

          if (subjectMethod === 'meta') {
            const key = subject.arguments[0];
            const value = current.arguments[0];
            if (
              key &&
              value &&
              ts.isStringLiteralLike(key) &&
              ts.isStringLiteralLike(value) &&
              key.text === 'colorScheme' &&
              value.text === 'dark'
            ) {
              out.add('dark');
            }
          }
        }
      }
    }

    ts.forEachChild(current, visit);
  }
}

function resolveStateHandleSemantic(node, scope) {
  // `w.state(checked!)` and its `as`/parenthesized equivalents name the same
  // handle as the bare identifier.
  if (
    ts.isNonNullExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    return resolveStateHandleSemantic(node.expression, scope);
  }
  if (ts.isIdentifier(node)) return lookup(node.text, scope).semantic ?? null;
  if (!ts.isPropertyAccessExpression(node)) return null;

  const owner = resolveExpression(node.expression, scope);
  return owner.semanticMap?.get(node.name.text) ?? null;
}

function resolveStateEqVariant(semantic, expected) {
  if (!semantic) return null;
  if (!expected) return null;
  if (expected.kind === ts.SyntaxKind.TrueKeyword) return semantic;
  if (expected.kind === ts.SyntaxKind.FalseKeyword) return negateDataVariant(semantic);
  if (ts.isStringLiteralLike(expected)) {
    const match = semantic.match(/^data-\[([a-zA-Z0-9-]+)\]$/);
    if (!match || !/^[a-zA-Z0-9_-]+$/.test(expected.text)) return null;
    return `data-[${match[1]}=${expected.text}]`;
  }
  // `number.discrete` bindings lower by stringifying the literal, the same way
  // enum and string bindings do.
  const numeric = signedNumericText(expected);
  if (numeric !== null) {
    const match = semantic.match(/^data-\[([a-zA-Z0-9-]+)\]$/);
    if (!match) return null;
    return `data-[${match[1]}=${numeric}]`;
  }
  return null;
}

/** `-1` parses as a prefix unary expression rather than a numeric literal. */
function signedNumericText(node) {
  // The runtime lowers with `String(literal)`, so the canonical value is what
  // the selector must carry — `-0` projects as `0`, not `-0`.
  const canonical = (value) => (Number.isFinite(value) ? String(value) : null);
  if (ts.isNumericLiteral(node)) return canonical(Number(node.text));
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    const magnitude = Number(node.operand.text);
    return canonical(node.operator === ts.SyntaxKind.MinusToken ? -magnitude : magnitude);
  }
  return null;
}

function negateDataVariant(variant) {
  const match = variant.match(/^data-\[([a-zA-Z0-9-]+)\]$/);
  return match ? `not-[data-${match[1]}]` : null;
}

function isNegativeDataVariant(variant) {
  return /^not-\[data-[a-zA-Z0-9-]+\]$/.test(variant);
}

function collectTwTokens(node, scope, exposures) {
  const found = new Set();

  visit(node, scope);
  return Array.from(found);

  function visit(current, currentScope) {
    if (createsScope(current)) {
      const nextScope = createScope(currentScope, current);
      if (hasStatements(current)) {
        for (const stmt of current.statements) {
          if (ts.isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
              registerDeclaration(decl, nextScope, exposures);
              if (decl.initializer) visit(decl.initializer, nextScope);
            }
            continue;
          }
          visit(stmt, nextScope);
        }
        return;
      }
    }

    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === 'tw'
    ) {
      for (const arg of current.arguments) {
        const value = resolveExpression(arg, currentScope);
        for (const token of value.strings.flatMap(splitTokens)) found.add(token);
      }
    }

    ts.forEachChild(current, (child) => visit(child, currentScope));
  }
}

function isPropertyNamed(node, name) {
  return ts.isPropertyAccessExpression(node) && node.name.text === name;
}

function isPropertyAccessChain(node, names) {
  let current = node;
  for (let i = names.length - 1; i >= 0; i -= 1) {
    if (!ts.isPropertyAccessExpression(current) || current.name.text !== names[i]) return false;
    current = current.expression;
  }
  return ts.isIdentifier(current);
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return null;
}

function splitTokens(value) {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function emptyValue() {
  return { strings: [], single: null, map: null, semanticMap: null, semantic: null };
}

function asStringValue(strings) {
  return {
    strings,
    single: strings.length === 1 ? strings[0] : null,
    map: null,
    semanticMap: null,
    semantic: null,
  };
}

function asMapValue(map) {
  const strings = [];
  for (const values of map.values()) strings.push(...values);
  return {
    strings,
    single: null,
    map,
    semanticMap: null,
    semantic: null,
  };
}

function asSemanticValue(semantic) {
  return {
    strings: [],
    single: null,
    map: null,
    semanticMap: null,
    semantic,
  };
}

function asSemanticMapValue(semanticMap) {
  return {
    strings: [],
    single: null,
    map: null,
    semanticMap,
    semantic: null,
  };
}
function scriptKindForFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * Every file the token extractor reads under a root. Exported so a coverage
 * scan can walk the same set instead of keeping its own narrower glob.
 */
export async function collectSourceFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === 'test' || entry.name === 'node_modules') continue;
      out.push(...(await collectSourceFiles(fullPath)));
      continue;
    }
    if (
      entry.isFile() &&
      /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(entry.name) &&
      !/\.d\.ts$/i.test(entry.name)
    ) {
      out.push(fullPath);
    }
  }
  return out;
}
