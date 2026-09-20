// Disposable packed-CLI evidence helper. Does not build, pack or publish the repository.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    head: { type: 'string' },
    release: { type: 'string' },
    out: { type: 'string' },
  },
});
assert(
  values.repo && values.head && values.release && values.out,
  'Usage: node prepare-consumer.mjs --repo <frozen-checkout> --head <40-char-sha> --release <existing-pack> --out <new-run-dir>'
);
assert.match(values.head, /^[a-f0-9]{40}$/);
const repo = realpathSync(resolve(values.repo));
const release = realpathSync(resolve(values.release));
const out = resolve(values.out);
const here = dirname(fileURLToPath(import.meta.url));
assert(!existsSync(out), 'Use a new output directory; existing evidence is retained.');
assert.equal(
  exec('git', ['rev-parse', 'HEAD'], repo).trim(),
  values.head,
  'Repository head differs from supplied frozen head.'
);
assert.equal(
  exec('git', ['status', '--porcelain', '--untracked-files=no'], repo).trim(),
  '',
  'Freeze tracked source changes before preparing the consumer.'
);
const { getAllPackages, selectPackages } = await import(
  pathToFileURL(join(repo, 'scripts/release/lib.mjs')).href
);
const manifestPath = join(release, 'pack-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedNames = selectPackages(getAllPackages())
  .map(({ name }) => name)
  .sort();
assert.equal(
  manifest.packages.length,
  43,
  'This packet expects the supplied complete 43-package pack.'
);
assert.deepEqual(manifest.packages.map(({ name }) => name).sort(), expectedNames);
const packages = new Map();
for (const entry of manifest.packages) {
  const tarball = realpathSync(join(release, entry.tarball));
  const bytes = readFileSync(tarball);
  assert.equal(
    `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    entry.integrity,
    entry.name
  );
  const packedManifest = JSON.parse(exec('tar', ['-xOf', tarball, 'package/package.json'], out));
  assert.equal(packedManifest.name, entry.name);
  assert.equal(packedManifest.version, manifest.releaseVersion);
  packages.set(entry.name, { ...entry, tarball, manifest: packedManifest, sha256: hash(bytes) });
}
mkdirSync(out, { recursive: true });
const receipt = {
  suppliedSourceHead: values.head,
  observedRepoHead: values.head,
  producerBinding:
    'The caller supplies the frozen source head. The release pack manifest has no source-head field; retain the parent pack command/head log alongside this receipt.',
  packManifestSha256: hash(readFileSync(manifestPath)),
  releaseVersion: manifest.releaseVersion,
  packed: [...packages.values()].map(({ name, version, tarball, integrity, sha256 }) => ({
    name,
    version,
    tarball,
    integrity,
    sha256,
  })),
  tools: { node: process.version, npm: exec('npm', ['--version'], repo).trim() },
  consumers: {},
};
writeJson(join(out, 'preparation-receipt.json'), receipt);
const targets = [
  {
    id: 'web',
    runtimes: ['react', 'vue', 'wc'],
    adapters: ['react', 'vue', 'web-component'],
    dependencies: {
      react: '19.2.6',
      'react-dom': '19.2.6',
      '@types/react': '19.2.14',
      vue: '3.5.29',
      tsx: '4.21.0',
      typescript: '5.9.3',
    },
    entry: 'radio-browser.ts',
  },
  {
    id: 'vue2',
    runtimes: ['vue2'],
    adapters: ['vue2'],
    dependencies: { vue: '2.6.14', tsx: '4.21.0', typescript: '5.9.3' },
    entry: 'radio-vue2-browser.ts',
  },
];
for (const target of targets) {
  const consumer = join(out, `${target.id}-consumer`);
  const roots = [
    '@proto.ui/cli',
    '@proto.ui/prototypes-base',
    '@proto.ui/prototypes-shadcn',
    ...target.adapters.map((name) => `@proto.ui/adapter-${name}`),
  ];
  const closure = new Set();
  const pending = [...roots];
  while (pending.length) {
    const name = pending.pop();
    if (closure.has(name)) continue;
    const entry = packages.get(name);
    assert(entry, `Missing packed dependency ${name}`);
    closure.add(name);
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const dependency of Object.keys(entry.manifest[field] ?? {})) {
        if (dependency.startsWith('@proto.ui/')) pending.push(dependency);
      }
    }
  }
  const names = [...closure].sort();
  mkdirSync(consumer, { recursive: true });
  writeJson(join(consumer, 'package.json'), {
    name: `proto-ui-packed-radio-${target.id}`,
    private: true,
    version: '0.0.0',
    type: 'module',
    dependencies: {
      ...Object.fromEntries(
        names.map((name) => [
          name,
          `file:${relative(consumer, packages.get(name).tarball).replaceAll('\\', '/')}`,
        ])
      ),
      ...target.dependencies,
    },
  });
  run('npm', ['install', '--no-audit', '--no-fund'], consumer);
  auditInstalled(consumer, names, target);
  const cli = join(consumer, 'node_modules/@proto.ui/cli/bin/proto-ui.js');
  run(process.execPath, [cli, 'init', '--yes', '--no-interactive'], consumer);
  for (const runtime of target.runtimes) {
    run(
      process.execPath,
      [cli, 'add', runtime, 'shadcn-radio-group', '--no-install', '--no-interactive'],
      consumer
    );
    const facade = readFileSync(join(consumer, `proto-ui/components/${runtime}/index.ts`), 'utf8');
    for (const part of ['Root', 'Item', 'Indicator'])
      assert(facade.includes(`ShadcnRadioGroup${part}`), `${runtime}/${part} facade missing`);
  }
  assert(
    readFileSync(join(consumer, 'proto-ui/config.json'), 'utf8').includes('shadcn-radio-group')
  );
  const generatedFiles = {
    ...hashTree(consumer, join(consumer, 'proto-ui')),
    ...hashTree(consumer, join(consumer, 'src/styles')),
  };
  copyFileSync(join(here, target.entry), join(consumer, 'radio-browser.ts'));
  for (const file of ['radio-shared.ts', 'index.html'])
    copyFileSync(join(here, file), join(consumer, file));
  const installed = auditInstalled(consumer, names, target);
  receipt.consumers[target.id] = {
    path: consumer,
    runtimes: target.runtimes,
    installedProtoUi: installed,
    protoUiRegistryResolutions: 0,
    generatedFiles,
    packageLockSha256: hash(readFileSync(join(consumer, 'package-lock.json'))),
    frameworks: Object.fromEntries(
      Object.keys(target.dependencies).map((name) => [
        name,
        JSON.parse(readFileSync(join(consumer, 'node_modules', name, 'package.json'), 'utf8'))
          .version,
      ])
    ),
  };
  writeJson(join(out, 'preparation-receipt.json'), receipt);
}
console.log(`Prepared isolated consumers at ${out}; no consumer build or browser has run.`);

function auditInstalled(consumer, names, target) {
  const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'));
  const entries = Object.entries(lock.packages).filter(([key]) =>
    key.includes('node_modules/@proto.ui/')
  );
  assert.deepEqual(
    entries.map(([key]) => key.replace(/^node_modules\//, '')).sort(),
    names,
    'Nested or undeclared Proto UI resolution detected.'
  );
  assert.equal(
    JSON.parse(readFileSync(join(consumer, 'node_modules/vue/package.json'), 'utf8')).version,
    target.dependencies.vue
  );
  return entries.map(([key, entry]) => {
    const name = key.replace(/^node_modules\//, '');
    const expected = packages.get(name);
    assert.equal(entry.version, manifest.releaseVersion, name);
    assert(entry.resolved?.startsWith('file:'), `${name} escaped local tarballs`);
    assert.equal(realpathSync(resolve(consumer, entry.resolved.slice(5))), expected.tarball);
    assert.equal(entry.integrity, expected.integrity, name);
    const installedPath = join(consumer, key);
    assert(!lstatSync(installedPath).isSymbolicLink(), `${name} is a source link`);
    assert(realpathSync(installedPath).startsWith(`${realpathSync(consumer)}/node_modules/`));
    const actual = JSON.parse(readFileSync(join(installedPath, 'package.json'), 'utf8'));
    for (const field of [
      'name',
      'version',
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
    ])
      assert.deepEqual(actual[field], expected.manifest[field], `${name}/${field}`);
    return {
      name,
      version: entry.version,
      resolved: entry.resolved,
      integrity: entry.integrity,
      path: realpathSync(installedPath),
    };
  });
}
function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function hashTree(root, directory) {
  return Object.fromEntries(
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const file = join(directory, entry.name);
      return entry.isDirectory()
        ? Object.entries(hashTree(root, file))
        : [[relative(root, file), hash(readFileSync(file))]];
    })
  );
}
function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function exec(command, args, cwd) {
  const result = spawnSync(command, args, { cwd: existsSync(cwd) ? cwd : repo, encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function run(command, args, cwd) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const log = join(out, 'commands.jsonl');
  const previous = existsSync(log) ? readFileSync(log, 'utf8') : '';
  writeFileSync(
    log,
    `${previous}${JSON.stringify({ command, args, cwd, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status })}\n`
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} exited ${result.status}`);
}
