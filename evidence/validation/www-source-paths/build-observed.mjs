import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg)
  throw new Error('Usage: build-observed.mjs SOURCE_ROOT GRAPH_DIRECTORY');
const sourceRoot = path.resolve(sourceArg);
const output = path.resolve(outputArg);
const appRoot = path.join(sourceRoot, 'apps/www');
const siteRequire = createRequire(path.join(appRoot, 'package.json'));
const { build } = await import(pathToFileURL(siteRequire.resolve('astro')).href);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(output, { recursive: true });
let configuration;
let sequence = 0;
const observer = {
  name: 'www-source-id-evidence',
  apply: 'build',
  configResolved(config) {
    configuration = {
      root: config.root,
      mode: config.mode,
      command: config.command,
      ssr: Boolean(config.build.ssr),
      viteConfigFile: config.configFile,
      plugins: config.plugins.map((plugin) => plugin.name),
    };
  },
  generateBundle(options, bundle) {
    const allIds = [...this.getModuleIds()];
    const coreIds = allIds.filter((id) =>
      /\/packages\/core\/src\/internal\.ts(?:\?.*)?$/.test(id.replaceAll('\\', '/'))
    );
    const chunks = Object.values(bundle).filter((entry) => entry.type === 'chunk');
    const coreInternal = coreIds.map((id) => {
      const info = this.getModuleInfo(id);
      const filename = id.split('?', 1)[0];
      const renderedIn = chunks
        .filter((chunk) => Object.hasOwn(chunk.modules, id))
        .map((chunk) => {
          const rendered = chunk.modules[id];
          return {
            chunk: chunk.fileName,
            isEntry: chunk.isEntry,
            isDynamicEntry: chunk.isDynamicEntry,
            imports: chunk.imports,
            dynamicImports: chunk.dynamicImports,
            renderedLength: rendered.renderedLength,
            originalLength: rendered.originalLength,
            renderedExports: rendered.renderedExports,
            removedExports: rendered.removedExports,
            renderedCodeSha256: rendered.code === null ? null : hash(rendered.code),
          };
        });
      return {
        id,
        physicalPath: fs.realpathSync(filename),
        sourceSha256: hash(fs.readFileSync(filename)),
        isIncluded: info.isIncluded,
        importers: info.importers,
        dynamicImporters: info.dynamicImporters,
        renderedIn,
        retained: renderedIn.some((entry) => entry.renderedLength > 0),
      };
    });
    const evidence = {
      observedAt: new Date().toISOString(),
      platform: process.platform,
      separator: path.sep,
      sourceRoot,
      originalAstroConfig: path.join(appRoot, 'astro.config.mjs'),
      settings: { ...configuration },
      outputDirectory: options.dir,
      moduleCount: allIds.length,
      coreInternal,
      retainedCoreInternalIds: coreInternal
        .filter((entry) => entry.retained)
        .map((entry) => entry.id),
      chunks: chunks.map((chunk) => ({
        fileName: chunk.fileName,
        name: chunk.name,
        isEntry: chunk.isEntry,
        isDynamicEntry: chunk.isDynamicEntry,
        imports: chunk.imports,
        dynamicImports: chunk.dynamicImports,
        sha256: hash(chunk.code),
        bytes: Buffer.byteLength(chunk.code),
        modules: Object.keys(chunk.modules),
      })),
      method:
        'Astro public build API merges one inline Vite generateBundle observer into the original discovered config. No resolve/load/transform/render hook, bundle mutation or emitted diagnostic asset.',
      scope:
        'Each file is one SSR or client graph. Only renderedLength > 0 marks a Core internal ID retained; separate SSR/client graphs must not be summed as duplicates.',
    };
    fs.writeFileSync(
      path.join(output, `${++sequence}-${configuration.ssr ? 'ssr' : 'client'}.json`),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
  },
};

// The normal CLI invokes the same API with configuration discovered from this cwd.
// Supplying only vite.plugins preserves that config file and its original plugin order.
process.chdir(appRoot);
await build({ vite: { plugins: [observer] } });
