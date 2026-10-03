import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../apps/www/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const evidence = process.env.OPTICAL_EVIDENCE_DIR;
assert(evidence);
await mkdir(evidence, { recursive: true });
const files = new Map(
  await Promise.all(
    ['liquid-demo.html', 'heightfield.mjs'].map(async (name) => [
      name,
      await readFile(new URL(name, import.meta.url), 'utf8'),
    ])
  )
);
const server = createServer((request, response) => {
  const name = request.url === '/' ? 'liquid-demo.html' : request.url.slice(1);
  if (!files.has(name)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    'content-type': name.endsWith('.mjs') ? 'text/javascript' : 'text/html',
  });
  response.end(files.get(name));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser, context, page;
const report = {
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  node: process.version,
  scope:
    'Independent experimental shape-normal/DOM-backdrop model; not Apple native, Prototype admission, or native/Compiler parity',
  browser: null,
  status: 'not-run',
  frames: [],
  errors: [],
};
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  report.browser = browser.version();
  context = await browser.newContext({
    viewport: { width: 780, height: 650 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(evidence, 'video'), size: { width: 780, height: 650 } },
  });
  page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const frame = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
  async function capture(name) {
    await frame();
    const pixels = await page.locator('#lens').screenshot();
    await page.screenshot({ path: path.join(evidence, `${name}.png`) });
    report.frames.push({
      name,
      state: await page.evaluate(() => ({
        ...window.liquidExperiment.state,
        frame: window.liquidExperiment.frame,
      })),
    });
    return pixels.toString('base64');
  }
  async function changedPixels(a, b) {
    return page.evaluate(
      async ({ a, b }) => {
        async function read(base64) {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        const aa = await read(a),
          bb = await read(b);
        let count = 0;
        for (let i = 0; i < aa.data.length; i += 4)
          if (
            Math.abs(aa.data[i] - bb.data[i]) +
              Math.abs(aa.data[i + 1] - bb.data[i + 1]) +
              Math.abs(aa.data[i + 2] - bb.data[i + 2]) >
            8
          )
            count++;
        return count;
      },
      { a, b }
    );
  }
  const rest = await capture('liquid-rest');
  await page.evaluate(() =>
    document.querySelector('#lens-displacement').setAttribute('scale', '0')
  );
  const noRefraction = await capture('negative-no-refraction');
  report.refractionChangedPixels = await changedPixels(rest, noRefraction);
  assert(
    report.refractionChangedPixels > 300,
    'shape-normal refraction must visibly differ from the same geometry with zero displacement'
  );
  await page.evaluate(() =>
    document.querySelector('#lens-displacement').setAttribute('scale', '40')
  );
  await page.getByRole('button', { name: 'Move light', exact: true }).click();
  const otherLight = await capture('light-direction-changed');
  report.lightChangedPixels = await changedPixels(rest, otherLight);
  assert(report.lightChangedPixels > 100, 'highlight must react to the light direction');
  await page.getByRole('button', { name: 'Move light', exact: true }).click();
  const start = await page.evaluate(() => window.liquidExperiment.frame);
  await page.getByRole('button', { name: 'Press & release', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.press > 0.8);
  await capture('pressed-shape');
  await page.waitForFunction(
    (start) =>
      window.liquidExperiment.state.press === 0 && window.liquidExperiment.frame > start + 8,
    start
  );
  await capture('released-shape');
  await page.getByRole('button', { name: 'Join / separate', exact: true }).click();
  for (const progress of [0.15, 0.35, 0.55, 0.75, 0.95]) {
    await page.waitForFunction((p) => window.liquidExperiment.state.merge >= p, progress);
    await capture(`fusion-${progress}`);
  }
  await page.waitForFunction(() => document.body.dataset.animating === 'false');
  await capture('joined-shape');
  await page.getByRole('button', { name: 'Join / separate', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.merge === 0);
  await capture('separated-shape');
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  for (const progress of [0.15, 0.35, 0.55, 0.75, 0.95]) {
    await page.waitForFunction((p) => window.liquidExperiment.state.morph >= p, progress);
    await capture(`menu-${progress}`);
  }
  await page.waitForFunction(() => document.body.dataset.animating === 'false');
  await capture('expanded-menu');
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.morph === 0);
  await capture('collapsed-menu');
  await page.getByRole('button', { name: 'Move real background', exact: true }).click();
  await capture('live-background-update');
  assert.deepEqual(report.errors, []);
  report.samples = await page.evaluate(() => window.liquidExperiment.samples);
  assert(report.samples.length >= 30);
  report.status = 'experimental-scene-observed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(path.join(evidence, 'liquid-observations.json'), JSON.stringify(report, null, 2));
  const video = page?.video();
  await context?.close();
  if (video) await copyFile(await video.path(), path.join(evidence, 'experimental-liquid.webm'));
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
