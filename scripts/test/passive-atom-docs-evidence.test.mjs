import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import ts from 'typescript';
import YAML from 'yaml';

const suitePath = 'apps/www/src/content/docs/zh-cn/demo-passive-atoms.browser.test.ts';
function collect(window) {
  const cases = [];
  const hooks = [];
  const blocked = () => {
    throw new Error('Socket-free evidence contract must not start a browser or server');
  };
  const nativeRequire = createRequire(import.meta.url);
  const output = ts.transpileModule(readFileSync(suitePath, 'utf8'), {
    fileName: suitePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const context = {
    exports: {},
    process,
    window,
    document: window.document,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    performance: window.performance,
    require(id) {
      if (id === 'vitest')
        return {
          beforeAll: (action) => hooks.push(action),
          afterAll: (action) => hooks.push(action),
          describe: { sequential: (_name, register) => register() },
          it: {
            each: (values) => (_name, action, timeout) =>
              cases.push(...values.map((value) => ({ value, action, timeout }))),
          },
          expect: blocked,
        };
      if (id === './browser-harness')
        return {
          RUNTIMES: ['wc', 'react', 'vue', 'vue2'],
          launchBrowser: blocked,
          selectRuntime: blocked,
          startServer: blocked,
          stopServer: blocked,
        };
      if (id.startsWith('node:')) return nativeRequire(id);
      throw new Error(`Unexpected import ${id}`);
    },
  };
  runInNewContext(
    `${output}\nglobalThis.installRecorder = installShellRecorder; globalThis.matchesReadyOwner = readyEventHasExpectedOwner;`,
    context
  );
  return {
    cases,
    hooks,
    install: context.installRecorder,
    matchesReadyOwner: context.matchesReadyOwner,
  };
}
function shell({ hidden = false, inert = false, borrowed = true, generation = 1, display } = {}) {
  return `<div ${hidden ? 'hidden' : ''} ${inert ? 'inert' : ''} ${display ? `style="display:${display}"` : ''}><div class="pui-runtime-preview-surface" data-projection-generation="${generation}" data-projection-runtime="react"><div data-passive-shell-slot>${borrowed ? '<div data-demo-ref="__website_runtime_preview_surface__-content"><span data-pui-root>real source</span></div>' : ''}</div></div></div>`;
}
function probe(markup) {
  const window = new Window();
  window.document.body.innerHTML = `<div data-previewer-id="fixture">${markup}</div>`;
  const suite = collect(window);
  suite.install();
  window.document.dispatchEvent(
    new window.CustomEvent('runtime:changed', { detail: { id: 'react' } })
  );
  return { ...suite, state: window.__passiveAtomEvidence };
}

test('collects all 64 bounded bilingual runtime cases without executing hooks', () => {
  const { cases, hooks } = collect(new Window());
  assert.equal(cases.length, 64);
  assert.equal(hooks.length, 2);
  assert.equal(
    new Set(
      cases.map(({ value }) => `${value.locale}/${value.family}/${value.atom}/${value.runtime}`)
    ).size,
    64
  );
  assert.ok(cases.every(({ timeout }) => timeout === 90_000));
});
test('keeps hidden, inert and empty candidates in evidence without counting them as content owners', () => {
  const { state } = probe(
    shell() +
      shell({ hidden: true, generation: 2 }) +
      shell({ inert: true, generation: 3 }) +
      shell({ borrowed: false, generation: 4 }) +
      shell({ display: 'none', generation: 5 })
  );
  const slots = state.traces.at(-1).slots;
  assert.equal(slots.length, 5);
  assert.equal(slots.filter((slot) => slot.active).length, 1);
  assert.equal(slots[1].hostHidden, true);
  assert.equal(slots[2].hostInert, true);
  assert.equal(slots[3].borrowedContent, false);
  assert.equal(slots[4].hostDisplay, 'none');
  assert.ok(slots.every((slot) => slot.phase === null));
  assert.equal(state.events[0].slots.length, 5);
  assert.equal(state.events[0].name, 'runtime:changed');
});
test('two visible borrowed owners remain a detectable violation, never filtered to the first', () => {
  const { state } = probe(shell() + shell({ generation: 2 }));
  assert.equal(state.traces.at(-1).slots.filter((slot) => slot.active).length, 2);
  assert.equal(state.events[0].slots.filter((slot) => slot.active).length, 2);
});
test('a ready event naming the new runtime cannot be satisfied by the old runtime owner', () => {
  const { state, matchesReadyOwner } = probe(shell());
  const event = state.events[0];
  assert.equal(matchesReadyOwner(event), true);
  assert.equal(matchesReadyOwner({ ...event, detail: { id: 'vue' } }), false);
  assert.equal(
    matchesReadyOwner({ ...event, name: 'previewer:mounted', detail: { runtime: 'vue' } }),
    false
  );
  assert.equal(matchesReadyOwner({ ...event, detail: {} }), false);
});
test('hosted evidence retains exact head and read-only permissions', () => {
  const workflow = YAML.parse(
    readFileSync('.github/workflows/passive-atom-docs-evidence.yml', 'utf8')
  );
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const steps = workflow.jobs['public-atom-previews'].steps;
  assert.equal(
    steps.find((step) => step.uses === 'actions/checkout@v4').with.ref,
    '${{ env.CANDIDATE_SHA }}'
  );
  assert.equal(
    steps.find((step) => step.uses === 'actions/checkout@v4').with['persist-credentials'],
    false
  );
  assert.ok(steps.some((step) => step.run?.includes(suitePath)));
  assert.ok(
    steps.some((step) => step.uses === 'actions/upload-artifact@v4' && step.if === 'always()')
  );
});
