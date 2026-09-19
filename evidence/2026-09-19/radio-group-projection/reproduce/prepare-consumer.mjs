// Disposable evidence helper, derived from scripts/release/consumer-smoke-cli.mjs.
// Uses an existing release pack and the packed CLI; it does not publish packages.
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    release: { type: 'string' },
    consumer: { type: 'string' },
  },
});
assert(
  values.repo && values.release && values.consumer,
  'Usage: node prepare-consumer.mjs --repo <candidate-checkout> --release <pack-dir> --consumer <new-dir>'
);
const repo = resolve(values.repo);
const release = resolve(values.release);
const consumer = resolve(values.consumer);
assert(!existsSync(join(consumer, 'package.json')), 'Use a new disposable consumer directory.');
const { getAllPackages, selectPackages } = await import(
  pathToFileURL(join(repo, 'scripts/release/lib.mjs')).href
);
const manifest = JSON.parse(readFileSync(join(release, 'pack-manifest.json'), 'utf8'));
assert.deepEqual(
  manifest.packages.map(({ name }) => name).sort(),
  selectPackages(getAllPackages())
    .map(({ name }) => name)
    .sort()
);
const byName = new Map(manifest.packages.map((entry) => [entry.name, entry]));
const pending = [
  '@proto.ui/cli',
  '@proto.ui/adapter-react',
  '@proto.ui/adapter-vue',
  '@proto.ui/adapter-web-component',
  '@proto.ui/prototypes-base',
  '@proto.ui/prototypes-shadcn',
];
const closure = new Set();
while (pending.length) {
  const name = pending.pop();
  if (closure.has(name)) continue;
  const entry = byName.get(name);
  assert(entry, `Missing packed package: ${name}`);
  closure.add(name);
  const pkg = JSON.parse(readFileSync(join(release, entry.stage, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dependency of Object.keys(pkg[field] ?? {})) {
      if (byName.has(dependency)) pending.push(dependency);
    }
  }
}
const names = [...closure].sort();
const dependencies = Object.fromEntries(
  names.map((name) => {
    const tarball = join(release, byName.get(name).tarball);
    assert(existsSync(tarball), `Missing tarball: ${name}`);
    const path = relative(consumer, tarball).replaceAll('\\', '/');
    return [name, `file:${path.startsWith('.') ? path : `./${path}`}`];
  })
);
mkdirSync(consumer, { recursive: true });
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'proto-ui-radio-evidence-consumer',
      private: true,
      version: '0.0.0',
      type: 'module',
      dependencies: {
        ...dependencies,
        '@happy-dom/global-registrator': '20.11.0',
        // Pin the transitive version actually observed in the retained failing run.
        'happy-dom': '20.14.5',
        '@types/react': '19.2.14',
        react: '19.2.6',
        'react-dom': '19.2.6',
        tsx: '4.21.0',
        typescript: '5.9.3',
        vue: '3.5.29',
      },
    },
    null,
    2
  ) + '\n'
);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund']);
const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'));
const installed = Object.entries(lock.packages).filter(([key]) => key.includes('/@proto.ui/'));
assert.deepEqual(installed.map(([key]) => key.replace(/^node_modules\//, '')).sort(), names);
for (const [key, entry] of installed) {
  assert.equal(entry.version, manifest.releaseVersion, key);
  assert(
    entry.resolved && !/^https?:/.test(entry.resolved),
    `${key} resolved outside local tarballs`
  );
}
const cli = join(consumer, 'node_modules/@proto.ui/cli/bin/proto-ui.js');
run(process.execPath, [cli, 'init', '--yes', '--no-interactive']);
for (const host of ['react', 'vue', 'wc']) {
  const components = [
    'shadcn-button',
    ...(host === 'react' ? ['base-button'] : []),
    'base-image',
    'shadcn-switch',
    'shadcn-dialog',
    'shadcn-radio-group',
  ];
  for (const component of components) {
    run(process.execPath, [cli, 'add', host, component, '--no-install', '--no-interactive']);
  }
}
const here = dirname(fileURLToPath(import.meta.url));
for (const file of ['index.html', 'radio-browser.ts'])
  copyFileSync(join(here, file), join(consumer, file));
writeFileSync(
  join(consumer, 'radio-package-counts.json'),
  JSON.stringify(
    {
      packed: manifest.packages.length,
      installedProtoUi: installed.length,
      protoUiRegistryResolutions: 0,
      releaseVersion: manifest.releaseVersion,
    },
    null,
    2
  ) + '\n'
);
console.log(
  `Prepared ${installed.length}/${manifest.packages.length} local packed packages in ${consumer}`
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: consumer,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} exited with ${result.status}`);
}
