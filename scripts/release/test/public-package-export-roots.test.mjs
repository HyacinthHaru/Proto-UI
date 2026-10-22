import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import {
  ROOT_DIR,
  buildPublicPackage,
  publicPackageSourceEntries,
} from '../../build/public-packages.mjs';

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pui-export-roots-'));
  mkdirSync(path.join(dir, 'src', 'host'), { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const root = 1;\n');
  writeFileSync(
    path.join(dir, 'src', 'host', 'leaf.ts'),
    'export const leaf = (value: string): string => value.toUpperCase();\n'
  );
  return {
    name: '@proto.ui/export-roots-test',
    dir,
    manifest: {
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' },
        './internal/leaf': {
          types: './dist/host/leaf.d.ts',
          import: './dist/host/leaf.js',
          default: './dist/host/leaf.js',
        },
      },
    },
    dispose() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('compiles and JavaScript-smokes declared leaf exports without a barrel edge', async () => {
  const pkg = fixture();
  try {
    buildPublicPackage(pkg);
    // These module URLs are generated fixture paths, not author-time imports.
    const root = await import(
      pathToFileURL(path.resolve(pkg.dir, pkg.manifest.exports['.'].import)).href
    );
    const leaf = await import(
      pathToFileURL(path.resolve(pkg.dir, pkg.manifest.exports['./internal/leaf'].import)).href
    );
    assert.equal(root.root, 1);
    assert.equal('leaf' in root, false);
    assert.equal(leaf.leaf('compiled consumer'), 'COMPILED CONSUMER');
  } finally {
    pkg.dispose();
  }
});

test('refuses a declared export with no source instead of preserving stale dist output', () => {
  const pkg = fixture();
  try {
    pkg.manifest.exports['./missing'] = { import: './dist/missing.js' };
    assert.throws(() => publicPackageSourceEntries(pkg), /missing source for explicit export/);
  } finally {
    pkg.dispose();
  }
});

test('refuses source traversal and does not treat wildcard exports as literal roots', () => {
  const pkg = fixture();
  try {
    pkg.manifest.exports['./wild/*'] = { import: './dist/wild/*.js' };
    assert.equal(publicPackageSourceEntries(pkg).length, 2);
    pkg.manifest.exports['./escape'] = { import: './dist/../outside.js' };
    assert.throws(() => publicPackageSourceEntries(pkg), /escapes its source/);
  } finally {
    pkg.dispose();
  }
});

test('declaration-only roots retain missing-source, wildcard and traversal boundaries', () => {
  const pkg = fixture();
  try {
    pkg.manifest.exports['./wild-types/*'] = { types: './dist/wild/*.d.ts' };
    assert.equal(publicPackageSourceEntries(pkg).length, 2);
    pkg.manifest.exports['./missing-types'] = { types: './dist/missing.d.ts' };
    assert.throws(() => publicPackageSourceEntries(pkg), /missing source for explicit export/);
    delete pkg.manifest.exports['./missing-types'];
    pkg.manifest.exports['./escape-types'] = { types: './dist/../outside.d.ts' };
    assert.throws(() => publicPackageSourceEntries(pkg), /escapes its source/);
  } finally {
    pkg.dispose();
  }
});

test('Virtual List portable and manifest-selected Web consumers keep separate runtime closures', async () => {
  const bundle = (contents, manifestSource) =>
    build({
      absWorkingDir: ROOT_DIR,
      stdin: { contents, resolveDir: ROOT_DIR, loader: 'ts' },
      tsconfig: path.join(ROOT_DIR, 'tsconfig.json'),
      bundle: true,
      write: false,
      metafile: true,
      platform: 'browser',
      format: 'cjs',
      treeShaking: false,
      ignoreAnnotations: true,
      logLevel: 'silent',
      plugins: manifestSource
        ? [
            {
              name: 'manifest-selected-web-source',
              setup(builder) {
                builder.onResolve(
                  { filter: /^@proto\.ui\/prototypes-base\/virtual-list\/web$/ },
                  () => ({ path: manifestSource })
                );
              },
            },
          ]
        : [],
    });
  const runtimeInputs = (result) =>
    Object.keys(result.metafile.inputs).map((input) => path.resolve(ROOT_DIR, input));
  const execute = (result) => {
    for (const output of Object.values(result.metafile.outputs))
      assert.deepEqual(output.imports, []);
    const module = { exports: {} };
    runInNewContext(
      result.outputFiles[0].text,
      { module, exports: module.exports },
      { timeout: 1000 }
    );
    return module.exports;
  };
  const implementation = path.join(ROOT_DIR, 'packages/prototypes/base/src/virtual-list/web.ts');
  const portable = await bundle("export * from '@proto.ui/prototypes-base';");
  assert.equal(runtimeInputs(portable).includes(implementation), false);
  assert.equal('attachWebVirtualList' in execute(portable), false);

  const packageDir = path.join(ROOT_DIR, 'packages/prototypes/base');
  const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  const rootSource = path.join(packageDir, 'src/index.ts');
  for (const condition of ['types', 'import', 'default']) {
    const target = manifest.exports['./virtual-list/web'][condition];
    // The real package compiler owns this declaration/runtime target projection.
    const sources = publicPackageSourceEntries({
      name: manifest.name,
      dir: packageDir,
      manifest: { exports: { './virtual-list/web': target } },
    });
    const selected = sources.find((source) => source !== rootSource) ?? rootSource;
    const consumer = await bundle(
      "export { attachWebVirtualList } from '@proto.ui/prototypes-base/virtual-list/web';",
      selected
    );
    assert.equal(
      runtimeInputs(consumer).includes(implementation),
      true,
      `${condition} omitted the Web implementation`
    );
    assert.equal(
      typeof execute(consumer).attachWebVirtualList,
      'function',
      `${condition} lost the public Web export`
    );
  }
});
