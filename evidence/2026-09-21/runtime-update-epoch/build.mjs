import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [sourceRoot, label] = process.argv.slice(2);
if (!sourceRoot || !label) throw new Error('Usage: build.mjs sourceRoot baseline|candidate');
const require = createRequire(path.join(sourceRoot, 'package.json'));
const esbuild = require('esbuild');
const here = path.dirname(new URL(import.meta.url).pathname);
const output = path.join(here, label);
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const metadata = {
  label,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
  sessionSha256: sha(path.join(sourceRoot, 'packages/runtime/src/instance/session.ts')),
  adapterSha256: sha(path.join(sourceRoot, 'packages/adapters/react/src/adapt.ts')),
  fixtureSha256: sha(path.join(here, 'fixture.ts')),
};
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(here, 'index.html'), path.join(output, 'index.html'));
function resolvePackage(id) {
  const [pkg, ...rest] = id.slice('@proto.ui/'.length).split('/');
  const prefixes = [
    ['module-', 'modules'],
    ['adapter-', 'adapters'],
    ['prototypes-', 'prototypes'],
    ['compositions-', 'compositions'],
    ['spec-', 'spec'],
  ];
  const match = prefixes.find(([prefix]) => pkg.startsWith(prefix));
  const folder = match ? path.join(match[1], pkg.slice(match[0].length)) : pkg;
  const base = path.join(sourceRoot, 'packages', folder);
  const target = path.join(base, 'src', ...rest);
  for (const file of [path.join(target, 'index.ts'), `${target}.ts`, `${target}.tsx`]) {
    if (fs.existsSync(file)) return file;
  }
  const exports = JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8')).exports;
  const subpath = rest.length ? `./${rest.join('/')}` : '.';
  for (const [key, value] of Object.entries(exports ?? {})) {
    const wildcard = key.includes('*')
      ? subpath.slice(key.indexOf('*'), subpath.length - (key.length - key.indexOf('*') - 1))
      : '';
    if (key.replace('*', wildcard) !== subpath) continue;
    const entry =
      typeof value === 'string' ? value : (value.import ?? value.default ?? value.types);
    const source = entry
      .replace('*', wildcard)
      .replace('./dist/', './src/')
      .replace(/\.d\.ts$/, '.ts')
      .replace(/\.js$/, '.ts');
    const file = path.resolve(base, source);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`No source resolution for ${id}`);
}
const result = await esbuild.build({
  entryPoints: [path.join(here, 'fixture.ts')],
  outfile: path.join(output, 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  define: { EVIDENCE_SOURCE: JSON.stringify(metadata), 'process.env.NODE_ENV': '"development"' },
  sourcemap: true,
  metafile: true,
  plugins: [
    {
      name: 'source-bindings',
      setup(build) {
        build.onResolve({ filter: /^@proto\.ui\// }, (args) => ({
          path: resolvePackage(args.path),
        }));
        build.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, (args) => ({
          path: require.resolve(args.path, {
            paths: [path.join(sourceRoot, 'packages/adapters/react')],
          }),
        }));
      },
    },
  ],
});
fs.writeFileSync(path.join(output, 'source.json'), JSON.stringify(metadata, null, 2));
fs.writeFileSync(path.join(output, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
const sourceMap = JSON.parse(fs.readFileSync(path.join(output, 'app.js.map'), 'utf8'));
const inputs = sourceMap.sources.map((source, index) => {
  const absolute = path.resolve(output, source);
  const name = source.includes('<define:')
    ? `evidence-metadata/${source.slice(source.indexOf('<define:'))}`
    : absolute.startsWith(sourceRoot + path.sep)
      ? path.relative(sourceRoot, absolute)
      : absolute.startsWith(here + path.sep)
        ? `fixture/${path.relative(here, absolute)}`
        : source;
  const bytes = Buffer.from(sourceMap.sourcesContent[index]);
  return {
    path: name,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    gitBlob: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    bytes: bytes.length,
  };
});
fs.writeFileSync(path.join(output, 'input-hashes.json'), JSON.stringify(inputs, null, 2));
console.log(JSON.stringify(metadata));
