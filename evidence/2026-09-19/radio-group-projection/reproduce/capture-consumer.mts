// Portable version of the retained local tarball browser experiment.
// Run through the candidate checkout's existing tsx; no source aliases are added.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    consumer: { type: 'string' },
    out: { type: 'string' },
    mode: { type: 'string', default: 'production' },
    cache: { type: 'string' },
  },
});
assert(
  values.repo && values.consumer && values.out,
  'Usage: tsx capture-consumer.mts --repo <candidate-checkout> --consumer <installed-dir> --out <results> [--mode production|dev] [--cache <dev-cache>]'
);
assert(['production', 'dev'].includes(values.mode!));
// macOS /var and /private/var may name the same directory. Keep Vite's root
// and filesystem allow-list on the same physical path; this is not an optimizer fix.
const repo = await realpath(resolve(values.repo));
const consumer = await realpath(resolve(values.consumer));
await mkdir(resolve(values.out), { recursive: true });
const out = await realpath(resolve(values.out));
const requireFromRepo = createRequire(join(repo, 'apps/workspace/package.json'));
const viteManifestPath = requireFromRepo.resolve('vite/package.json');
const viteManifest = JSON.parse(await readFile(viteManifestPath, 'utf8'));
const vite = await import(pathToFileURL(join(dirname(viteManifestPath), viteManifest.main)).href);
const { launchBrowser } = await import(
  pathToFileURL(join(repo, 'apps/www/src/content/docs/zh-cn/browser-harness.ts')).href
);
let server: any;
let devServer: any;
let browser: any;
let errors: string[] = [];
const observations: Record<string, unknown> = {};
try {
  if (values.mode === 'production') {
    await vite.build({
      root: consumer,
      configFile: false,
      build: { outDir: 'dist-radio-browser', emptyOutDir: true, target: 'es2022' },
    });
    const preview = await vite.preview({
      root: consumer,
      configFile: false,
      build: { outDir: 'dist-radio-browser' },
      preview: { host: '127.0.0.1', port: 0, strictPort: true },
    });
    server = preview.httpServer;
  } else {
    // Preserve the original dev experiment, including disabled HMR and discovery.
    // No optimizeDeps warm-up, dedupe or automatic retry is introduced here.
    const cachePath = values.cache ? resolve(values.cache) : join(consumer, '.radio-vite-cache');
    await mkdir(cachePath, { recursive: true });
    const cacheDir = await realpath(cachePath);
    devServer = await vite.createServer({
      root: consumer,
      configFile: false,
      cacheDir,
      server: { middlewareMode: true, hmr: false, fs: { allow: [consumer, out, cacheDir] } },
    });
    server = createHttpServer(devServer.middlewares);
    await new Promise<void>((accept, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', accept);
    });
  }
  const address = server.address();
  assert(address && typeof address !== 'string', 'No listening address');
  browser = await launchBrowser();
  for (const runtime of ['wc', 'react', 'vue']) {
    errors = [];
    const result: Record<string, any> = {};
    const page = await browser.newPage({
      viewport: { width: 640, height: 420 },
      colorScheme: 'light',
    });
    try {
      page.on('pageerror', (error: Error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${address.port}/?runtime=${runtime}`);
      await page.waitForFunction(() => (window as any).readPackedRadio?.().count === 3, undefined, {
        timeout: 15_000,
      });
      await page.evaluate(
        () =>
          new Promise<void>((done) =>
            requestAnimationFrame(() => requestAnimationFrame(() => done()))
          )
      );
      result.initial = await page.evaluate(() => (window as any).readPackedRadio());
      await page.locator('main').screenshot({ path: join(out, `${runtime}-initial.png`) });
      await page.evaluate(() => (window as any).updatePackedRadio());
      await page.waitForFunction(() => (window as any).readPackedRadio().checked[0] === 'true');
      result.updated = await page.evaluate(() => (window as any).readPackedRadio());
      await page.locator('main').screenshot({ path: join(out, `${runtime}-updated.png`) });
      assert.deepEqual(result.initial.checked, ['false', 'true', 'false']);
      assert.deepEqual(result.updated.checked, ['true', 'false', 'false']);
      assert.deepEqual(result.initial.svgCounts, [1, 1, 0]);
      assert.deepEqual(result.updated.svgCounts, [1, 1, 0]);
      assert.deepEqual(result.initial.dotOpacity, ['0', '1']);
      assert.deepEqual(result.updated.dotOpacity, ['1', '0']);
      assert.equal(result.initial.groupLabel, 'Packed Radio Group');
      assert.equal(result.initial.runtime, runtime);
      assert.deepEqual(errors, []);
      result.errors = errors;
      observations[runtime] = result;
    } finally {
      await page.close();
    }
  }
  observations.browser = browser.version();
  observations.mode = values.mode;
  observations.scope =
    'Installed tarballs and unedited CLI facades: mount, controlled updates, explicit Indicator and generated-CSS opacity only. Initial entry and full interaction acceptance remain separate.';
  await writeFile(join(out, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
} catch (error) {
  await writeFile(
    join(out, 'failure.json'),
    JSON.stringify({ observations, errors, failure: String(error) }, null, 2) + '\n'
  );
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      await devServer?.close();
    } finally {
      if (server?.listening) await new Promise<void>((done) => server.close(done));
    }
  }
}
