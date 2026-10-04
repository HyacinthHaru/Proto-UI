import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { transform } from 'esbuild';

test('browser-side Focus diagnostics run without Node transpiler helpers', async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const compiled = await transform(source, {
    loader: 'ts',
    format: 'iife',
    globalName: 'puiContrastProbe',
    keepNames: false,
  });
  const sandbox = { document: { activeElement: null } };
  vm.runInNewContext(compiled.code, sandbox);
  const center = { entries: new Map(), activeScopes: [] };
  const result = sandbox.puiContrastProbe.readContrastFocusDiagnostics(center, 'fixture-source');
  assert.equal(result.entryCount, 0);
  assert.equal(result.source, 'fixture-source');
  assert.match(result.boundary, /separate module identity/);
  assert.equal(center.entries.size, 0);
  assert.equal(center.activeScopes.length, 0);
});

test('shared interactive target predicate rejects non-painted boxes without losing native state facts', async () => {
  const source = await readFile(new URL('./contrast-probe.browser.ts', import.meta.url), 'utf8');
  const compiled = await transform(source, {
    loader: 'ts',
    format: 'iife',
    globalName: 'puiContrastProbe',
    keepNames: false,
  });
  const style = {
    visibility: 'visible',
    display: 'block',
    contentVisibility: 'visible',
    opacity: '1',
    clip: 'auto',
    clipPath: 'none',
    maskImage: 'none',
    perspective: 'none',
    transformStyle: 'flat',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
    contain: 'none',
    overflowX: 'visible',
    overflowY: 'visible',
    boxShadow: 'none',
  };
  const bounds = { x: 10, y: 10, left: 10, top: 10, right: 50, bottom: 40, width: 40, height: 30 };
  const element = {
    parentElement: null,
    assignedSlot: null,
    textContent: 'Native-state fixture',
    getRootNode: () => ({}),
    getClientRects: () => [bounds],
    getBoundingClientRect: () => bounds,
    getAttribute: () => null,
    matches: () => true,
  };
  const sandbox = {
    document: { activeElement: element },
    innerWidth: 800,
    innerHeight: 600,
    ShadowRoot: class {},
    getComputedStyle: () => style,
  };
  vm.runInNewContext(compiled.code, sandbox);
  const observe = () => sandbox.puiContrastProbe.readContrastTargetObservation(element);
  assert.equal(observe().achieved, true);
  // The old bounds-only predicate accepts this fixture. The new predicate must
  // reject it for paint, not merely because native interaction flags vanished.
  style.opacity = '0';
  assert.equal(
    element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
    true
  );
  const transparent = observe();
  assert.equal(transparent.achieved, false);
  assert.equal(transparent.focused, true);
  assert.equal(transparent.hovered, true);
  assert.equal(transparent.nativeActive, true);
  style.opacity = '1';
  style.clipPath = 'inset(100%)';
  assert.equal(observe().achieved, false);
  assert.equal(observe().visibility.classification, 'unsupported');
  style.clipPath = 'none';
  assert.equal(observe().achieved, true);
});
