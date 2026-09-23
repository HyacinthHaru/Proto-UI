/**
 * Emits the event-type fixture that keeps the Rust event layer honest against
 * the TypeScript one.
 *
 * Two sources, on purpose:
 *
 *   - `packages/types/src/event.ts` declares the type vocabulary. It is the
 *     authority, and the Rust mirror is generated from it rather than
 *     transcribed.
 *   - `packages/spec/fixtures/src/event/type-payload.ts` carries the spec's
 *     own accepted/rejected examples. Recording those means the Rust
 *     validator is checked against the conformance data the Web adapters are
 *     checked against, not against a second opinion about what the rules are.
 *
 * `packages/modules/event/src/impl.ts` keeps its own copy of the two arrays.
 * They are module-private, so this script reads them out of the source text
 * and fails if they have drifted from the exported authority. Generating a
 * Rust mirror against a stale copy is precisely the failure this whole
 * fixture approach exists to prevent, and that duplicate is where it would
 * come from.
 *
 *   pnpm gpui:event-fixture            # write
 *   pnpm check:gpui-event-fixture      # verify it is current
 *
 * `--fixture <path>` and `--impl <path>` target different files, which lets a
 * test prove that a stale fixture and a drifted copy actually fail instead of
 * asserting that they would.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { CORE_EVENT_TYPES, OPTIONAL_EVENT_TYPES } from '../../packages/types/src/event';
import {
  EVENT_TYPE_PAYLOAD_CASES,
  type EventTypePayloadCase,
} from '../../packages/spec/fixtures/src/event/type-payload';
type KeySource = { fileName: string; source: string };

function unwrapKeyExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isKeyProperty(expression: ts.Expression): boolean {
  const current = unwrapKeyExpression(expression);
  return (
    (ts.isPropertyAccessExpression(current) && current.name.text === 'key') ||
    (ts.isElementAccessExpression(current) &&
      current.argumentExpression !== undefined &&
      ts.isStringLiteralLike(current.argumentExpression) &&
      current.argumentExpression.text === 'key')
  );
}

function isKeyValue(expression: ts.Expression, aliases: ReadonlySet<string>): boolean {
  const current = unwrapKeyExpression(expression);
  return isKeyProperty(current) || (ts.isIdentifier(current) && aliases.has(current.text));
}

function bindAliases(
  name: ts.BindingName,
  initializer: ts.Expression | undefined,
  aliases: Set<string>
): void {
  if (ts.isIdentifier(name)) {
    if (initializer && isKeyValue(initializer, aliases)) aliases.add(name.text);
    else aliases.delete(name.text);
    return;
  }
  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const property = element.propertyName ?? element.name;
      if (
        (ts.isIdentifier(property) || ts.isStringLiteralLike(property)) &&
        property.text === 'key'
      ) {
        aliases.add(element.name.text);
      } else {
        aliases.delete(element.name.text);
      }
    }
  }
}

/** Every string compared against an event key or a simple local alias. */
export function comparedKeysFromSources(sources: readonly KeySource[]): string[] {
  const found = new Set<string>();
  const equalityOperators = new Set([
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ]);

  for (const { fileName, source } of sources) {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node, aliases: Set<string>): void => {
      if (ts.isSourceFile(node) || ts.isBlock(node)) {
        const scopedAliases = new Set(aliases);
        for (const statement of node.statements) visit(statement, scopedAliases);
        return;
      }

      if (ts.isFunctionLike(node)) {
        const scopedAliases = new Set(aliases);
        for (const parameter of node.parameters) {
          bindAliases(parameter.name, undefined, scopedAliases);
          if (parameter.initializer) visit(parameter.initializer, scopedAliases);
        }
        if ('body' in node && node.body) visit(node.body, scopedAliases);
        return;
      }

      if (ts.isVariableDeclaration(node)) {
        if (node.initializer) visit(node.initializer, aliases);
        bindAliases(node.name, node.initializer, aliases);
        return;
      }

      if (ts.isBinaryExpression(node)) {
        if (equalityOperators.has(node.operatorToken.kind)) {
          const left = unwrapKeyExpression(node.left);
          const right = unwrapKeyExpression(node.right);
          if (isKeyValue(left, aliases) && ts.isStringLiteralLike(right)) found.add(right.text);
          if (isKeyValue(right, aliases) && ts.isStringLiteralLike(left)) found.add(left.text);
        }

        if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
          visit(node.right, aliases);
          bindAliases(node.left, node.right, aliases);
          return;
        }
      }

      ts.forEachChild(node, (child) => visit(child, aliases));
    };

    visit(sourceFile, new Set());
  }
  return [...found].sort();
}

function comparedKeys(): string[] {
  const sources = KEY_SCAN_ROOTS.flatMap((root) =>
    sourceFiles(root).map((fileName) => ({ fileName, source: readFileSync(fileName, 'utf8') }))
  );
  return comparedKeysFromSources(sources);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_OUT = path.join(ROOT, 'native/gpui/fixtures/event-types.json');
const DEFAULT_IMPL = path.join(ROOT, 'packages/modules/event/src/impl.ts');

/**
 * Where a keyboard comparison can appear. Prototypes and modules are the two
 * layers that read `ev.key`; adapters only pass it through.
 */
const KEY_SCAN_ROOTS = ['packages/prototypes', 'packages/modules', 'packages/runtime/src'];

/** The prefix an extension event type must carry, and must exceed. */
const EXTENSION_PREFIX = 'host:';

/**
 * The fields that cross the boundary on a portable payload.
 *
 * Deliberately short: no coordinates, no pointer id, no button number. A host
 * that needs those uses a `host:*` event or the Move Gesture channel, both of
 * which are host-local by contract.
 */
const PORTABLE_FIELDS = ['key', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'repeat'] as const;

/** Reads one `const NAME = [ ... ] as const;` string array out of a source file. */
function readLiteralArray(source: string, name: string, where: string): string[] {
  const match = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(source);
  if (!match) throw new Error(`${name} not found in ${path.relative(ROOT, where)}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

/** Fails when the module's private copy has drifted from the exported one. */
function assertImplCopyAgrees(where: string): void {
  const source = readFileSync(where, 'utf8');
  const pairs: [string, readonly string[]][] = [
    ['CORE_EVENT_TYPES', CORE_EVENT_TYPES],
    ['OPTIONAL_EVENT_TYPES', OPTIONAL_EVENT_TYPES],
  ];
  for (const [name, authority] of pairs) {
    const copy = readLiteralArray(source, name, where);
    if (copy.join('\u0000') === [...authority].join('\u0000')) continue;
    throw new Error(
      `${name} in ${path.relative(ROOT, where)} has drifted from packages/types/src/event.ts:\n` +
        `  authority: ${authority.join(', ')}\n` +
        `  copy:      ${copy.join(', ')}`
    );
  }
}

/** Every `.ts` file under one of the scan roots. */
function sourceFiles(root: string): string[] {
  const absolute = path.join(ROOT, root);
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      // `dist` is a build of `src`; `test` compares on unrelated `key`
      // properties of its own fixtures, not on keyboard input.
      if (entry === 'node_modules' || entry === 'dist' || entry === 'test' || entry === 'tests') {
        continue;
      }
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts') && !full.endsWith('.d.ts') && !full.includes('.test.')) {
        found.push(full);
      }
    }
  };
  try {
    walk(absolute);
  } catch {
    // A root that does not exist is a repository layout change, not a silent
    // pass: an empty result fails the completeness assertion downstream.
  }
  return found;
}

/** The accepted and rejected type examples the spec fixture carries. */
function conformanceTypes(): { accepted: string[]; rejected: string[] } {
  const accepted = new Set<string>();
  const rejected = new Set<string>();
  // Widened to the declared case type: the tuple is `as const`, and only some
  // of its members carry `rejectedTypes`.
  const cases: readonly EventTypePayloadCase[] = EVENT_TYPE_PAYLOAD_CASES;
  for (const testCase of cases) {
    for (const type of testCase.acceptedTypes) accepted.add(type);
    for (const type of testCase.rejectedTypes ?? []) rejected.add(type);
  }
  return { accepted: [...accepted].sort(), rejected: [...rejected].sort() };
}

function optionPath(argv: readonly string[], flag: string, fallback: string): string {
  const at = argv.indexOf(flag);
  if (at === -1) return fallback;
  const value = argv[at + 1];
  if (!value) throw new Error(`${flag} needs a path`);
  return path.resolve(ROOT, value);
}

function compare(label: string, target: string, expected: string): boolean {
  let actual: string;
  try {
    actual = readFileSync(target, 'utf8');
  } catch {
    console.error(`[gpui:event-fixture] ${path.relative(ROOT, target)} is missing`);
    return false;
  }
  if (actual === expected) {
    console.log(`[gpui:event-fixture] ${path.relative(ROOT, target)} is current (${label})`);
    return true;
  }
  console.error(
    `[gpui:event-fixture] ${path.relative(ROOT, target)} is stale; run \`pnpm gpui:event-fixture\``
  );
  return false;
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  assertImplCopyAgrees(optionPath(argv, '--impl', DEFAULT_IMPL));

  const { accepted, rejected } = conformanceTypes();
  const keys = comparedKeys();
  if (keys.length === 0) {
    throw new Error('no key comparisons found; the scan roots are probably wrong');
  }
  const fixture = {
    note:
      'Generated by scripts/gpui/generate-event-fixture.mts. Do not edit. ' +
      'The vocabulary comes from packages/types/src/event.ts and the accepted/rejected ' +
      'examples from the spec fixture the Web adapters are checked against.',
    source: {
      vocabulary: 'packages/types/src/event.ts',
      conformance: 'packages/spec/fixtures/src/event/type-payload.ts',
    },
    /** An extension type is this prefix followed by at least one character. */
    extensionPrefix: EXTENSION_PREFIX,
    core: [...CORE_EVENT_TYPES],
    optional: [...OPTIONAL_EVENT_TYPES],
    portableFields: [...PORTABLE_FIELDS],
    /**
     * The key values this repository compares against. A host that cannot
     * produce one of these cannot run the Prototypes that read it.
     */
    comparedKeys: keys,
    /** Types a validator must accept, drawn from the spec's own cases. */
    accepted,
    /**
     * Types a validator must reject. `host:` on its own is here because the
     * prefix must be exceeded, not merely matched, and `native:` and
     * `host.click` because no layer other than `host:` exists.
     */
    rejected,
    counts: {
      core: CORE_EVENT_TYPES.length,
      optional: OPTIONAL_EVENT_TYPES.length,
      accepted: accepted.length,
      rejected: rejected.length,
      comparedKeys: keys.length,
    },
  };

  const serialized = `${JSON.stringify(fixture, null, 2)}\n`;
  const out = optionPath(argv, '--fixture', DEFAULT_OUT);

  if (argv.includes('--check')) {
    const label = `${fixture.counts.core} core, ${fixture.counts.optional} optional`;
    if (!compare(label, out, serialized)) process.exitCode = 1;
    return;
  }

  writeFileSync(out, serialized);
  console.log(
    `[gpui:event-fixture] wrote ${path.relative(ROOT, out)}: ` +
      `${fixture.counts.core} core, ${fixture.counts.optional} optional, ` +
      `${fixture.counts.accepted} accepted, ${fixture.counts.rejected} rejected`
  );
}

// Only run when executed directly; a test imports `main` instead.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
