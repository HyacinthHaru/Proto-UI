// Same packed consumer, genuine preinstalled Chromium. No browser download fallback.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [consumerArg, rootArg] = process.argv.slice(2);
assert(consumerArg && rootArg, 'expected the existing consumer and repository directories');
const consumer = realpathSync(consumerArg);
const root = realpathSync(rootArg);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digestFile = (path) => digest(readFileSync(path));
const inside = (directory, path) => {
  const name = relative(directory, path);
  return name !== '..' && !name.startsWith('../') && !isAbsolute(name);
};
const repoRequire = createRequire(join(root, 'package.json'));
const wwwRequire = createRequire(join(root, 'apps', 'www', 'package.json'));
const esbuild = repoRequire('esbuild');
const { chromium } = wwwRequire('playwright-core');
const esbuildPackage = repoRequire('esbuild/package.json');
const playwrightPackage = wwwRequire('playwright-core/package.json');
assert.equal(esbuildPackage.version, '0.25.12', 'review tooling version changes separately');
assert.equal(playwrightPackage.version, '1.58.2', 'review tooling version changes separately');
const lock = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');
const tooling = [
  ['esbuild', esbuildPackage.version, 'sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg=='],
  ['playwright-core', playwrightPackage.version, 'sha512-yZkEtftgwS8CsfYo7nm0KE8jsvm6i/PTgVtB8DL726wNf6H2IMsDuxCpJj59KDaxCtSnrWan2AeDqM7JBaultg=='],
].map(([name, version, integrity]) => {
  assert(lock.includes(`${name}@${version}:`) && lock.includes(integrity), 'locked tool provenance drift');
  return { name, version, lockIntegrity: integrity };
});
// Only the runner's existing standard executable locations; never install or
// execute an arbitrary environment-provided path or a downloaded browser cache.
const chromePaths = [
  ['/usr/bin/google-chrome', '/opt/google/chrome/chrome'],
  ['/usr/bin/chromium', '/usr/lib/chromium/chromium'],
  ['/usr/bin/chromium-browser', '/usr/lib/chromium-browser/chromium-browser'],
].find((paths) => paths.every((path) => existsSync(path)));
assert(chromePaths, 'preinstalled runner Chrome/Chromium missing; no download fallback');
const [chrome, chromeBinary] = chromePaths;
const chromeVersion = spawnSync(chrome, ['--version'], { encoding: 'utf8', timeout: 10000 });
assert(!chromeVersion.error && chromeVersion.status === 0, 'cannot identify preinstalled Chrome');
const binding = JSON.parse(readFileSync(join(consumer, 'checkbox-delivery-evidence.json'), 'utf8'));
assert.equal(binding.lockSha256, digestFile(join(consumer, 'package-lock.json')));
assert.equal(binding.generatedFacadeSha256, digestFile(join(consumer, 'proto-ui/components/wc/index.ts')));

// This entry resolves all business imports inside the already installed consumer.
const entry = `
import * as facade from './proto-ui/components/wc/index.ts';
import { createShadcnCheckboxLabelComposition } from '@proto.ui/prototypes-shadcn/checkbox';
import { setElementAssociations, setElementProps } from '@proto.ui/adapter-web-component';
const order = [];
customElements.define('pui-native-order-parent', class extends HTMLElement {
  connectedCallback() { order.push('parent'); }
});
customElements.define('pui-native-order-child', class extends HTMLElement {
  connectedCallback() { order.push('child'); }
});
const parent = document.createElement('pui-native-order-parent');
parent.append(document.createElement('pui-native-order-child'));
document.body.append(parent);
parent.remove();
const pairs = [];
for (const kind of ['default', 'explicit']) {
  const pair = createShadcnCheckboxLabelComposition();
  const control = new facade.ShadcnCheckboxElement();
  const label = new facade.ShadcnLabelRootElement();
  if (kind === 'explicit') control.append(new facade.ShadcnCheckboxIndicatorElement());
  const strong = document.createElement('strong');
  strong.textContent = 'Receive ' + kind + ' updates';
  label.append(strong);
  setElementProps(control, {});
  setElementProps(label, pair.label.props);
  setElementAssociations(control, pair.control.instanceAssociations);
  setElementAssociations(label, pair.label.instanceAssociations);
  const container = document.createElement('div');
  container.dataset.case = kind;
  container.append(control, label);
  const record = { control, label, container, changes: 0 };
  control.addEventListener('checkedChange', () => record.changes++);
  // Keep the explicit child preassembled before the entire detached subtree connects.
  document.body.append(container);
  pairs.push(record);
}
window.packedCheckboxSmoke = { order, pairs };
`;
writeFileSync(join(consumer, 'checkbox-native-entry.mjs'), entry);
const bundled = await esbuild.build({
  absWorkingDir: consumer,
  entryPoints: ['checkbox-native-entry.mjs'],
  outfile: 'checkbox-native-bundle.js',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  write: false,
  metafile: true,
  logLevel: 'silent',
});
assert.equal(bundled.outputFiles.length, 1, 'unexpected additional bundle output');
const inputs = Object.entries(bundled.metafile.inputs).map(([name, metadata]) => {
  const path = realpathSync(resolve(consumer, name));
  assert(inside(consumer, path), `business source escaped packed consumer: ${name}`);
  assert(metadata.imports.every((item) => !item.external), 'unexpected external input import');
  return { path: relative(consumer, path).replaceAll('\\', '/'), sha256: digestFile(path) };
});
for (const output of Object.values(bundled.metafile.outputs)) {
  assert.equal(output.imports.length, 0, 'browser bundle must be self-contained');
}
const resources = new Map([
  ['/', { type: 'text/html', body: Buffer.from('<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><link rel="stylesheet" href="/src/styles/proto-ui-style.css"></head><body><script type="module" src="/checkbox-native-bundle.js"></script></body></html>') }],
  ['/checkbox-native-bundle.js', { type: 'text/javascript', body: Buffer.from(bundled.outputFiles[0].contents) }],
]);
for (const name of ['proto-ui-style.css', 'shadcn-theme.css', 'proto-ui-tokens.generated.css']) {
  const path = realpathSync(join(consumer, 'src', 'styles', name));
  assert(inside(consumer, path));
  resources.set(`/src/styles/${name}`, { type: 'text/css', body: readFileSync(path) });
}
const failures = [];
let browser, context, server;
let nativeEvidence;
console.log(JSON.stringify({
  kind: 'checkbox-label-packed-native-prepared',
  testedCommit: binding.testedCommit,
  packages: binding.packages,
  lockSha256: binding.lockSha256,
  generatedFacadeSha256: binding.generatedFacadeSha256,
  fixtureSha256: digestFile(fileURLToPath(import.meta.url)),
  repoLockSha256: digest(lock),
  tooling,
  browser: { command: chrome, executable: chromeBinary, launcherSha256: digestFile(realpathSync(chrome)), executableSha256: digestFile(chromeBinary), commandVersion: chromeVersion.stdout.trim() },
  runnerImage: { os: process.env.ImageOS ?? null, version: process.env.ImageVersion ?? null },
  inputs,
  resources: [...resources].map(([path, { body }]) => ({ path, sha256: digest(body) })),
  outcome: 'prepared-not-yet-executed',
}));
try {
  server = createServer((request, response) => {
    const resource = request.method === 'GET' ? resources.get(request.url) : undefined;
    if (!resource) {
      failures.push(new Error('unexpected loopback fixture resource request'));
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': resource.type,
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
      'Cache-Control': 'no-store',
    });
    response.end(resource.body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: chromeBinary,
    headless: true,
    chromiumSandbox: true,
    timeout: 20000,
    args: ['--disable-dev-shm-usage', '--disable-background-networking', '--no-proxy-server'],
  });
  context = await browser.newContext({ serviceWorkers: 'block' });
  context.setDefaultTimeout(10000);
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && resources.has(url.pathname) && !url.search && !url.hash && route.request().method() === 'GET') {
      await route.continue();
    } else {
      failures.push(new Error('blocked non-test browser request'));
      await route.abort();
    }
  });
  await context.routeWebSocket('**/*', (socket) => {
    failures.push(new Error('blocked unexpected WebSocket'));
    socket.close();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(new Error(`browser console: ${message.text()}`));
  });
  const response = await page.goto(origin, { waitUntil: 'load' });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => window.packedCheckboxSmoke?.pairs.length === 2);
  const initial = await page.evaluate(() => ({
    order: window.packedCheckboxSmoke.order,
    pairs: window.packedCheckboxSmoke.pairs.map(({ control, label }) => ({
      indicators: [...control.children].filter((child) => child.localName === 'proto-ui-shadcn-checkbox-indicator').length,
      labelledby: control.getAttribute('aria-labelledby'),
      labelId: label.id,
      state: control.getAttribute('aria-checked'),
      labelDisplay: getComputedStyle(label).display,
      controlShrink: getComputedStyle(control).flexShrink,
    })),
  }));
  assert.deepEqual(initial.order, ['parent', 'child']);
  for (const pair of initial.pairs) {
    assert.equal(pair.indicators, 1, 'default and explicit must each have exactly one Indicator');
    assert(pair.labelId);
    assert.equal(pair.labelledby, pair.labelId);
    assert.equal(pair.state, 'false');
    assert.equal(pair.labelDisplay, 'flex', 'original generated Label CSS must apply');
    assert.equal(pair.controlShrink, '0', 'original generated Checkbox CSS must apply');
  }
  assert.notEqual(initial.pairs[0].labelId, initial.pairs[1].labelId);
  for (const [index, kind] of ['default', 'explicit'].entries()) {
    await page.locator(`[data-case="${kind}"] strong`).click();
    await page.waitForFunction((index) => window.packedCheckboxSmoke.pairs[index].control.getAttribute('aria-checked') === 'true', index);
    let states = await page.evaluate(() => window.packedCheckboxSmoke.pairs.map(({ control, changes }) => ({ state: control.getAttribute('aria-checked'), changes, focused: document.activeElement === control })));
    assert.equal(states[index].changes, 1, 'real Label pointer must activate once');
    assert.equal(states[index].focused, true);
    assert.equal(states[1 - index].state, 'false', 'other composition remains isolated');
    await page.keyboard.press('Space');
    await page.waitForFunction((index) => window.packedCheckboxSmoke.pairs[index].control.getAttribute('aria-checked') === 'false', index);
    states = await page.evaluate(() => window.packedCheckboxSmoke.pairs.map(({ changes }) => changes));
    assert.equal(states[index], 2, 'focused control keyboard must activate once');
  }
  await page.evaluate(() => {
    for (const { container } of window.packedCheckboxSmoke.pairs) container.remove();
  });
  await page.waitForTimeout(50); // allow asynchronous disposal errors to surface
  assert.equal(await page.locator('[data-case]').count(), 0);
  if (failures.length) throw new AggregateError(failures.splice(0), 'native page/network errors');
  nativeEvidence = {
    kind: 'checkbox-label-packed-native-evidence',
    testedCommit: binding.testedCommit,
    releaseVersion: binding.releaseVersion,
    packages: binding.packages,
    lockSha256: binding.lockSha256,
    generatedFacadeSha256: binding.generatedFacadeSha256,
    fixtureSha256: digestFile(fileURLToPath(import.meta.url)),
    repoLockSha256: digest(lock),
    tooling,
    browser: { executable: chromeBinary, executableSha256: digestFile(chromeBinary), commandVersion: chromeVersion.stdout.trim(), version: browser.version() },
    runnerImage: { os: process.env.ImageOS ?? null, version: process.env.ImageVersion ?? null },
    inputs,
    resources: [...resources].map(([path, { body }]) => ({ path, sha256: digest(body) })),
    platformOrder: initial.order,
    outcome: 'bounded-default-preassembled-explicit-label-pointer-keyboard-removal-without-observed-pageerror-passed',
    syntheticAcceptance: 'separate-unmodified-fixture-still-required',
    registryPublication: 'not-performed',
  };
} catch (error) {
  failures.push(error);
} finally {
  for (const close of [() => context?.close(), () => browser?.close(), () => server && new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  })]) {
    try { await close(); } catch (error) { failures.push(error); }
  }
}
if (failures.length) throw new AggregateError(failures, 'packed native Checkbox+Label failed');

console.log(JSON.stringify(nativeEvidence));
