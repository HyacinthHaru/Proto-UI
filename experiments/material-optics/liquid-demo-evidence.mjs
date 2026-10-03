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
    viewport: { width: 780, height: 800 },
    deviceScaleFactor: 1,
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
  report.fieldGeometry = await page.evaluate(() => {
    const field = document.querySelector('#field');
    return {
      width: field.width.baseVal.value,
      height: field.height.baseVal.value,
      hrefBytes: field.getAttribute('href')?.length,
      filter: getComputedStyle(document.querySelector('#lens')).backdropFilter,
    };
  });
  assert.equal(report.fieldGeometry.width, 600);
  assert.equal(report.fieldGeometry.height, 264);
  const rest = await capture('liquid-rest');
  // Aesthetic gradients can be nearly constant under a narrow, monotonic rim.
  // Calibrate displacement on real high-contrast DOM content without changing
  // the field, alpha, scatter, geometry or threshold; restore it before visual review.
  await page.evaluate(() =>
    document.querySelector('#backdrop').setAttribute('data-calibration', '')
  );
  const calibration = await capture('calibration-refraction');
  await page.evaluate(() =>
    document.querySelector('#lens-displacement').setAttribute('scale', '0')
  );
  const noRefraction = await capture('negative-no-refraction');
  report.refractionChangedPixels = await changedPixels(calibration, noRefraction);
  assert(
    report.refractionChangedPixels > 300,
    'shape-normal refraction must visibly differ from the same geometry with zero displacement'
  );
  await page.evaluate(() =>
    document.querySelector('#lens-displacement').setAttribute('scale', '40')
  );
  await page.evaluate(() =>
    document.querySelector('#backdrop').removeAttribute('data-calibration')
  );
  await page.getByRole('button', { name: 'Move light', exact: true }).click();
  const otherLight = await capture('light-direction-changed');
  report.lightChangedPixels = await changedPixels(rest, otherLight);
  assert(report.lightChangedPixels > 100, 'highlight must react to the light direction');
  await page.getByRole('button', { name: 'Move light', exact: true }).click();
  const trigger = await page
    .getByRole('button', { name: 'Press the refractive surface', exact: true })
    .boundingBox();
  await page.mouse.move(trigger.x + trigger.width * 0.35, trigger.y + trigger.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.liquidExperiment.state.press === 1);
  await capture('pressed-shape');
  await page.mouse.up();
  await page.waitForFunction(() => window.liquidExperiment.state.press === 0);
  await capture('released-shape');
  await page.getByRole('button', { name: 'Fusion example', exact: true }).click();
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
  await page.getByRole('button', { name: 'Button/menu example', exact: true }).click();
  const menuIdentity = await page.locator('#lens').getAttribute('data-effect-id');
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  for (const progress of [0.15, 0.35, 0.55, 0.75, 0.95]) {
    await page.waitForFunction((p) => window.liquidExperiment.state.morph >= p, progress);
    await capture(`menu-${progress}`);
  }
  await page.waitForFunction(() => document.body.dataset.animating === 'false');
  await capture('expanded-menu');
  assert.equal(await page.locator('#lens').getAttribute('data-effect-id'), menuIdentity);
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.morph === 0);
  await capture('collapsed-menu');
  await page.getByRole('button', { name: 'Move real background', exact: true }).click();
  await capture('live-background-update');
  // Real early reverse and cancellation, from the current surface rather than recipe rest.
  await page.getByRole('button', { name: 'Button/menu example', exact: true }).click();
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.morph > 0.15);
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.morph === 0);
  await capture('early-reverse-settled');
  await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
  await page.waitForFunction(() => window.liquidExperiment.state.morph > 0.2);
  await page.getByRole('button', { name: 'Cancel motion', exact: true }).click();
  const frozen = await page.evaluate(() => ({
    morph: window.liquidExperiment.state.morph,
    frame: window.liquidExperiment.frame,
  }));
  await frame();
  assert.deepEqual(
    await page.evaluate(() => ({
      morph: window.liquidExperiment.state.morph,
      frame: window.liquidExperiment.frame,
    })),
    frozen
  );
  report.cancelledState = frozen;
  await capture('cancelled-current-surface');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await page.waitForFunction(() => document.body.dataset.reducedMotion === 'true');
  await page.getByRole('button', { name: 'Button/menu example', exact: true }).click();
  const beforeReduced = await page.evaluate(() => window.liquidExperiment.renderStates.length);
  await page.mouse.move(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);
  await page.mouse.down();
  await capture('reduced-motion-static-feedback');
  await page.mouse.up();
  await frame();
  const reduced = await page.evaluate(
    (start) => window.liquidExperiment.renderStates.slice(start),
    beforeReduced
  );
  assert(reduced.some((x) => x.state.energy === 1));
  assert(reduced.every((x) => x.state.press === 0));
  report.reducedMotion = reduced;
  assert.deepEqual(report.errors, []);
  report.samples = await page.evaluate(() => window.liquidExperiment.samples);
  assert(report.samples.length >= 30);
  report.status = 'experimental-scene-observed';
  // A separate fixed-viewport context records input only. No screenshot call
  // runs during this recording, avoiding locator-screenshot viewport artifacts.
  await context.close();
  context = await browser.newContext({
    viewport: { width: 780, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(evidence, 'clean-video'), size: { width: 780, height: 800 } },
  });
  page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const hold = () => page.waitForTimeout(350); // Presentation hold, not a correctness retry.
  await hold();
  const point = await page
    .getByRole('button', { name: 'Press the refractive surface', exact: true })
    .boundingBox();
  await page.mouse.move(point.x + point.width * 0.3, point.y + point.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.liquidExperiment.state.press === 1);
  await hold();
  await page.mouse.move(point.x + point.width * 0.7, point.y + point.height / 2, { steps: 8 });
  await hold();
  await page.mouse.up();
  await page.waitForFunction(() => window.liquidExperiment.state.press === 0);
  await hold();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Button / menu', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.animating === 'false');
    await hold();
  }
  await page.getByRole('button', { name: 'Fusion example', exact: true }).click();
  await hold();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Join / separate', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.animating === 'false');
    await hold();
  }
  await page.getByRole('button', { name: 'Move light', exact: true }).click();
  await hold();
  await page.getByRole('button', { name: 'Move real background', exact: true }).click();
  await hold();
  report.recording = {
    viewport: { width: 780, height: 800 },
    screenshotCalls: 0,
    samples: await page.evaluate(() => window.liquidExperiment.samples),
  };
  assert.deepEqual(report.errors, []);
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
