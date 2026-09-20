// Production-only consumer evidence. The repository supplies tools, never product modules.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    prepared: { type: 'string' },
    out: { type: 'string' },
  },
});
assert(
  values.repo && values.prepared && values.out,
  'Usage: tsx capture-consumer.mts --repo <tool-checkout> --prepared <prepared-run-dir> --out <new-results-dir>'
);
const repo = await realpath(resolve(values.repo));
const prepared = await realpath(resolve(values.prepared));
const out = resolve(values.out);
await mkdir(out, { recursive: false });
const receipt = JSON.parse(await readFile(join(prepared, 'preparation-receipt.json'), 'utf8'));
assert.equal(
  Object.keys(receipt.consumers).length,
  2,
  'Preparation did not complete both isolated consumers.'
);
const requireFromRepo = createRequire(join(repo, 'apps/workspace/package.json'));
const viteManifestPath = requireFromRepo.resolve('vite/package.json');
const viteManifest = JSON.parse(await readFile(viteManifestPath, 'utf8'));
assert.equal(
  viteManifest.version,
  '6.4.1',
  'Use the retained Vite version, not an upgraded bundler.'
);
const vite = await import(pathToFileURL(join(dirname(viteManifestPath), viteManifest.main)).href);
const harness = join(repo, 'apps/www/src/content/docs/zh-cn/browser-harness.ts');
const { launchBrowser } = await import(pathToFileURL(harness).href);
const results: Record<string, any> = {
  suppliedSourceHead: receipt.suppliedSourceHead,
  packManifestSha256: receipt.packManifestSha256,
  preparationReceiptSha256: hash(await readFile(join(prepared, 'preparation-receipt.json'))),
  tools: {
    node: process.version,
    vite: viteManifest.version,
    browserHarnessSha256: hash(await readFile(harness)),
  },
  scope:
    'Installed local tarballs and unchanged packed-CLI facades, production browser only; no source aliases. Historical HappyDOM failures are neither executed nor reclassified.',
  builds: {},
  cases: {},
};
const failures: string[] = [];
let browser: any;
let server: any;
try {
  browser = await launchBrowser();
  results.browser = browser.version();
  for (const [consumerId, consumerReceipt] of Object.entries<any>(receipt.consumers)) {
    const consumer = await realpath(consumerReceipt.path);
    await verifyGenerated(consumer, consumerReceipt);
    const moduleFiles: Array<{ path: string; sha256: string }> = [];
    const virtualModules: string[] = [];
    const packageModules: string[] = [];
    const chunks: unknown[] = [];
    const proof = {
      name: 'record-installed-consumer-modules',
      async generateBundle(_options: unknown, bundle: Record<string, any>) {
        for (const id of this.getModuleIds()) {
          if (id.startsWith('\0')) {
            virtualModules.push(id);
            continue;
          }
          const file = id.split('?')[0];
          assert(file.startsWith(`${consumer}${sep}`), `Bundle module escaped consumer: ${id}`);
          const physical = await realpath(file);
          assert(
            physical.startsWith(`${consumer}${sep}`),
            `Bundle module followed an external source link: ${id}`
          );
          moduleFiles.push({ path: physical, sha256: hash(await readFile(physical)) });
          if (physical.includes('/node_modules/@proto.ui/')) {
            assert(
              physical.includes('/dist/'),
              `Proto UI product module is not a packed dist entry: ${physical}`
            );
            packageModules.push(physical);
          }
        }
        assert(packageModules.some((file) => file.includes('/@proto.ui/prototypes-shadcn/')));
        assert(packageModules.some((file) => file.includes('/@proto.ui/prototypes-base/')));
        for (const output of Object.values<any>(bundle)) {
          if (output.type !== 'chunk') continue;
          for (const dependency of [...output.imports, ...output.dynamicImports]) {
            assert(bundle[dependency], `Unbundled runtime import: ${dependency}`);
          }
          chunks.push({
            fileName: output.fileName,
            imports: output.imports,
            dynamicImports: output.dynamicImports,
            sha256: hash(output.code),
          });
        }
      },
    };
    await vite.build({
      root: consumer,
      configFile: false,
      resolve: { alias: [] },
      plugins: [proof],
      build: { outDir: 'dist-radio-browser', emptyOutDir: true, target: 'es2022' },
    });
    await verifyGenerated(consumer, consumerReceipt);
    results.builds[consumerId] = {
      consumer,
      resolveAliases: [],
      moduleFiles,
      virtualModules,
      packageModules,
      chunks,
      generatedFilesUnchanged: true,
    };
    await save();
    const preview = await vite.preview({
      root: consumer,
      configFile: false,
      build: { outDir: 'dist-radio-browser' },
      preview: { host: '127.0.0.1', port: 0, strictPort: true },
    });
    server = preview.httpServer;
    const address = server.address();
    assert(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    for (const runtime of consumerReceipt.runtimes) {
      for (const mode of ['uncontrolled', 'controlled']) {
        const key = `${runtime}-${mode}`;
        const page = await browser.newPage({
          viewport: { width: 720, height: 640 },
          colorScheme: 'light',
        });
        const entry: Record<string, any> = {
          consumerId,
          runtime,
          mode,
          errors: [],
          externalRequests: [],
        };
        const read = () => page.evaluate(() => (window as any).packedRadio.read());
        const capture = (name: string) =>
          page.locator('main').screenshot({ path: join(out, `${key}-${name}.png`) });
        const waitChecked = (index: number) =>
          page.waitForFunction(
            (at: number) => (window as any).packedRadio.read().checked[at] === 'true',
            index
          );
        try {
          page.on('pageerror', (error: Error) => entry.errors.push(error.message));
          page.on('request', (request: any) => {
            if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
              entry.externalRequests.push(request.url());
          });
          await page.goto(`${origin}/?runtime=${runtime}&mode=${mode}`);
          await page.waitForFunction(
            () =>
              (window as any).packedRadio?.read().count === 3 &&
              (window as any).packedRadio.read().value === 'b',
            undefined,
            { timeout: 15_000 }
          );
          await waitChecked(1);
          entry.initial = await read();
          await page.locator('#before').click();
          await page.keyboard.press('Tab');
          await page
            .locator('[role="radio"]')
            .nth(1)
            .evaluate(async (element: HTMLElement) => {
              await Promise.all(element.getAnimations().map((animation) => animation.finished));
            });
          entry.tab = await read();
          await capture('tab');
          assert.deepEqual(entry.initial.tabIndex, [-1, 0, -1]);
          assert.deepEqual(entry.tab.focused, [false, true, false]);
          assert.deepEqual(entry.tab.changes, []);
          assert.deepEqual(entry.tab.checked, ['false', 'true', 'false']);
          checkPresentation(entry.tab);
          assert(
            entry.tab.shadows[1].includes('3px'),
            'Native keyboard entry has no expected Shadcn focus ring.'
          );

          await page.locator('#after').click();
          await page.keyboard.press('Shift+Tab');
          entry.reverseTab = await read();
          assert.deepEqual(entry.reverseTab.focused, [false, true, false]);
          assert.deepEqual(entry.reverseTab.changes, []);
          if (mode === 'controlled') {
            await page.locator('[role="radio"]').nth(0).click();
            await page.waitForFunction(
              () => (window as any).packedRadio.read().changes.length === 1
            );
            entry.requested = await read();
            assert.deepEqual(entry.requested.checked, ['false', 'true', 'false']);
            assert.deepEqual(entry.requested.changes, ['a']);
            assert.deepEqual(entry.requested.focused, [true, false, false]);
            await page.evaluate(() => (window as any).packedRadio.setValue('a'));
            await waitChecked(0);
            await settleFrame(page);
            entry.accepted = await read();
            assert.deepEqual(entry.accepted.dotOpacity, ['1', '0']);
            await page.evaluate(() => (window as any).packedRadio.setValue('b'));
            await waitChecked(1);
          } else {
            await page.keyboard.press('ArrowLeft');
            await waitChecked(0);
          }
          await settleFrame(page);
          entry.updated = await read();
          const expectedChecked =
            mode === 'controlled' ? ['false', 'true', 'false'] : ['true', 'false', 'false'];
          assert.deepEqual(entry.updated.checked, expectedChecked);
          assert.deepEqual(entry.updated.changes, ['a']);
          assert.deepEqual(entry.updated.focused, [true, false, false]);
          assert.deepEqual(entry.updated.tabIndex, [0, -1, -1]);
          checkPresentation(entry.updated);
          await capture('updated');

          await page.evaluate(() => (window as any).packedRadio.setTheme('dark'));
          await page.waitForFunction(
            (previous: string) => (window as any).packedRadio.read().backgrounds[0] !== previous,
            entry.updated.backgrounds[0]
          );
          await settleFrame(page);
          entry.dark = await read();
          assert.deepEqual(entry.dark.checked, expectedChecked);
          assert.deepEqual(entry.dark.changes, ['a']);
          checkPresentation(entry.dark);
          await capture('dark');
          await page.setViewportSize({ width: 320, height: 640 });
          await page.locator('main').scrollIntoViewIfNeeded();
          entry.narrow = await read();
          checkPresentation(entry.narrow);
          assert.equal(entry.narrow.overflow, false);
          assert.deepEqual(entry.narrow.checked, expectedChecked);
          assert.deepEqual(entry.narrow.changes, ['a']);
          await capture('narrow');
          assert.deepEqual(entry.errors, []);
          assert.deepEqual(entry.externalRequests, []);
          entry.status = 'passed';
        } catch (error) {
          entry.status = 'failed';
          entry.failure = String(error);
          failures.push(key);
          try {
            entry.atFailure = await read();
            await capture('failure');
          } catch (captureError) {
            entry.captureFailure = String(captureError);
          }
        } finally {
          results.cases[key] = entry;
          await writeFile(join(out, `${key}.json`), `${JSON.stringify(entry, null, 2)}\n`);
          await page.close();
          await save();
        }
      }
    }
    await verifyGenerated(consumer, consumerReceipt);
    await new Promise<void>((done) => server.close(done));
    server = null;
  }
  assert.equal(Object.keys(results.cases).length, 8);
  assert.deepEqual(failures, [], `Failed consumer cases: ${failures.join(', ')}`);
  results.status = 'passed';
  await save();
} catch (error) {
  results.status = 'failed';
  results.failure = String(error);
  await save();
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    if (server?.listening) await new Promise<void>((done) => server.close(done));
  }
}

function checkPresentation(state: any) {
  assert.equal(state.groupLabel, 'Packed Radio Group');
  assert.deepEqual(state.svgCounts, [1, 1, 0]);
  assert.deepEqual(state.disabled, ['false', 'false', 'true']);
  assert.deepEqual(
    state.dotOpacity,
    state.checked.slice(0, 2).map((value: string) => (value === 'true' ? '1' : '0'))
  );
  assert.equal(state.gap, '12px');
  for (const item of state.itemBoxes)
    for (const key of ['width', 'height'])
      assert(Math.abs(item[key] - 16) <= 0.1, `Item ${key}: ${item[key]}`);
  for (const glyph of state.glyphBoxes)
    for (const key of ['width', 'height'])
      assert(Math.abs(glyph[key] - 8) <= 0.1, `Glyph ${key}: ${glyph[key]}`);
}
async function verifyGenerated(consumer: string, value: any) {
  assert.equal(
    hash(await readFile(join(consumer, 'package-lock.json'))),
    value.packageLockSha256,
    'Consumer lock changed after preparation.'
  );
  for (const [file, digest] of Object.entries(value.generatedFiles))
    assert.equal(
      hash(await readFile(join(consumer, file))),
      digest,
      `Generated facade/style changed: ${file}`
    );
}
async function settleFrame(page: any) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  );
}
function hash(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}
async function save() {
  await writeFile(join(out, 'consumer-results.json'), `${JSON.stringify(results, null, 2)}\n`);
}
