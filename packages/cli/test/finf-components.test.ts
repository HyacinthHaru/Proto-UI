import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { renderHostIndex } from '../src/services/codegen';
import { listComponentChoices } from '../src/registry/components';
import { FINF_WORKSPACE_COMPONENT_ENTRIES } from '../src/registry/finf-components';

describe('Finf workspace-source facade boundaries', () => {
  for (const entry of Object.values(FINF_WORKSPACE_COMPONENT_ENTRIES)) {
    it(`${entry.id} exposes each real atom without installed-release admission`, () => {
      for (const host of ['react', 'vue', 'vue2', 'wc'] as const) {
        expect(() => renderHostIndex(host, [entry.id])).toThrow(/workspace-source-only/);
        const source = renderHostIndex(host, [entry.id], { sourceMode: 'workspace' });
        expect(source).toContain(`from '${entry.importPath}'`);
        for (const atom of entry.items) expect(source).toContain(atom.prototypeImport);
      }
      expect(listComponentChoices().some((choice) => choice.value === entry.id)).toBe(false);
      const family = entry.packageName.slice('@proto.ui/prototypes-'.length);
      const component = entry.importPath.slice(entry.packageName.length + 1);
      const manifest = JSON.parse(
        fs.readFileSync(path.resolve('packages/prototypes', family, 'package.json'), 'utf8')
      );
      expect(manifest.exports[`./${component}`]).toEqual(
        manifest.private
          ? { types: `./src/${component}/index.ts`, default: `./src/${component}/index.ts` }
          : {
              types: `./dist/${component}/index.d.ts`,
              import: `./dist/${component}/index.js`,
              default: `./dist/${component}/index.js`,
            }
      );
    });
  }
});

describe('explicit Virtual List Web materialization boundary', () => {
  it('keeps the portable workspace consumer separate from the opt-in Web implementation', async () => {
    const bundle = (contents: string) =>
      build({
        stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
        tsconfig: path.resolve('tsconfig.json'),
        bundle: true,
        write: false,
        metafile: true,
        platform: 'browser',
        format: 'cjs',
        treeShaking: false,
        ignoreAnnotations: true,
        logLevel: 'silent',
      });
    const portable = await bundle("export * from '@proto.ui/prototypes-base';");
    const web = await bundle(
      "export { attachWebVirtualList } from '@proto.ui/prototypes-base/virtual-list/web';"
    );
    const implementation = path.resolve('packages/prototypes/base/src/virtual-list/web.ts');
    const runtimeInputs = (result: typeof portable) =>
      Object.keys(result.metafile.inputs).map((input) => path.resolve(input));
    expect(runtimeInputs(portable)).not.toContain(implementation);
    expect(runtimeInputs(web)).toContain(implementation);
    for (const result of [portable, web]) {
      for (const output of Object.values(result.metafile.outputs))
        expect(output.imports).toEqual([]);
    }
    const execute = (result: typeof portable): Record<string, unknown> => {
      const module = { exports: {} };
      // No document, HTMLElement or other Web globals are supplied to either consumer.
      runInNewContext(
        result.outputFiles[0]!.text,
        { module, exports: module.exports },
        { timeout: 1000 }
      );
      return module.exports;
    };
    expect(execute(portable)).not.toHaveProperty('attachWebVirtualList');
    expect(typeof execute(web).attachWebVirtualList).toBe('function');
  });
});
