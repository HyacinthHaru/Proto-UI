import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/www/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const root = resolve(process.argv[2] || '/tmp/pui-material-browser');
const evidence = resolve(process.argv[3] || '/tmp/pui-material-evidence');
await mkdir(evidence, { recursive: true });
const server = createServer(async (req, res) => {
  const name =
    new URL(req.url, 'http://localhost').pathname === '/'
      ? 'index.html'
      : basename(new URL(req.url, 'http://localhost').pathname);
  if (!['index.html', 'tokens.css', 'app.js'].includes(name)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(resolve(root, name));
    res.setHeader(
      'Content-Type',
      { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[extname(name)]
    );
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page;
const observations = [];
const errors = [];
let externalRequests = 0;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: ['--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 900, height: 720 },
    deviceScaleFactor: 1,
  });
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      externalRequests++;
      return route.abort();
    }
    return route.continue();
  });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(origin);
  await page.waitForFunction(() => window.ready === true);
  const state = () => page.evaluate(() => window.probe.state());
  const capture = async (name) => {
    observations.push({ name, ...(await state()) });
    await page.screenshot({ path: resolve(evidence, `${name}.png`) });
  };
  await page.waitForFunction(
    () => window.probe.state().quality === 'experimental-owned-texture',
    null,
    { timeout: 10000 }
  );
  assert.equal((await state()).phase, 'rest');
  const initialPixels = await page.evaluate(() => window.probe.pixels());
  assert(initialPixels?.startsWith('data:image/png'));
  await capture('01-rest');
  const bounds = await page.locator('#glass').boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  assert.equal((await state()).pressed, true);
  assert.equal((await state()).phase, 'pressed');
  const pressedPixels = await page.evaluate(() => window.probe.pixels());
  assert.notEqual(
    pressedPixels,
    initialPixels,
    'actual shader output must change with Base pressed state'
  );
  await capture('02-pointer-pressed');
  await page.mouse.up();
  assert.equal((await state()).pressed, false);
  assert.equal((await state()).clicks, 1);
  await page.mouse.move(10, 10);
  await page.locator('#glass').focus();
  await page.keyboard.press('Space');
  assert.equal((await state()).clicks, 2);
  assert.equal((await state()).focused, true);
  await capture('03-keyboard-activation');
  await page.evaluate(() => window.probe.disabled(true));
  await page.locator('#glass').click({ force: true });
  assert.equal((await state()).disabled, true);
  assert.equal((await state()).clicks, 2);
  await capture('04-disabled');
  await page.evaluate(() => window.probe.disabled(false));
  await page.evaluate(() => window.probe.safe(false));
  assert.equal((await state()).quality, 'opaque-fallback');
  assert.equal((await state()).reason, 'unsafe-or-unknown-preference');
  await capture('05-preference-fallback');
  await page.evaluate(() => window.probe.safe(true));
  assert.equal((await state()).quality, 'experimental-owned-texture');
  await page.evaluate(() => window.probe.source(false));
  assert.equal((await state()).quality, 'opaque-fallback');
  await capture('06-source-loss');
  await page.evaluate(() => window.probe.source(true));
  assert.equal((await state()).quality, 'experimental-owned-texture');
  await page.evaluate(() => {
    const canvas = document.querySelector('#glass canvas');
    const gl = canvas.getContext('webgl');
    window.loss = gl.getExtension('WEBGL_lose_context');
    window.loss.loseContext();
  });
  await page.waitForFunction(() => window.probe.state().reason === 'context-lost');
  await capture('07-context-loss');
  await page.evaluate(() => window.loss.restoreContext());
  await page.waitForFunction(() => window.probe.state().quality === 'experimental-owned-texture');
  await page.evaluate(() => window.probe.remove());
  await page.waitForTimeout(30);
  // Destroyed owner must unsubscribe from all source and preference callbacks.
  await page.evaluate(() => window.probe.remount());
  await page.waitForFunction(() => window.probe.state().quality === 'experimental-owned-texture');
  assert.equal((await state()).sourceListeners, 1);
  assert.equal((await state()).preferenceListeners, 1);
  await capture('08-remounted');
  assert.deepEqual(errors, []);
  assert.equal(externalRequests, 0);
  await writeFile(
    resolve(evidence, 'result.json'),
    JSON.stringify(
      {
        status: 'passed',
        source: JSON.parse(await readFile(resolve(root, 'source.json'), 'utf8')),
        externalRequests,
        errors,
        observations,
      },
      null,
      2
    )
  );
} catch (error) {
  if (page) {
    try {
      await page.screenshot({ path: resolve(evidence, 'failure.png') });
      observations.push({ name: 'failure', ...(await page.evaluate(() => window.probe?.state())) });
    } catch {}
  }
  await writeFile(
    resolve(evidence, 'result.json'),
    JSON.stringify(
      { status: 'failed', error: String(error), externalRequests, errors, observations },
      null,
      2
    )
  );
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
