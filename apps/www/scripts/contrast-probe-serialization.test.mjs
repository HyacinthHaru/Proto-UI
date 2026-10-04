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
