// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { parsePrototype } from '../src/parser';
import { emitReactSource } from '../src/react-source';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { emitVue2Source } from '../src/vue2-source';
import * as Vue from 'vue';
import { emitVueSource } from '../src/vue-source';
import { emitWebComponentSource } from '../src/web-component-source';
import { defineAsHook } from '../../core/src/prototype';
import { enterActiveAsHookContext, exitActiveAsHookContext } from '../../core/src/internal';
import { attachAsHookRuntime } from '../../runtime/src/kernel/as-hook';
import { emitQtSource } from '../src/qt-source';
import { emitFlutterSource } from '../src/flutter-source';
import { emitGpuiSource } from '../src/gpui-source';
const floatingUi = createRequire(
  fileURLToPath(new NodeURL('../../modules/positioning/package.json', import.meta.url))
)('@floating-ui/dom');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const source = `import {definePrototype,defineAsHook} from '@proto.ui/core';
const asA=defineAsHook({name:'a',setup(){}});
const asB=defineAsHook({name:'b',setup(){}});
const asCollision=defineAsHook({name:'a',setup(){}});
export default definePrototype({name:'identity',setup(def){
 const a=asA(); const alias=a; const b=asB(); const again=asA(); const collision=asCollision();
 def.expose.value('same',a===b); def.expose.value('repeat',a===again);
 def.expose.value('winner',a===collision); def.expose.value('alias',a===alias);
 def.expose.value('truthy',!!a);
 return (r)=>r.el('div',[]);
}});`;
it(
  'preserves opaque successful result identity in an actual generated React consumer',
  async () => {
    const parsed = parsePrototype(source, { fileName: 'identity.proto.ts' });
    expect(parsed.ok, JSON.stringify(parsed)).toBe(true);
    if (!parsed.ok)
      return;
    const emitted = emitReactSource(parsed.value);
    expect(emitted.ok, JSON.stringify(emitted)).toBe(true);
    if (!emitted.ok)
      return;
    const dir = path.resolve('packages/compiler/test/generated-modules/identity-' + process.pid);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'Component.tsx'), emitted.value.code);
    for (const f of emitted.value.supportingFiles ?? []) {
      const out = path.join(dir, f.path);
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, f.contents);
    }
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      const mod = await import(/* @vite-ignore */ path.join(dir, 'Component.tsx'));
      const ref = React.createRef<any>();
      await React.act(async () => root.render(React.createElement(mod.CompiledComponent, { ref })));
      expect(ref.current.getExposes()).toMatchObject({ same: false, repeat: true, winner: true, alias: true, truthy: true });
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
      await rm(dir, { recursive: true, force: true });
    }
  }
);
const Vue2 = createRequire(fileURLToPath(new NodeURL('../../adapters/vue2/package.json', import.meta.url)))('vue');
function inOwner<T>(run: () => T): T {
  const def = {} as any;
  const rt = attachAsHookRuntime(def, { getPhase: () => 'setup', prototypeName: 'identity' }, {});
  enterActiveAsHookContext({ def, rt, facades: {}, ports: {} });
  try {
    return run();
  } finally {
    exitActiveAsHookContext();
  }
}
it(
  'Runtime independently preserves winning names, aliases and distinct owner identities',
  () => {
    let count = 0;
    const a = defineAsHook({
      name: 'a', setup() {
        count++;
      }
    });
    const b = defineAsHook({
      name: 'b', setup() {
      }
    });
    const collision = defineAsHook({
      name: 'a',
      setup() {
        throw new Error('losing setup must not execute');
      }
    });
    const first = inOwner(() => {
      const x = a();
      const alias = x;
      expect(a()).toBe(x);
      expect(collision()).toBe(x);
      expect(b()).not.toBe(x);
      expect(!!x).toBe(true);
      expect(alias).toBe(x);
      return x;
    });
    const second = inOwner(() => a());
    expect(second).not.toBe(first);
    expect(count).toBe(2);
  }
);
it(
  'Runtime retains fresh truthy fallback during initialization and after failed registration',
  () => {
    let during: unknown[] = [];
    let calls = 0;
    const inner = defineAsHook({
      name: 'outer', setup() {
        throw new Error('must skip');
      }
    });
    const outer = defineAsHook({
      name: 'outer', setup() {
        during = [inner(), inner()];
      }
    });
    inOwner(() => {
      const result = outer();
      expect(during[0]).not.toBe(during[1]);
      expect(during[0]).not.toBe(result);
      expect(!!during[0]).toBe(true);
      expect(outer()).toBe(result);
      expect(inner()).toBe(result);
    });
    const failed = defineAsHook({
      name: 'failed',
      setup() {
        calls++;
        throw new Error('setup failure');
      }
    });
    inOwner(() => {
      expect(() => failed()).toThrow('setup failure');
      const a = failed();
      const b = failed();
      expect(a).not.toBe(b);
      expect(!!a).toBe(true);
      expect(calls).toBe(1);
    });
  }
);
const nestedSource = `import {definePrototype,defineAsHook} from '@proto.ui/core';
const shadow=defineAsHook({name:'outer',setup(def){def.expose.value('loser',true);}});
const child=defineAsHook({name:'child',setup(def){def.expose.value('childInstalled',true);}});
const outer=defineAsHook({name:'outer',setup(def){
 const x=shadow();const y=shadow();const a=child();const b=child();
 def.expose.value('initialDistinct',x!==y);def.expose.value('initialTruthy',!!x);def.expose.value('nestedSame',a===b);
}});
export default definePrototype({name:'nested',setup(def){const a=outer();const b=outer();const c=shadow();const d=shadow();def.expose.value('completeSame',a===b);def.expose.value('postShadowSame',c===d);def.expose.value('postShadowWinner',a===c);return r=>r.el('div',[]);}});`;
function winnerSource(first: 'a' | 'b'): string {
  return `import {definePrototype,defineAsHook} from '@proto.ui/core';
const asA=defineAsHook({name:'shared',setup(def){def.expose.value('aInstalled',true);}});
const asB=defineAsHook({name:'shared',setup(def){def.expose.value('bInstalled',true);}});
export default definePrototype({name:'first-winner',setup(def){
 const first=${first === 'a' ? 'asA' : 'asB'}();const second=${first === 'a' ? 'asB' : 'asA'}();
 def.expose.value('same',first===second);return r=>r.el('div',[]);
}});`;
}
function generatedModules(
  input: string,
  emit: typeof emitVueSource | typeof emitWebComponentSource | typeof emitReactSource | typeof emitVue2Source
) {
  const parsed = parsePrototype(input, { fileName: 'identity.proto.ts' });
  if (!parsed.ok)
    throw new Error(JSON.stringify(parsed.diagnostics));
  // Deliberately reverse IR declaration order independently of execution order.
  const ir = input.includes("name:'first-winner'") ? { ...parsed.value, hooks: [...parsed.value.hooks].reverse() } : parsed.value;
  const emitted = emit(ir);
  if (!emitted.ok)
    throw new Error(JSON.stringify(emitted.diagnostics));
  const files = new Map((emitted.value.supportingFiles ?? []).map(f => [f.path, f.contents]));
  files.set('component.ts', emitted.value.code);
  const cache = new Map<string, any>();
  function load(name: string): any {
    if (cache.has(name))
      return cache.get(name);
    const text = files.get(name);
    if (text === undefined)
      throw new Error('Missing ' + name);
    const exports = {};
    cache.set(name, exports);
    const js = ts.transpileModule(text, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('exports', 'require', js)(exports, (id: string) => {
      if (id === 'vue')
        return emit === emitVue2Source ? Vue2 : Vue;
      if (id === 'react')
        return React;
      if (id === '@floating-ui/dom')
        return floatingUi;
      if (!id.startsWith('.'))
        throw new Error('Unexpected ' + id);
      const next = path.posix.normalize(path.posix.join(path.posix.dirname(name), id));
      return load(next.endsWith('.ts') ? next : next + '.ts');
    });
    return exports;
  }
  return load('component.ts');
}
let tagIndex = 0;
for (const [label, input, expected] of [
  [
    'identity',
    source,
    { same: false, repeat: true, winner: true, alias: true, truthy: true }
  ],
  ['first-a', winnerSource('a'), { same: true, aInstalled: true }],
  ['first-b', winnerSource('b'), { same: true, bInstalled: true }],
  [
    'nested',
    nestedSource,
    {
      initialDistinct: true,
      initialTruthy: true,
      nestedSame: true,
      completeSame: true,
      postShadowSame: true,
      postShadowWinner: true,
      childInstalled: true
    }
  ],
] as const) {
  it(
    `React generated consumer: ${label}, with separate owner installations`,
    async () => {
      const mod = generatedModules(input, emitReactSource);
      for (let owner = 0; owner < 2; owner++) {
        const host = document.createElement('div');
        document.body.append(host);
        const root = createRoot(host);
        const ref = React.createRef<any>();
        try {
          await React.act(async () => root.render(React.createElement(mod.CompiledComponent, { ref })));
          expect(ref.current.getExposes()).toEqual(expected);
          expect(ref.current.getExposes()).not.toHaveProperty('loser');
        } finally {
          await React.act(async () => root.unmount());
          host.remove();
        }
      }
    }
  );
  it(
    `Vue2 generated consumer: ${label}, with separate owner installations`,
    async () => {
      const mod = generatedModules(input, emitVue2Source);
      for (let owner = 0; owner < 2; owner++) {
        const host = document.createElement('div');
        document.body.append(host);
        const vm = new Vue2({ render: (h: any) => h(mod.default, { ref: 'child' }) });
        try {
          vm.$mount(host);
          await Vue2.nextTick();
          expect(vm.$refs.child.getExposes()).toEqual(expected);
          expect(vm.$refs.child.getExposes()).not.toHaveProperty('loser');
        } finally {
          vm.$destroy();
          vm.$el.remove();
          host.remove();
        }
      }
    }
  );
  it(
    `Vue generated consumer: ${label}, with separate owner installations`,
    async () => {
      const mod = generatedModules(input, emitVueSource);
      for (let owner = 0; owner < 2; owner++) {
        const host = document.createElement('div');
        document.body.append(host);
        const app = Vue.createApp(mod.default);
        try {
          const instance = app.mount(host) as any;
          await Vue.nextTick();
          expect(instance.getExposes()).toEqual(expected);
          expect(instance.getExposes()).not.toHaveProperty('loser');
        } finally {
          app.unmount();
          host.remove();
        }
      }
    }
  );
  it(
    `Web Component generated consumer: ${label}, with separate owner installations`,
    () => {
      const mod = generatedModules(input, emitWebComponentSource);
      const tag = 'identity-case-' + (++tagIndex);
      mod.register(tag);
      for (let owner = 0; owner < 2; owner++) {
        const el = document.createElement(tag) as any;
        document.body.append(el);
        try {
          expect(el.getExposes()).toEqual(expected);
          expect(el.getExposes()).not.toHaveProperty('loser');
        } finally {
          el.dispose();
          el.remove();
        }
      }
    }
  );
}
for (const [label, statement] of [
  ['member', "const a=asA();def.expose.value('invalid',a.state);"],
  ['accessor', "const a=asA();a.getState('x');"],
  ['serialization', "const a=asA();def.expose.value('invalid',a);"],
] as const)
  it(`continues rejecting authored-result ${label}`, () => {
    const code = source.replace(/const a=asA\(\);[\s\S]*?return \(r\)=>/, statement + 'return (r)=>');
    expect(parsePrototype(code, { fileName: 'negative.proto.ts' }).ok).toBe(false);
  });
it('continues rejecting projectHandle and recursive authored calls', () => {
  expect(parsePrototype(
    source.replace(
      "name:'a',setup(){}",
      "name:'a',setup(){},projectHandle(result){return result;}"
    ),
    { fileName: 'projection.proto.ts' }
  ).ok).toBe(false);
  expect(parsePrototype(
    source.replace("name:'a',setup(){}", "name:'a',setup(){asA();}"),
    { fileName: 'recursive.proto.ts' }
  ).ok).toBe(false);
});
// Lowering-level execution exposes identities that the public data boundary correctly refuses.
// Full consumer tests above separately exercise framework ownership and setup effects.
for (const [target, emit] of [
  ['React', emitReactSource],
  ['Vue', emitVueSource],
  ['Vue2', emitVue2Source],
  ['Web Component', emitWebComponentSource]
] as const) {
  it(`${target} emitted hook closures keep raw identity owner-local`, () => {
    const parsed = parsePrototype(source, { fileName: 'owner.proto.ts' });
    if (!parsed.ok)
      throw new Error(JSON.stringify(parsed.diagnostics));
    const output = emit(parsed.value);
    if (!output.ok)
      throw new Error(JSON.stringify(output.diagnostics));
    const ast = ts.createSourceFile(
      'generated.ts',
      output.value.code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const declarations: ts.VariableDeclaration[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /Hook(?:Results|\d+)$/.test(node.name.text))
        declarations.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const registry = declarations.find(node => (node.name as ts.Identifier).text.endsWith('HookResults'));
    expect(registry).toBeDefined();
    const hooks = declarations.filter(node => /Hook\d+$/.test((node.name as ts.Identifier).text));
    expect(hooks).toHaveLength(3);
    const prefix = (registry!.name as ts.Identifier).text.replace(/HookResults$/, '');
    const javascript = ts.transpileModule(
      `const ${prefix}Def={};const ${prefix}DefValue={};const ${prefix}Owner={def:{}};\n${declarations.map(d => 'const ' + d.getText(ast) + ';').join('\n')}\nreturn [${hooks.map(h => h.name.getText(ast)).join(',')}];`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
    ).outputText;
    const createOwner = new Function(javascript);
    const first = createOwner(), second = createOwner();
    const a = first[0]();
    expect(first[0]()).toBe(a);
    expect(first[1]()).not.toBe(a);
    expect(first[2]()).toBe(a);
    expect(second[0]()).not.toBe(a);
    expect(!!a).toBe(true);
  });
}
for (const [target, emit] of [
  ['Qt', emitQtSource],
  ['Flutter', emitFlutterSource],
  ['GPUI', emitGpuiSource]
] as const) {
  it(
    `${target} emits the admitted identity and nested cases (native execution not covered)`,
    () => {
      for (const input of [source, nestedSource]) {
        const parsed = parsePrototype(input, { fileName: 'native-identity.proto.ts' });
        if (!parsed.ok)
          throw new Error(JSON.stringify(parsed.diagnostics));
        const emitted = emit(parsed.value);
        expect(emitted.ok, JSON.stringify(emitted.ok ? null : emitted.diagnostics)).toBe(true);
      }
    }
  );
}
it('Runtime first winner follows invocation order in both directions', () => {
  for (const first of ['a', 'b'] as const) {
    const installed: string[] = [];
    const a = defineAsHook({
      name: 'shared', setup() {
        installed.push('a');
      }
    });
    const b = defineAsHook({
      name: 'shared', setup() {
        installed.push('b');
      }
    });
    inOwner(() => {
      const x = (first === 'a' ? a : b)();
      const y = (first === 'a' ? b : a)();
      expect(x).toBe(y);
      expect(installed).toEqual([first]);
    });
  }
});
const registryNames = [
  ['NUL', '\u0000', '0000'],
  ['control', 'a\u0001', '00610001'],
  ['backspace', '\b', '0008'],
  ['formfeed', '\f', '000c'],
  ['backslash', '\\', '005c'],
  ['quote', '"', '0022'],
  ['literal-u', String.raw`a\u0000`, '0061005c00750030003000300030'],
  [
    'literal-braced-u',
    String.raw`a\u{0000}`,
    '0061005c0075007b0030003000300030007d'
  ],
  ['high-surrogate', '\ud800', 'd800'],
  ['different-surrogate', '\ud801', 'd801'],
  ['replacement', '\ufffd', 'fffd'],
] as const;
it('GPUI registry key encoding preserves admitted UTF-16 name distinctions', () => {
  const keys: string[] = [];
  for (const [label, name, hex] of registryNames) {
    const input = source.replace("name:'a'", 'name:' + JSON.stringify(name));
    const parsed = parsePrototype(input, { fileName: `${label}.proto.ts` });
    expect(parsed.ok, JSON.stringify(parsed.ok ? null : parsed.diagnostics)).toBe(true);
    if (!parsed.ok)
      throw new Error('Name was rejected');
    expect(parsed.value.hooks[0].name).toBe(name);
    const emitted = emitGpuiSource(parsed.value);
    expect(emitted.ok, JSON.stringify(emitted.ok ? null : emitted.diagnostics)).toBe(true);
    if (!emitted.ok)
      throw new Error('Emission failed');
    const key = emitted.value.code.match(/authored_hook\(&owner, "([^"\n]+)"/)?.[1];
    expect(key).toBe('u16:' + hex);
    expect(key).toMatch(/^u16:(?:[0-9a-f]{4})+$/);
    keys.push(key!);
  }
  expect(new Set(keys).size).toBe(registryNames.length);
});
